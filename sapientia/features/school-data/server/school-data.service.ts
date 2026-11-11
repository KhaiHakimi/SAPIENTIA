import 'server-only';
import { writeAudit } from '@/features/audit/server/audit.repository';
import type { SessionUser } from '@/features/auth/interfaces/session-user.interface';
import type { Clock } from '@/shared/interfaces/clock.interface';
import { ConflictError, NotFoundError } from '@/shared/server/app-errors';
import { getPool, withTransaction } from '@/shared/server/database.service';
import { SCHOOL_DATA_ITEMS_MAX } from '../constants/school-data.constants';
import type { NewSchoolDataItem, SchoolDataItem, SchoolDataKind } from '../interfaces/school-data.interface';
import { insertItem, listItems, removeItem } from './school-data.repository';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const errorCode = (error: unknown) => (error as { code?: string }).code;

/** Any signed-in staff member may read the lists: they are names of subjects, classes and kinds of task, nothing personal. */
export function listSchoolData(actor: SessionUser, kind: SchoolDataKind): Promise<SchoolDataItem[]> {
  return listItems(getPool(), actor.schoolId, kind, SCHOOL_DATA_ITEMS_MAX);
}

/** Administrators add to a list. The audit entry records which list, never the name. */
export async function addSchoolData(actor: SessionUser, kind: SchoolDataKind, input: NewSchoolDataItem): Promise<SchoolDataItem> {
  try {
    return await withTransaction(async (client) => {
      const item = await insertItem(client, actor.schoolId, kind, input);
      await writeAudit(client, actor.schoolId, [
        { actorId: actor.id, action: 'school_data.added', entityType: 'school_data', entityId: item.id, metadata: { kind } },
      ]);
      return item;
    });
  } catch (error) {
    if (errorCode(error) === UNIQUE_VIOLATION) throw new ConflictError('This name is already on the list.', { name: 'name_taken' });
    throw error;
  }
}

/** Administrators remove an entry; one still used on a timetable is refused with a reason the screen can explain. */
export async function removeSchoolData(actor: SessionUser, kind: SchoolDataKind, id: string, clock: Clock): Promise<void> {
  try {
    await withTransaction(async (client) => {
      if (!(await removeItem(client, actor.schoolId, kind, id, clock.now()))) throw new NotFoundError();
      await writeAudit(client, actor.schoolId, [
        { actorId: actor.id, action: 'school_data.removed', entityType: 'school_data', entityId: id, metadata: { kind } },
      ]);
    });
  } catch (error) {
    if (errorCode(error) === FOREIGN_KEY_VIOLATION) throw new ConflictError('This is still used on a timetable.', { id: 'in_use' });
    throw error;
  }
}
