import type { Character, CharacterId, Monster, MonsterLevel } from './interfaces/character.interface';
import { pendekar } from './pendekar/pendekar.character';
import { orangBunian } from './orang-bunian/orang-bunian.character';
import { nagaLaut } from './naga-laut/naga-laut.character';
import { harimauJin } from './harimau-jin/harimau-jin.character';
import { hantuLelaki } from './hantu-lelaki/hantu-lelaki.character';

/** Registry of every character. Add a new monster by giving it a folder like the others and listing it here. */
export const PLAYER_CHARACTER: Character = pendekar;

/** One per level, easiest first, so MONSTERS[level - 1] is that level's monster. */
export const MONSTERS: readonly Monster[] = [orangBunian, nagaLaut, harimauJin, hantuLelaki];

export function monsterById(id: CharacterId): Monster | undefined {
  return MONSTERS.find((monster) => monster.id === id);
}

export const monsterForLevel = (level: MonsterLevel): Monster => MONSTERS[level - 1];

export type { Character, CharacterId, Monster, MonsterLevel } from './interfaces/character.interface';
