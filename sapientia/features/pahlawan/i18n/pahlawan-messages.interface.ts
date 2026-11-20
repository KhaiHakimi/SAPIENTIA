import type { OutfitPart } from '../interfaces/outfit.interface';

export interface PahlawanMessages {
  /** Shown in battle when the student has not named the pahlawan. */
  defaultName: string;
  menuLabel: string;
  title: string;
  intro: string;
  nameLabel: string;
  /** The heading of each colour picker. */
  partLabel: Record<OutfitPart, string>;
  reset: string;
  done: string;
  close: string;
}
