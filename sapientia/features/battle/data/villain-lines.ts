import type { CharacterId } from '@/features/characters';
import type { VillainLines } from '../interfaces/villain-lines.interface';

/** Each monster's voice, from the forest ogre's bluster to the ghost warrior waiting a hundred years for a worthy foe. */
export const VILLAIN_LINES: Partial<Record<CharacterId, VillainLines>> = {
  'orang-bunian': {
    entrance: { ms: 'Siapa berani masuk ke hutanku? Hutan ini akan menyesatkanmu!', en: 'Who dares enter my forest? These woods will swallow you whole!' },
    taunts: [
      { ms: 'Ha! Baru sedikit, kau sudah sesat!', en: 'Ha! Lost in the woods already!' },
      { ms: 'Tongkatku lebih tajam daripada fikiranmu!', en: 'My club is sharper than your mind!' },
    ],
    pain: [
      { ms: 'Aduh! Pokok-pokokku bergoyang!', en: 'Argh! My trees are shaking!' },
      { ms: 'Mustahil... budak kecil ini kuat!', en: 'Impossible... this little one is strong!' },
    ],
    defeat: { ms: 'Hutan... ini... milikmu...', en: 'The forest... is... yours...' },
    victory: { ms: 'Pulanglah! Belajar dahulu sebelum masuk ke hutanku lagi!', en: 'Go home! Study before you enter my forest again!' },
  },
  'naga-laut': {
    entrance: { ms: 'Ombak bergelora! Akulah penguasa lautan dalam!', en: 'The waves rage! I am ruler of the deep sea!' },
    taunts: [
      { ms: 'Tenggelamlah dalam kekeliruanmu!', en: 'Drown in your confusion!' },
      { ms: 'Ilmu yang cetek tidak dapat menyeberangi lautku!', en: 'Shallow knowledge cannot cross my sea!' },
    ],
    pain: [
      { ms: 'Grrr! Sisikku retak!', en: 'Grrr! My scales are cracking!' },
      { ms: 'Air pasangku mula surut!', en: 'My tide is turning!' },
    ],
    defeat: { ms: 'Lautan... kembali... tenang...', en: 'The sea... grows... calm...' },
    victory: { ms: 'Lautku terlalu dalam untukmu. Kembalilah apabila kau lebih bijak!', en: 'My sea is too deep for you. Return when you are wiser!' },
  },
  'harimau-jin': {
    entrance: { ms: 'Rrraaawr! Aku memburu sesiapa yang lupa pelajarannya!', en: 'Rrraaawr! I hunt those who forget their lessons!' },
    taunts: [
      { ms: 'Kukuku dapat menghidu keraguanmu!', en: 'My claws can smell your doubt!' },
      { ms: 'Terlalu lambat, mangsa kecil!', en: 'Too slow, little prey!' },
    ],
    pain: [
      { ms: 'Rrgh! Belangku semakin pudar!', en: 'Rrgh! My stripes are fading!' },
      { ms: 'Pemburu... menjadi buruan?', en: 'The hunter... becomes the hunted?' },
    ],
    defeat: { ms: 'Rimba... akan mengingati namamu...', en: 'The jungle... will remember your name...' },
    victory: { ms: 'Buruan hari ini milikku. Asah ilmumu dan datang lagi!', en: 'Today the hunt is mine. Sharpen your mind and come again!' },
  },
  'hantu-lelaki': {
    entrance: { ms: 'Seratus tahun aku menunggu lawan yang layak... Adakah kaulah orangnya?', en: 'A hundred years I have waited for a worthy foe... Are you the one?' },
    taunts: [
      { ms: 'Ilmumu hanyalah bayang-bayang!', en: 'Your knowledge is but a shadow!' },
      { ms: 'Kegelapan menelan setiap jawapan yang salah!', en: 'Darkness swallows every wrong answer!' },
    ],
    pain: [
      { ms: 'Mustahil! Cahaya ilmumu membakarku!', en: 'Impossible! The light of your knowledge burns me!' },
      { ms: 'Pedangku... bergetar...', en: 'My blade... trembles...' },
    ],
    defeat: { ms: 'Akhirnya... seorang pahlawan sejati... Aku boleh berehat...', en: 'At last... a true warrior... I can rest...' },
    victory: { ms: 'Belum cukup layak. Bayang-bayangku akan menunggumu.', en: 'Not yet worthy. My shadow will wait for you.' },
  },
};
