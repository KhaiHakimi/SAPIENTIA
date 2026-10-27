import type { SchoolSubjectKey } from '@/shared/interfaces/school-subject.interface';
import type { Character, CharacterId, Monster } from './interfaces/character.interface';
import { pendekar } from './pendekar/pendekar.character';
import { orangBunian } from './orang-bunian/orang-bunian.character';
import { nagaLaut } from './naga-laut/naga-laut.character';
import { harimauJin } from './harimau-jin/harimau-jin.character';
import { hantuLelaki } from './hantu-lelaki/hantu-lelaki.character';

/** Registry of every character. Add a new monster by giving it a folder like the others and listing it here. */
export const PLAYER_CHARACTER: Character = pendekar;

/** In lair order: easiest first. */
export const MONSTERS: readonly Monster[] = [orangBunian, nagaLaut, harimauJin, hantuLelaki];

export function monsterById(id: CharacterId): Monster | undefined {
  return MONSTERS.find((monster) => monster.id === id);
}

export function monsterForSubject(subject: SchoolSubjectKey): Monster | undefined {
  return MONSTERS.find((monster) => monster.subject === subject);
}

export type { Character, CharacterId, Monster } from './interfaces/character.interface';
