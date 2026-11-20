import { describeDeliveryTime } from '@/features/delivery/services/delivery-text';
import { formatDay } from '@/shared/i18n/format-date';
import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { TaskActivity, TaskAssignee } from '../interfaces/task.interface';
import type { TasksMessages } from '../i18n/tasks-messages.interface';

const isStatus = (value: unknown, text: TasksMessages): value is keyof TasksMessages['statuses'] =>
  typeof value === 'string' && value in text.statuses;

/** One readable line per audit entry. The log stores ids only; names are filled in from what this page already knows. */
export function describeActivity(
  entry: TaskActivity,
  assignees: readonly TaskAssignee[],
  text: TasksMessages,
  where: { timeZone: string; lang: Lang },
): string {
  const actor = entry.actor?.name ?? text.someone;
  const { metadata } = entry;
  switch (entry.action) {
    case 'task.created':
      return text.activity.created(actor);
    case 'task.assigned': {
      const assignee = assignees.find((person) => person.id === metadata.assigneeId);
      return text.activity.assigned(actor, assignee?.name ?? text.someone);
    }
    case 'assignment.status_changed':
      return isStatus(metadata.from, text) && isStatus(metadata.to, text)
        ? text.activity.statusChanged(actor, text.statuses[metadata.from], text.statuses[metadata.to])
        : text.activity.other(actor, entry.action);
    case 'comment.added':
      return text.activity.commented(actor);
    case 'task.held':
      return typeof metadata.deliverAt === 'string'
        ? text.activity.held(actor, describeDeliveryTime(metadata.deliverAt, where.timeZone, where.lang))
        : text.activity.other(actor, entry.action);
    case 'task.urgent_override':
      return text.activity.urgent(actor);
    case 'task.delivered':
      return text.activity.delivered;
    case 'task.deadline_flagged':
      return typeof metadata.shortOfTime === 'number'
        ? text.activity.flagged(actor, metadata.shortOfTime)
        : text.activity.other(actor, entry.action);
    case 'extension.requested':
      return typeof metadata.requestedDueOn === 'string'
        ? text.activity.extensionRequested(actor, formatDay(metadata.requestedDueOn, where.lang))
        : text.activity.other(actor, entry.action);
    case 'extension.approved':
    case 'extension.countered': {
      if (typeof metadata.dueOn !== 'string') return text.activity.other(actor, entry.action);
      const assignee = assignees.find((person) => person.id === metadata.assigneeId)?.name ?? text.someone;
      const describe = entry.action === 'extension.approved' ? text.activity.extensionApproved : text.activity.extensionCountered;
      return describe(actor, assignee, formatDay(metadata.dueOn, where.lang));
    }
    default:
      return text.activity.other(actor, entry.action);
  }
}
