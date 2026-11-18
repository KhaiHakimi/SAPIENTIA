import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { GuardianRelationship, LinkRefusalReason, LinkRemovalReason } from '../interfaces/guardian.interface';

export interface GuardianLabels {
  relationships: Record<GuardianRelationship, string>;
  refusalReasons: Record<LinkRefusalReason, string>;
  removalReasons: Record<LinkRemovalReason, string>;
}

/** The fixed lists, worded once for the administrator's page and the guardian's own view. */
export const GUARDIAN_LABELS: Record<Lang, GuardianLabels> = {
  ms: {
    relationships: { mother: 'Ibu', father: 'Bapa', guardian: 'Penjaga', grandparent: 'Datuk atau nenek', relative: 'Saudara', other: 'Lain-lain' },
    refusalReasons: { not_my_child: 'Ini bukan anak saya', not_responsible: 'Saya tidak menjaga murid ini', other: 'Sebab lain' },
    removalReasons: {
      entered_in_error: 'Dimasukkan secara silap', guardian_asked: 'Atas permintaan penjaga', school_decision: 'Keputusan sekolah',
      pupil_left: 'Murid telah meninggalkan sekolah',
    },
  },
  en: {
    relationships: { mother: 'Mother', father: 'Father', guardian: 'Guardian', grandparent: 'Grandparent', relative: 'Relative', other: 'Other' },
    refusalReasons: { not_my_child: 'This is not my child', not_responsible: 'I do not look after this pupil', other: 'Another reason' },
    removalReasons: {
      entered_in_error: 'Entered in error', guardian_asked: 'The guardian asked', school_decision: 'School decision', pupil_left: 'The pupil has left',
    },
  },
};
