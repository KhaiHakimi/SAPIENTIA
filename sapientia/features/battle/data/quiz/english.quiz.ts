import type { QuizSubjectBank } from '../../interfaces/quiz.interface';

/**
 * Year 4 English sample: verbs and tenses, then nouns and pronouns. The English being tested stays in English in both languages;
 * only the instructions are translated.
 */
export const ENGLISH_QUIZ: QuizSubjectBank = {
  chapters: [
    { id: 'bi-1', subject: 'bi', number: 1, title: { ms: 'Kata Kerja dan Kala', en: 'Verbs and Tenses' } },
    { id: 'bi-2', subject: 'bi', number: 2, title: { ms: 'Kata Nama dan Kata Ganti Nama', en: 'Nouns and Pronouns' } },
  ],
  questions: [
    // Chapter 1, Easy: simple present, past and continuous.
    { id: 'bi-1-1-1', chapter: 'bi-1', level: 1, question: { ms: 'Pilih perkataan yang betul: "She ___ to school every day."', en: 'Choose the correct word: "She ___ to school every day."' },
      options: ['go', 'goes', 'going', 'gone'], answer: 1,
      why: { ms: 'Subjek "she" (orang ketiga tunggal) memerlukan "goes".', en: 'The subject "she" (third person singular) takes "goes".' } },
    { id: 'bi-1-1-2', chapter: 'bi-1', level: 1, question: { ms: 'Pilih kala lampau (past tense) bagi "buy".', en: 'Choose the past tense of "buy".' },
      options: ['buyed', 'bought', 'buying', 'buys'], answer: 1,
      why: { ms: '"Buy" ialah kata kerja tak sekata; kala lampaunya "bought".', en: '"Buy" is irregular; its past tense is "bought".' } },
    { id: 'bi-1-1-3', chapter: 'bi-1', level: 1, question: { ms: 'Pilih jawapan yang betul: "They ___ football now."', en: 'Choose the correct answer: "They ___ football now."' },
      options: ['are playing', 'plays', 'played', 'is playing'], answer: 0,
      why: { ms: '"Now" menunjukkan sedang berlaku, dan "they" mengambil "are": "are playing".', en: '"Now" means it is happening, and "they" takes "are": "are playing".' } },
    // Chapter 1, Medium: irregular verbs and time words.
    { id: 'bi-1-2-1', chapter: 'bi-1', level: 2, question: { ms: 'Pilih kala lampau bagi "go".', en: 'Choose the past tense of "go".' },
      options: ['goed', 'went', 'gone', 'going'], answer: 1,
      why: { ms: '"Go" ialah kata kerja tak sekata: go, went, gone.', en: '"Go" is irregular: go, went, gone.' } },
    { id: 'bi-1-2-2', chapter: 'bi-1', level: 2, question: { ms: 'Pilih perkataan yang betul: "Yesterday, I ___ my grandmother."', en: 'Choose the correct word: "Yesterday, I ___ my grandmother."' },
      options: ['visit', 'visits', 'visited', 'visiting'], answer: 2,
      why: { ms: '"Yesterday" menunjukkan masa lampau, jadi "visited".', en: '"Yesterday" points to the past, so "visited".' } },
    { id: 'bi-1-2-3', chapter: 'bi-1', level: 2, question: { ms: 'Pilih perkataan yang betul: "My father ___ a blue car."', en: 'Choose the correct word: "My father ___ a blue car."' },
      options: ['has', 'have', 'having', 'haves'], answer: 0,
      why: { ms: '"My father" ialah orang ketiga tunggal, jadi "has".', en: '"My father" is third person singular, so "has".' } },
    // Chapter 1, Hard: choosing between tenses.
    { id: 'bi-1-3-1', chapter: 'bi-1', level: 3, question: { ms: 'Pilih jawapan yang betul: "Look! The baby ___."', en: 'Choose the correct answer: "Look! The baby ___."' },
      options: ['is sleeping', 'sleeps', 'slept', 'sleep'], answer: 0,
      why: { ms: '"Look!" menunjukkan perkara itu sedang berlaku sekarang: "is sleeping".', en: '"Look!" shows it is happening right now: "is sleeping".' } },
    { id: 'bi-1-3-2', chapter: 'bi-1', level: 3, question: { ms: 'Ayat manakah betul?', en: 'Which sentence is correct?' },
      options: ["He doesn't like durian.", "He don't like durian.", "He doesn't likes durian.", 'He not like durian.'], answer: 0,
      why: { ms: '"He" mengambil "doesn\'t", dan selepas "doesn\'t" kata kerja kekal asal: "like".', en: '"He" takes "doesn\'t", and after "doesn\'t" the verb stays plain: "like".' } },
    { id: 'bi-1-3-3', chapter: 'bi-1', level: 3, question: { ms: 'Pilih perkataan yang betul: "Every morning, the birds ___."', en: 'Choose the correct word: "Every morning, the birds ___."' },
      options: ['sing', 'sings', 'singing', 'sang'], answer: 0,
      why: { ms: '"The birds" ialah jamak, jadi kata kerja tanpa "-s": "sing".', en: '"The birds" is plural, so the verb has no "-s": "sing".' } },
    // Chapter 1, Very Hard: whole sentences and tricky irregulars.
    { id: 'bi-1-4-1', chapter: 'bi-1', level: 4, question: { ms: 'Ayat manakah betul?', en: 'Which sentence is correct?' },
      options: ['She watched TV last night.', 'She watch TV last night.', 'She watches TV last night.', 'She watching TV last night.'], answer: 0,
      why: { ms: '"Last night" ialah masa lampau, jadi "watched".', en: '"Last night" is in the past, so "watched".' } },
    { id: 'bi-1-4-2', chapter: 'bi-1', level: 4, question: { ms: 'Pilih perkataan yang betul: "Mei Ling ___ her homework before she went out to play."', en: 'Choose the correct word: "Mei Ling ___ her homework before she went out to play."' },
      options: ['finished', 'finish', 'finishes', 'finishing'], answer: 0,
      why: { ms: '"Went" menunjukkan cerita ini berlaku pada masa lampau, jadi "finished".', en: '"Went" shows the story is in the past, so "finished".' } },
    { id: 'bi-1-4-3', chapter: 'bi-1', level: 4, question: { ms: 'Pilih kala lampau bagi "catch".', en: 'Choose the past tense of "catch".' },
      options: ['catched', 'caught', 'cought', 'catching'], answer: 1,
      why: { ms: '"Catch" ialah kata kerja tak sekata: catch, caught.', en: '"Catch" is irregular: catch, caught.' } },

    // Chapter 2, Easy: spotting nouns, simple plurals, he and she.
    { id: 'bi-2-1-1', chapter: 'bi-2', level: 1, question: { ms: 'Perkataan manakah ialah kata nama (noun)?', en: 'Which word is a noun?' },
      options: ['sing', 'happy', 'table', 'quickly'], answer: 2,
      why: { ms: 'Kata nama menamakan benda; "table" ialah benda.', en: 'A noun names a thing; "table" is a thing.' } },
    { id: 'bi-2-1-2', chapter: 'bi-2', level: 1, question: { ms: 'Apakah bentuk jamak bagi "box"?', en: 'What is the plural of "box"?' },
      options: ['boxs', 'boxes', 'boxies', 'box'], answer: 1,
      why: { ms: 'Perkataan yang berakhir dengan "x" mengambil "-es": boxes.', en: 'Words ending in "x" take "-es": boxes.' } },
    { id: 'bi-2-1-3', chapter: 'bi-2', level: 1, question: { ms: 'Pilih perkataan yang betul: "Ali is my friend. ___ is kind."', en: 'Choose the correct word: "Ali is my friend. ___ is kind."' },
      options: ['He', 'She', 'It', 'They'], answer: 0,
      why: { ms: 'Ali ialah seorang lelaki, jadi "he".', en: 'Ali is one boy, so "he".' } },
    // Chapter 2, Medium: irregular plurals, they, proper nouns.
    { id: 'bi-2-2-1', chapter: 'bi-2', level: 2, question: { ms: 'Apakah bentuk jamak bagi "child"?', en: 'What is the plural of "child"?' },
      options: ['childs', 'children', 'childes', 'childrens'], answer: 1,
      why: { ms: '"Child" ialah jamak tak sekata: children.', en: '"Child" has an irregular plural: children.' } },
    { id: 'bi-2-2-2', chapter: 'bi-2', level: 2, question: { ms: 'Pilih perkataan yang betul: "Mei and Ravi play together. ___ are best friends."', en: 'Choose the correct word: "Mei and Ravi play together. ___ are best friends."' },
      options: ['They', 'We', 'He', 'She'], answer: 0,
      why: { ms: 'Mei dan Ravi ialah dua orang, jadi "they".', en: 'Mei and Ravi are two people, so "they".' } },
    { id: 'bi-2-2-3', chapter: 'bi-2', level: 2, question: { ms: 'Perkataan manakah ialah kata nama khas (proper noun)?', en: 'Which word is a proper noun?' },
      options: ['city', 'Kuala Lumpur', 'river', 'school'], answer: 1,
      why: { ms: 'Kata nama khas ialah nama tertentu dan bermula dengan huruf besar: Kuala Lumpur.', en: 'A proper noun is a particular name and starts with a capital letter: Kuala Lumpur.' } },
    // Chapter 2, Hard: -y plurals, possessives, a and an.
    { id: 'bi-2-3-1', chapter: 'bi-2', level: 3, question: { ms: 'Apakah bentuk jamak bagi "baby"?', en: 'What is the plural of "baby"?' },
      options: ['babys', 'babies', 'babyes', 'babis'], answer: 1,
      why: { ms: 'Konsonan + "y": tukar "y" kepada "i" dan tambah "-es": babies.', en: 'Consonant + "y": change the "y" to "i" and add "-es": babies.' } },
    { id: 'bi-2-3-2', chapter: 'bi-2', level: 3, question: { ms: 'Pilih perkataan yang betul: "This bag belongs to me. It is ___."', en: 'Choose the correct word: "This bag belongs to me. It is ___."' },
      options: ['mine', 'my', 'me', 'I'], answer: 0,
      why: { ms: '"Mine" berdiri sendiri tanpa kata nama selepasnya. "My" perlu diikuti kata nama (my bag).', en: '"Mine" stands alone with no noun after it. "My" needs a noun after it (my bag).' } },
    { id: 'bi-2-3-3', chapter: 'bi-2', level: 3, question: { ms: 'Yang manakah betul?', en: 'Which one is correct?' },
      options: ['an umbrella', 'a umbrella', 'an book', 'a apple'], answer: 0,
      why: { ms: 'Guna "an" sebelum bunyi vokal (umbrella) dan "a" sebelum bunyi konsonan (book).', en: 'Use "an" before a vowel sound (umbrella) and "a" before a consonant sound (book).' } },
    // Chapter 2, Very Hard: pronouns in pairs, odd plurals, collective nouns.
    { id: 'bi-2-4-1', chapter: 'bi-2', level: 4, question: { ms: 'Ayat manakah menggunakan kata ganti nama dengan betul?', en: 'Which sentence uses the pronouns correctly?' },
      options: ['She and I went to the shop.', 'Her and me went to the shop.', 'She and me went to the shop.', 'Her and I went to the shop.'], answer: 0,
      why: { ms: 'Sebagai subjek, guna "she" dan "I". Uji satu-satu: "She went", "I went".', en: 'As the subject, use "she" and "I". Test each alone: "She went", "I went".' } },
    { id: 'bi-2-4-2', chapter: 'bi-2', level: 4, question: { ms: 'Apakah bentuk jamak bagi "mouse" (haiwan)?', en: 'What is the plural of "mouse" (the animal)?' },
      options: ['mouses', 'mice', 'mices', 'meese'], answer: 1,
      why: { ms: '"Mouse" ialah jamak tak sekata: mice.', en: '"Mouse" has an irregular plural: mice.' } },
    { id: 'bi-2-4-3', chapter: 'bi-2', level: 4, question: { ms: 'Lengkapkan kata nama kolektif: "a ___ of fish"', en: 'Complete the collective noun: "a ___ of fish"' },
      options: ['school', 'herd', 'flock', 'pack'], answer: 0,
      why: { ms: 'A school of fish, a herd of cows, a flock of birds, a pack of wolves.', en: 'A school of fish, a herd of cows, a flock of birds, a pack of wolves.' } },
  ],
};
