/**
 * A message about something other than a new task (plan Phase 2): an extension request reaching the sender, the answer
 * reaching the teacher, and relief given to or taken from a relief teacher. The job carries ids only, except for a
 * cancelled relief, whose row no longer exists: it carries who, which date and which times, never a reason or a name.
 */
export type EventNoticeJob =
  | { kind: 'extension.requested'; schoolId: string; extensionId: string }
  | { kind: 'extension.answered'; schoolId: string; extensionId: string }
  | { kind: 'relief.assigned'; schoolId: string; reliefId: string }
  | {
    kind: 'relief.cancelled';
    schoolId: string;
    reliefId: string;
    reliefTeacherId: string;
    absentTeacherId: string;
    /** YYYY-MM-DD in the school's calendar. */
    onDate: string;
    /** HH:mm */
    startTime: string;
    endTime: string;
  };

export type EventNoticeKind = EventNoticeJob['kind'];

/** "Cikgu A asks for a later date": to the task's sender. */
export interface ExtensionRequestedNotice {
  kind: 'extension.requested';
  taskId: string;
  taskTitle: string;
  requesterName: string;
  currentDueOn: string;
  requestedDueOn: string;
}

/** "Your request was approved" or "another date was set": to the teacher who asked. */
export interface ExtensionAnsweredNotice {
  kind: 'extension.answered';
  taskId: string;
  taskTitle: string;
  deciderName: string;
  outcome: 'approved' | 'countered';
  dueOn: string;
}

/** A relief class given to, or taken back from, the relief teacher. */
export interface ReliefNotice {
  kind: 'relief.assigned' | 'relief.cancelled';
  reliefId: string;
  absentTeacherName: string;
  onDate: string;
  startTime: string;
  endTime: string;
  /** The class and subject, or the period's own label; null when the period has neither. */
  period: string | null;
}

export type EventNotice = ExtensionRequestedNotice | ExtensionAnsweredNotice | ReliefNotice;
