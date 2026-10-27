import type { Lang } from '@/shared/interfaces/localized-text.interface';
import type { ShopMessages } from './shop-messages.interface';

export const SHOP_MESSAGES: Record<Lang, ShopMessages> = {
  ms: {
    title: 'Kedai',
    eyebrow: 'Belanja dengan syiling',
    intro: 'Tukar syiling yang anda peroleh kepada rupa baharu untuk papan pelajar anda. Barang hanya perhiasan dan tidak menjejaskan markah.',
    tabs: { skin: 'Warna', frame: 'Bingkai', avatar: 'Avatar' },
    buy: 'Beli',
    use: 'Guna',
    inUse: 'Digunakan',
    free: 'Percuma',
    notEnoughCoins: 'Syiling tidak cukup',
    bought: (item) => `Dibeli dan digunakan: ${item}`,
    equipped: (item) => `Digunakan: ${item}`,
    coins: (count) => `${count} syiling`,
    close: 'Tutup',
  },
  en: {
    title: 'Shop',
    eyebrow: 'Spend your coins',
    intro: 'Trade the coins you earn for a new look for your dashboard. Items are cosmetic only and never affect your marks.',
    tabs: { skin: 'Colours', frame: 'Frames', avatar: 'Avatars' },
    buy: 'Buy',
    use: 'Use',
    inUse: 'In use',
    free: 'Free',
    notEnoughCoins: 'Not enough coins',
    bought: (item) => `Bought and equipped: ${item}`,
    equipped: (item) => `Equipped: ${item}`,
    coins: (count) => `${count} coins`,
    close: 'Close',
  },
};
