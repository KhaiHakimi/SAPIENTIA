import type { SkinValue } from '../interfaces/shop-item.interface';

/** How many drifting squares each skin shows: stars over the royal hall, fireflies, rising embers, falling petals. */
export const SKIN_EFFECT_COUNTS: Partial<Record<SkinValue, number>> = { royal: 46, forest: 18, ember: 30, sakura: 30 };
