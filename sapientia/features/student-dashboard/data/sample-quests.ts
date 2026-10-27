import type { Quest } from '../interfaces/quest.interface';

/** Sample homework. Teachers and tasks are fictional; the real list comes from the API. */
export const SAMPLE_QUESTS: readonly Quest[] = [
  {
    id: 'math',
    subject: 'math',
    title: { ms: 'Latihan pecahan, muka surat 42', en: 'Fractions exercise, page 42' },
    due: 'today',
    xp: 30,
    coins: 10,
    teacher: { ms: 'Cikgu Faridah', en: 'Ms Faridah' },
    description: {
      ms: 'Sila selesaikan soalan 1 hingga 10 di muka surat 42 dalam buku latihan. Tunjukkan semua langkah kerja anda dan tulis setiap pecahan dalam bentuk termudah. Ambil gambar halaman yang siap dan hantar melalui portal sebelum waktu persekolahan tamat.',
      en: 'Please complete questions 1 to 10 on page 42 of your exercise book. Show all your working and write each fraction in its simplest form. Take a photo of the finished page and hand it in through the portal before the end of the school day.',
    },
    steps: {
      ms: ['Selesaikan soalan 1 hingga 10', 'Tunjukkan langkah kerja', 'Muat naik gambar halaman yang siap'],
      en: ['Complete questions 1 to 10', 'Show your working', 'Upload a photo of the finished page'],
    },
    doneAtStart: false,
  },
  {
    id: 'sci',
    subject: 'sci',
    title: { ms: 'Lukis kitaran air', en: 'Draw the water cycle' },
    due: 'tomorrow',
    xp: 40,
    coins: 15,
    teacher: { ms: 'Cikgu Azman', en: 'Mr Azman' },
    description: {
      ms: 'Lukis kitaran air pada kertas A4. Labelkan penyejatan, pemeluwapan dan hujan, kemudian warnakan lukisan anda. Tulis satu ayat untuk menerangkan setiap peringkat.',
      en: 'Draw the water cycle on an A4 sheet. Label evaporation, condensation and rainfall, then colour your drawing. Write one sentence to explain each stage.',
    },
    steps: {
      ms: ['Lukis kitaran air', 'Labelkan tiga peringkat', 'Tulis satu ayat bagi setiap peringkat'],
      en: ['Draw the water cycle', 'Label the three stages', 'Write one sentence for each stage'],
    },
    doneAtStart: false,
  },
  {
    id: 'bm',
    subject: 'bm',
    title: { ms: 'Karangan 150 patah perkataan', en: '150-word essay' },
    due: 'friday',
    xp: 50,
    coins: 20,
    teacher: { ms: 'Cikgu Rohani', en: 'Ms Rohani' },
    description: {
      ms: 'Tulis karangan 150 patah perkataan bertajuk "Cuti Sekolah yang Paling Saya Ingati". Gunakan sekurang-kurangnya tiga ayat berhubung dan semak ejaan anda sebelum menghantar.',
      en: 'Write a 150-word essay titled "The School Holiday I Remember Most". Use at least three linking sentences and check your spelling before you hand it in.',
    },
    steps: {
      ms: ['Tulis kira-kira 150 patah perkataan', 'Gunakan tiga ayat berhubung', 'Semak ejaan'],
      en: ['Write about 150 words', 'Use three linking sentences', 'Check your spelling'],
    },
    doneAtStart: false,
  },
  {
    id: 'bi',
    subject: 'bi',
    title: { ms: 'Log bacaan minggu ini', en: 'Weekly reading log' },
    due: 'friday',
    xp: 20,
    coins: 5,
    teacher: { ms: 'Cikgu Daniel', en: 'Mr Daniel' },
    description: {
      ms: 'Isi log bacaan anda dengan buku yang dibaca minggu ini, termasuk tajuk, bilangan muka surat dan satu ayat ringkasan.',
      en: 'Fill in your reading log with the book you read this week: the title, the number of pages and a one-sentence summary.',
    },
    steps: {
      ms: ['Catat tajuk buku', 'Catat bilangan muka surat', 'Tulis satu ayat ringkasan'],
      en: ['Record the book title', 'Record the number of pages', 'Write a one-sentence summary'],
    },
    doneAtStart: true,
  },
];
