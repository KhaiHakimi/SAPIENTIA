import type { QuizSubjectBank } from '../../interfaces/quiz.interface';

/**
 * Year 4 Bahasa Melayu sample: synonyms and antonyms, then proverbs. The Malay words and proverbs being tested stay in Malay in
 * both languages; only the meanings, which are the answers, are translated.
 */
export const MALAY_QUIZ: QuizSubjectBank = {
  chapters: [
    { id: 'bm-1', subject: 'bm', number: 1, title: { ms: 'Kosa Kata: Sinonim dan Antonim', en: 'Vocabulary: Synonyms and Antonyms' } },
    { id: 'bm-2', subject: 'bm', number: 2, title: { ms: 'Peribahasa', en: 'Proverbs' } },
  ],
  questions: [
    // Chapter 1, Easy: common pairs.
    { id: 'bm-1-1-1', chapter: 'bm-1', level: 1, question: { ms: 'Apakah antonim bagi perkataan "rajin"?', en: 'What is the antonym (opposite) of the Malay word "rajin"?' },
      options: ['malas', 'tekun', 'cergas', 'gigih'], answer: 0,
      why: { ms: '"Malas" bermaksud tidak suka bekerja, lawan bagi "rajin".', en: '"Malas" (lazy) is the opposite of "rajin" (hardworking).' } },
    { id: 'bm-1-1-2', chapter: 'bm-1', level: 1, question: { ms: 'Apakah sinonim bagi perkataan "cantik"?', en: 'What is a synonym of the Malay word "cantik"?' },
      options: ['indah', 'hodoh', 'buruk', 'kotor'], answer: 0,
      why: { ms: '"Indah" dan "cantik" hampir sama maksudnya.', en: '"Indah" and "cantik" both mean beautiful.' } },
    { id: 'bm-1-1-3', chapter: 'bm-1', level: 1, question: { ms: 'Apakah antonim bagi perkataan "tinggi"?', en: 'What is the antonym of the Malay word "tinggi"?' },
      options: ['rendah', 'panjang', 'besar', 'lebar'], answer: 0,
      why: { ms: '"Tinggi" dan "rendah" ialah pasangan berlawanan.', en: '"Tinggi" (tall, high) and "rendah" (low, short) are opposites.' } },
    // Chapter 1, Medium: less common pairs.
    { id: 'bm-1-2-1', chapter: 'bm-1', level: 2, question: { ms: 'Apakah sinonim bagi perkataan "gembira"?', en: 'What is a synonym of the Malay word "gembira"?' },
      options: ['riang', 'sedih', 'marah', 'takut'], answer: 0,
      why: { ms: '"Riang" dan "gembira" sama maksudnya.', en: '"Riang" and "gembira" both mean happy.' } },
    { id: 'bm-1-2-2', chapter: 'bm-1', level: 2, question: { ms: 'Apakah antonim bagi perkataan "berani"?', en: 'What is the antonym of the Malay word "berani"?' },
      options: ['penakut', 'gagah', 'kuat', 'cerdik'], answer: 0,
      why: { ms: '"Penakut" ialah orang yang mudah takut, lawan bagi "berani".', en: '"Penakut" (coward) is the opposite of "berani" (brave).' } },
    { id: 'bm-1-2-3', chapter: 'bm-1', level: 2, question: { ms: 'Apakah sinonim bagi perkataan "pintar"?', en: 'What is a synonym of the Malay word "pintar"?' },
      options: ['cerdik', 'bodoh', 'lambat', 'malas'], answer: 0,
      why: { ms: '"Cerdik" dan "pintar" sama maksudnya.', en: '"Cerdik" and "pintar" both mean clever.' } },
    // Chapter 1, Hard: words in a sentence, and a trap.
    { id: 'bm-1-3-1', chapter: 'bm-1', level: 3, question: { ms: 'Lengkapkan dengan antonim yang sesuai: "Bilik itu gelap, tetapi ruang tamu ___."', en: 'Complete with the right antonym: "Bilik itu gelap, tetapi ruang tamu ___."' },
      options: ['terang', 'kelam', 'suram', 'malap'], answer: 0,
      why: { ms: '"Terang" ialah lawan "gelap". "Kelam", "suram" dan "malap" hampir sama maksud dengan "gelap".', en: '"Terang" is the opposite of "gelap". "Kelam", "suram" and "malap" all mean nearly the same as "gelap".' } },
    { id: 'bm-1-3-2', chapter: 'bm-1', level: 3, question: { ms: 'Apakah antonim bagi "baharu" dalam ayat "Ayah membeli kereta baharu."?', en: 'What is the antonym of "baharu" in "Ayah membeli kereta baharu."?' },
      options: ['lama', 'tua', 'muda', 'kecil'], answer: 0,
      why: { ms: 'Bagi benda, lawan "baharu" ialah "lama". "Tua" ialah lawan "muda" dan digunakan untuk umur.', en: 'For things, the opposite of "baharu" is "lama". "Tua" is the opposite of "muda" and is used for age.' } },
    { id: 'bm-1-3-3', chapter: 'bm-1', level: 3, question: { ms: 'Pasangan manakah ialah sinonim?', en: 'Which pair are synonyms?' },
      options: ['cepat – pantas', 'panas – sejuk', 'atas – bawah', 'masuk – keluar'], answer: 0,
      why: { ms: '"Cepat" dan "pantas" sama maksudnya. Pasangan lain ialah antonim.', en: '"Cepat" and "pantas" mean the same. The other pairs are antonyms.' } },
    // Chapter 1, Very Hard: spotting the odd one out.
    { id: 'bm-1-4-1', chapter: 'bm-1', level: 4, question: { ms: 'Pasangan manakah BUKAN antonim?', en: 'Which pair is NOT a pair of antonyms?' },
      options: ['luas – lebar', 'tinggi – rendah', 'kaya – miskin', 'terang – gelap'], answer: 0,
      why: { ms: '"Luas" dan "lebar" hampir sama maksudnya, jadi ia sinonim, bukan antonim.', en: '"Luas" and "lebar" mean nearly the same, so they are synonyms, not antonyms.' } },
    { id: 'bm-1-4-2', chapter: 'bm-1', level: 4, question: { ms: 'Apakah antonim bagi perkataan "mengecil"?', en: 'What is the antonym of the Malay word "mengecil"?' },
      options: ['membesar', 'mengecut', 'menyusut', 'mengurang'], answer: 0,
      why: { ms: '"Membesar" ialah lawan "mengecil". "Mengecut", "menyusut" dan "mengurang" hampir sama maksud dengan "mengecil".', en: '"Membesar" is the opposite of "mengecil". "Mengecut", "menyusut" and "mengurang" mean nearly the same as "mengecil".' } },
    { id: 'bm-1-4-3', chapter: 'bm-1', level: 4, question: { ms: 'Perkataan manakah TIDAK sama maksud dengan yang lain?', en: 'Which word does NOT mean the same as the others?' },
      options: ['bising', 'senyap', 'sunyi', 'sepi'], answer: 0,
      why: { ms: '"Senyap", "sunyi" dan "sepi" bermaksud tiada bunyi; "bising" ialah lawannya.', en: '"Senyap", "sunyi" and "sepi" all mean without sound; "bising" is their opposite.' } },

    // Chapter 2, Easy: what common proverbs mean.
    { id: 'bm-2-1-1', chapter: 'bm-2', level: 1, question: { ms: 'Apakah maksud peribahasa "bagai aur dengan tebing"?', en: 'What does the proverb "bagai aur dengan tebing" mean?' },
      options: [{ ms: 'Saling bergantung dan membantu', en: 'Depending on and helping each other' }, { ms: 'Bermusuhan', en: 'Being enemies' }, { ms: 'Tinggal berjauhan', en: 'Living far apart' }, { ms: 'Berlainan pendapat', en: 'Having different opinions' }], answer: 0,
      why: { ms: 'Aur dan tebing saling menguatkan: hubungan yang erat dan saling membantu.', en: 'Bamboo and riverbank hold each other up: a close relationship where people help one another.' } },
    { id: 'bm-2-1-2', chapter: 'bm-2', level: 1, question: { ms: 'Apakah maksud peribahasa "bagai pinang dibelah dua"?', en: 'What does the proverb "bagai pinang dibelah dua" mean?' },
      options: [{ ms: 'Sangat sepadan atau serupa', en: 'A perfect match, or very alike' }, { ms: 'Bergaduh hingga berpecah', en: 'Quarrelling until they split up' }, { ms: 'Berkongsi makanan', en: 'Sharing food' }, { ms: 'Bekerja keras', en: 'Working hard' }], answer: 0,
      why: { ms: 'Dua belahan buah pinang kelihatan sama, jadi peribahasa ini untuk pasangan yang sangat sepadan.', en: 'The two halves of a split areca nut look the same, so it describes a perfect match.' } },
    { id: 'bm-2-1-3', chapter: 'bm-2', level: 1, question: { ms: 'Apakah maksud peribahasa "bagai kacang lupakan kulit"?', en: 'What does the proverb "bagai kacang lupakan kulit" mean?' },
      options: [{ ms: 'Lupa asal usul atau orang yang pernah membantu', en: 'Forgetting your roots or those who helped you' }, { ms: 'Suka makan kacang', en: 'Liking to eat nuts' }, { ms: 'Rajin menolong orang', en: 'Always helping others' }, { ms: 'Tidak suka berkongsi', en: 'Not liking to share' }], answer: 0,
      why: { ms: 'Kacang yang lupa kulit yang pernah melindunginya: orang yang tidak mengenang jasa.', en: 'A nut that forgets the shell that protected it: someone who forgets who helped them.' } },
    // Chapter 2, Medium: less common proverbs.
    { id: 'bm-2-2-1', chapter: 'bm-2', level: 2, question: { ms: 'Apakah maksud peribahasa "melentur buluh biarlah dari rebungnya"?', en: 'What does the proverb "melentur buluh biarlah dari rebungnya" mean?' },
      options: [{ ms: 'Mendidik anak sejak kecil', en: 'Teaching children while they are young' }, { ms: 'Menanam buluh di kebun', en: 'Planting bamboo in a garden' }, { ms: 'Memasak rebung', en: 'Cooking bamboo shoots' }, { ms: 'Membuat kerja dengan cepat', en: 'Doing work quickly' }], answer: 0,
      why: { ms: 'Rebung (buluh muda) mudah dilentur; begitu juga anak lebih mudah dididik semasa kecil.', en: 'A bamboo shoot bends easily; children, too, are easiest to teach while young.' } },
    { id: 'bm-2-2-2', chapter: 'bm-2', level: 2, question: { ms: 'Apakah maksud peribahasa "sediakan payung sebelum hujan"?', en: 'What does the proverb "sediakan payung sebelum hujan" mean?' },
      options: [{ ms: 'Bersedia sebelum sesuatu berlaku', en: 'Getting ready before something happens' }, { ms: 'Membeli payung baharu', en: 'Buying a new umbrella' }, { ms: 'Tidak suka hujan', en: 'Not liking rain' }, { ms: 'Lambat membuat keputusan', en: 'Being slow to decide' }], answer: 0,
      why: { ms: 'Peribahasa ini menasihati kita supaya berjaga-jaga dan bersedia lebih awal.', en: 'It tells us to be careful and get ready early.' } },
    { id: 'bm-2-2-3', chapter: 'bm-2', level: 2, question: { ms: 'Apakah maksud peribahasa "seperti katak di bawah tempurung"?', en: 'What does the proverb "seperti katak di bawah tempurung" mean?' },
      options: [{ ms: 'Kurang pengetahuan dan pengalaman', en: 'Knowing little of the world' }, { ms: 'Pandai bersembunyi', en: 'Good at hiding' }, { ms: 'Suka melompat', en: 'Liking to jump' }, { ms: 'Rajin bekerja', en: 'Hardworking' }], answer: 0,
      why: { ms: 'Katak di bawah tempurung menyangka tempurung itu seluruh dunia: orang yang kurang pengetahuan.', en: 'A frog under a coconut shell thinks the shell is the whole world: someone who knows little.' } },
    // Chapter 2, Hard: picking the proverb that fits. The proverbs are the answers, so they are not translated.
    { id: 'bm-2-3-1', chapter: 'bm-2', level: 3, question: { ms: 'Ahmad mengulang kaji sedikit setiap hari sehingga dia menjadi pandai. Peribahasa manakah sesuai?', en: 'Ahmad revises a little every day until he becomes good at it. Which proverb fits?' },
      options: ['Sedikit-sedikit, lama-lama jadi bukit', 'Bagai kacang lupakan kulit', 'Bagai aur dengan tebing', 'Seperti katak di bawah tempurung'], answer: 0,
      why: { ms: 'Usaha kecil yang berterusan akhirnya menjadi hasil yang besar.', en: 'Small, steady effort adds up to something big.' } },
    { id: 'bm-2-3-2', chapter: 'bm-2', level: 3, question: { ms: 'Penduduk kampung bergotong-royong membersihkan surau. Peribahasa manakah sesuai?', en: 'The villagers work together to clean the surau. Which proverb fits?' },
      options: ['Berat sama dipikul, ringan sama dijinjing', 'Bagai pinang dibelah dua', 'Sediakan payung sebelum hujan', 'Bagai kacang lupakan kulit'], answer: 0,
      why: { ms: 'Peribahasa ini bermaksud bekerjasama dan berkongsi susah dan senang.', en: 'It means working together and sharing both the hard and the easy.' } },
    { id: 'bm-2-3-3', chapter: 'bm-2', level: 3, question: { ms: 'Siti membawa baju hujan walaupun pagi itu cerah. Peribahasa manakah sesuai?', en: 'Siti brings a raincoat even though the morning is sunny. Which proverb fits?' },
      options: ['Sediakan payung sebelum hujan', 'Melentur buluh biarlah dari rebungnya', 'Bagai aur dengan tebing', 'Seperti katak di bawah tempurung'], answer: 0,
      why: { ms: 'Siti bersedia sebelum hujan turun.', en: 'Siti is ready before the rain comes.' } },
    // Chapter 2, Very Hard: proverbs in harder situations.
    { id: 'bm-2-4-1', chapter: 'bm-2', level: 4, question: { ms: 'Selepas berjaya, Kamal tidak lagi melawat guru yang pernah membantunya. Peribahasa manakah sesuai?', en: 'After he succeeds, Kamal never again visits the teacher who helped him. Which proverb fits?' },
      options: ['Bagai kacang lupakan kulit', 'Melentur buluh biarlah dari rebungnya', 'Sediakan payung sebelum hujan', 'Bagai pinang dibelah dua'], answer: 0,
      why: { ms: 'Kamal melupakan orang yang membantunya.', en: 'Kamal forgets the person who helped him.' } },
    { id: 'bm-2-4-2', chapter: 'bm-2', level: 4, question: { ms: 'Ibu mengajar adik menabung sejak adik berumur lima tahun. Peribahasa manakah sesuai?', en: 'Mother has taught her youngest to save money since the age of five. Which proverb fits?' },
      options: ['Melentur buluh biarlah dari rebungnya', 'Seperti katak di bawah tempurung', 'Bagai aur dengan tebing', 'Bagai kacang lupakan kulit'], answer: 0,
      why: { ms: 'Ibu mendidik adik sejak kecil, seperti rebung yang dilentur semasa masih muda.', en: 'Mother teaches the child while young, like bending a bamboo shoot while it is still soft.' } },
    { id: 'bm-2-4-3', chapter: 'bm-2', level: 4, question: { ms: 'Faris tidak pernah keluar dari kampungnya dan menyangka kampungnya paling besar di dunia. Peribahasa manakah sesuai?', en: 'Faris has never left his village and thinks it is the biggest in the world. Which proverb fits?' },
      options: ['Seperti katak di bawah tempurung', 'Bagai pinang dibelah dua', 'Berat sama dipikul, ringan sama dijinjing', 'Sediakan payung sebelum hujan'], answer: 0,
      why: { ms: 'Faris kurang pengalaman kerana tidak pernah melihat dunia luar.', en: 'Faris knows little because he has never seen the world outside.' } },
  ],
};
