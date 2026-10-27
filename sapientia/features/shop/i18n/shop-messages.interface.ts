import type { ShopKind } from '../interfaces/shop-item.interface';

export interface ShopMessages {
  title: string;
  eyebrow: string;
  intro: string;
  tabs: Record<ShopKind, string>;
  buy: string;
  use: string;
  inUse: string;
  free: string;
  notEnoughCoins: string;
  bought: (item: string) => string;
  equipped: (item: string) => string;
  coins: (count: number) => string;
  close: string;
}
