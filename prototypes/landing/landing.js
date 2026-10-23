'use strict';

/**
 * Shared behaviour for the three Sapientia landing-page prototypes:
 * toolbar, BM/EN text, light/dark theme, icons, floating sparks and the
 * held-delivery demo. Every string below is a static constant, so it is
 * safe to write with textContent/innerHTML.
 */
(function () {
  const STORAGE_KEY = 'sapientia.landing.prefs';
  const DESIGNS = [
    {key: 'a', file: 'index.html', label: 'A. Sanctum'},
    {key: 'b', file: 'b-scroll.html', label: 'B. Scroll'},
    {key: 'c', file: 'c-obsidian.html', label: 'C. Obsidian'},
  ];
  // Example working hours only. Each school sets its own in the real product.
  const WORK_START_MIN = 7 * 60 + 30;
  const WORK_END_MIN = 17 * 60;

  const TEXT = {
    ms: {
      docTitle: 'Sapientia | Satu platform penyelarasan sekolah',
      skip: 'Langkau ke kandungan',
      tbLabel: 'Kawalan prototaip',
      tbDesign: 'Reka bentuk:',
      tbLang: 'Bahasa:',
      tbTheme: 'Tema:',
      themeAuto: 'Auto',
      themeLight: 'Cerah',
      themeDark: 'Gelap',
      navFeatures: 'Ciri',
      navHow: 'Cara berfungsi',
      navRoles: 'Peranan',
      navTrust: 'Amanah',
      navLogin: 'Log Masuk',
      heroEyebrow: 'Platform penyelarasan sekolah Malaysia',
      heroTitle: 'Semua penyelarasan sekolah, di satu tempat.',
      heroSub: 'Sapientia menghimpunkan tugas, jadual waktu, beban kerja, rekod pengajaran, laporan, kerja rumah dan paparan penjaga dalam satu platform untuk guru, pentadbir, murid dan penjaga. Arahan selepas waktu bekerja dipegang sehingga pagi.',
      heroCta: 'Log Masuk',
      heroCta2: 'Lihat cara ia berfungsi',
      heroNote: 'Tiada pendaftaran sendiri. Akaun dicipta oleh pentadbir sekolah.',
      tagline: 'Arahan boleh menunggu pagi.',
      fact1: 'Waktu bekerja dihormati',
      fact2: 'Tiada pemantauan guru',
      fact3: 'Bahasa Melayu dan Inggeris',
      memoTitle: 'Memo tugas',
      memoTask: 'Hantar markah Ujian 1',
      memoCreated: 'Dicipta: Jumaat, 10:00 malam',
      memoStatus: 'Dipegang',
      memoRelease: 'Muncul: Isnin, 7:30 pagi',
      featuresTitle: 'Semuanya di satu tempat',
      featuresSub: 'Daripada tugas harian hingga laporan bulanan, setiap bahagian berfungsi bersama. Dibina secara berfasa.',
      phase1: 'Fasa 1',
      phase2: 'Fasa 2',
      phase3: 'Fasa 3',
      phase4: 'Fasa 4',
      f1t: 'Papan Tugas',
      f1d: 'Setiap tugas ada pemilik, tarikh akhir dan status. Setiap langkah direkodkan dalam log audit.',
      f2t: 'Penghantaran Tertahan',
      f2d: 'Tugas yang dicipta di luar waktu bekerja menunggu sehingga pagi hari bekerja. Penggantian mendesak tersedia dan direkodkan.',
      f3t: 'Semakan Kebolehlaksanaan',
      f3d: 'Amaran jika tarikh akhir tidak realistik berdasarkan jadual waktu, bersama tarikh paling awal yang munasabah. Ia memberi amaran, tidak menyekat.',
      f4t: 'Cadangan Guru Ganti',
      f4d: 'Tiga cadangan berdasarkan siapa yang lapang dan beban guru ganti bulan ini. Manusia yang membuat keputusan.',
      f5t: 'Bukti Kerja',
      f5d: 'Rekod pengajaran satu ketik dan laporan bulanan untuk pengetua dalam PDF dan Excel, tanpa laporan tambahan.',
      f6t: 'Bahasa dan Telefon',
      f6d: 'Bahasa Melayu dan Inggeris, serta boleh dipasang pada telefon sebagai aplikasi web (PWA).',
      howTitle: 'Cara penghantaran tertahan berfungsi',
      howSub: 'Contoh: tugas dicipta pada pukul 10 malam hari Jumaat.',
      s1t: 'Jumaat, 10:00 malam',
      s1d: 'Pengetua mencipta tugas. Ia disimpan dengan selamat.',
      s2t: 'Hujung minggu',
      s2d: 'Tugas tidak kelihatan dan tiada pemberitahuan dihantar kepada guru.',
      s3t: 'Isnin, 7:30 pagi',
      s3d: 'Tugas muncul di papan dan guru dimaklumkan.',
      demoTitle: 'Cuba sendiri',
      demoDay: 'Hari tugas dicipta',
      demoTime: 'Masa',
      demoUrgent: 'Tandakan sebagai mendesak',
      demoNow: 'Dihantar serta-merta.',
      demoUrgentRes: 'Dihantar serta-merta. Penggantian mendesak direkodkan dalam log audit.',
      demoHeld: 'Dipegang sehingga {when}.',
      whenToday: 'hari ini pukul {time}',
      whenDay: '{day} pukul {time}',
      releaseTime: '7:30 pagi',
      demoInvalid: 'Sila pilih masa yang sah.',
      demoNote: 'Contoh waktu bekerja: Isnin hingga Jumaat, 7:30 pagi hingga 5:00 petang. Setiap sekolah menetapkan waktunya sendiri. Cuti sekolah dan cuti umum belum dimodelkan dalam demo ini.',
      rolesTitle: 'Satu platform, setiap peranan',
      rolesSub: 'Setiap peranan hanya melihat apa yang perlu.',
      r1t: 'Guru',
      r1d: 'Papan tugas peribadi, permohonan lanjutan satu ketik dan rekod pengajaran pantas.',
      r2t: 'Pentadbir dan Pengetua',
      r2d: 'Memberi tugas, meluluskan lanjutan, melihat beban kerja mingguan dan laporan bulanan.',
      r3t: 'Murid',
      r3d: 'Jadual waktu dan senarai kerja rumah. Peringatan pada waktu petang sahaja, tidak lewat malam.',
      r4t: 'Penjaga',
      r4d: 'Paparan baca sahaja bagi anak yang dipautkan oleh pentadbir sekolah.',
      trustTitle: 'Dibina dengan amanah',
      trustSub: 'Prinsip yang tidak akan dilanggar.',
      t1t: 'Tiada pemantauan guru',
      t1d: 'Tiada "terakhir dalam talian", masa dalam aplikasi atau lokasi.',
      t2t: 'Data murid yang minimum',
      t2d: 'Hanya nama, kelas dan nombor yang dikeluarkan sekolah. Tiada nombor MyKad, alamat atau data kesihatan.',
      t3t: 'Akaun oleh pentadbir',
      t3d: 'Tiada pendaftaran sendiri. Setiap guru dijemput oleh pentadbir sekolah.',
      t4t: 'Setiap tindakan direkodkan',
      t4d: 'Log audit untuk mencipta, menugaskan, menukar status dan mengulas, tanpa data peribadi dalam metadata.',
      ctaTitle: 'Sedia masuk ke meja anda?',
      ctaSub: 'Gunakan akaun rasmi yang dibekalkan oleh pentadbir sekolah anda.',
      ctaBtn: 'Log Masuk',
      footDisclaimer: 'Projek portfolio bebas. Data fiksyen sahaja. Tidak berkaitan dengan KPM atau mana-mana sekolah.',
      footNote: 'Prototaip halaman utama · Sapientia',
    },
    en: {
      docTitle: 'Sapientia | One platform for school coordination',
      skip: 'Skip to content',
      tbLabel: 'Prototype controls',
      tbDesign: 'Design:',
      tbLang: 'Language:',
      tbTheme: 'Theme:',
      themeAuto: 'Auto',
      themeLight: 'Light',
      themeDark: 'Dark',
      navFeatures: 'Features',
      navHow: 'How it works',
      navRoles: 'Roles',
      navTrust: 'Trust',
      navLogin: 'Sign In',
      heroEyebrow: 'School coordination platform for Malaysia',
      heroTitle: 'Everything a school coordinates, in one place.',
      heroSub: 'Sapientia brings together tasks, timetables, workload, lesson records, reports, homework and guardian views in one platform for teachers, administrators, students and guardians. Instructions sent after working hours wait until morning.',
      heroCta: 'Sign In',
      heroCta2: 'See how it works',
      heroNote: 'There is no self sign-up. Accounts are created by your school administrator.',
      tagline: 'Instructions can wait for morning.',
      fact1: 'Working hours respected',
      fact2: 'No teacher monitoring',
      fact3: 'Bahasa Melayu and English',
      memoTitle: 'Task memo',
      memoTask: 'Submit Test 1 marks',
      memoCreated: 'Created: Friday, 10:00 pm',
      memoStatus: 'Held',
      memoRelease: 'Appears: Monday, 7:30 am',
      featuresTitle: 'Everything in one place',
      featuresSub: 'From daily tasks to monthly reports, each part works with the others. Built in phases.',
      phase1: 'Phase 1',
      phase2: 'Phase 2',
      phase3: 'Phase 3',
      phase4: 'Phase 4',
      f1t: 'Task Board',
      f1d: 'Every task has an owner, a deadline and a status. Every step is recorded in the audit log.',
      f2t: 'Held Delivery',
      f2d: 'Tasks created outside working hours wait until the next working morning. An urgent override is available and is recorded.',
      f3t: 'Feasibility Check',
      f3d: 'A warning when a deadline is unrealistic given the timetable, with the earliest realistic date. It warns and never blocks.',
      f4t: 'Relief Suggestions',
      f4d: 'Three suggestions based on who is free and this month’s relief load. A person makes the decision.',
      f5t: 'Evidence of Work',
      f5d: 'One-tap lesson records and a monthly principal report in PDF and Excel, with no extra reporting.',
      f6t: 'Language and Phone',
      f6d: 'Bahasa Melayu and English, and installable on a phone as a web app (PWA).',
      howTitle: 'How held delivery works',
      howSub: 'Example: a task is created at 10 pm on a Friday.',
      s1t: 'Friday, 10:00 pm',
      s1d: 'The principal creates the task. It is stored safely.',
      s2t: 'The weekend',
      s2d: 'The task stays invisible and no notification is sent to the teacher.',
      s3t: 'Monday, 7:30 am',
      s3d: 'The task appears on the board and the teacher is notified.',
      demoTitle: 'Try it yourself',
      demoDay: 'Day the task is created',
      demoTime: 'Time',
      demoUrgent: 'Mark as urgent',
      demoNow: 'Delivered immediately.',
      demoUrgentRes: 'Delivered immediately. The urgent override is recorded in the audit log.',
      demoHeld: 'Held until {when}.',
      whenToday: 'today at {time}',
      whenDay: '{day} at {time}',
      releaseTime: '7:30 am',
      demoInvalid: 'Please choose a valid time.',
      demoNote: 'Example working hours: Monday to Friday, 7:30 am to 5:00 pm. Each school sets its own. School holidays and public holidays are not modelled in this demo.',
      rolesTitle: 'One platform, every role',
      rolesSub: 'Each role sees only what it needs.',
      r1t: 'Teachers',
      r1d: 'A personal task board, one-tap extension requests and quick lesson records.',
      r2t: 'Administrators and Principals',
      r2d: 'Assign tasks, approve extensions, and see weekly workload and monthly reports.',
      r3t: 'Students',
      r3d: 'A timetable and homework list. Reminders in the afternoon only, never late at night.',
      r4t: 'Guardians',
      r4d: 'A read-only view of the child linked by the school administrator.',
      trustTitle: 'Built on trust',
      trustSub: 'Principles that will not be broken.',
      t1t: 'No teacher monitoring',
      t1d: 'No "last online", time in app or location.',
      t2t: 'Minimum student data',
      t2d: 'Only name, class and school-issued number. No MyKad number, address or health data.',
      t3t: 'Accounts by administrators',
      t3d: 'No self sign-up. Every teacher is invited by the school administrator.',
      t4t: 'Every action recorded',
      t4d: 'An audit log for create, assign, status change and comment, with no personal data in the metadata.',
      ctaTitle: 'Ready to step up to your desk?',
      ctaSub: 'Use the official credentials supplied by your school administrator.',
      ctaBtn: 'Sign In',
      footDisclaimer: 'Independent portfolio project. Fictional data only. Not affiliated with KPM or any school.',
      footNote: 'Landing page prototype · Sapientia',
    },
  };

  const DAY_NAMES = {
    ms: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  };

  const ICONS = {
    board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
    gauge: '<path d="M4 18a8 8 0 1116 0"/><path d="M12 18l4-6"/>',
    swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
    scroll: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    shield: '<path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 15-5 16 0"/>',
    school: '<path d="M3 21h18M5 21V8l7-5 7 5v13M10 21v-6h4v6"/>',
    book: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/>',
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 017-2 4 4 0 017 2c0 5.5-7 10-7 10z"/>',
    eyeoff: '<path d="M3 3l18 18M10 6a9 9 0 0111 6 9 9 0 01-3 4M6 8a9 9 0 00-3 4 9 9 0 0010 6"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    moon: '<path d="M20 14A8 8 0 1110 4a7 7 0 0010 10z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };

  const state = {lang: 'ms', themePref: 'dark'};
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function t(key) {
    return TEXT[state.lang][key] || '';
  }

  /**
   * Browser storage can be blocked (private windows, file:// restrictions), so
   * every access is wrapped and the page works without it.
   */
  function loadPrefs() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved.lang === 'ms' || saved.lang === 'en') state.lang = saved.lang;
      if (['auto', 'light', 'dark'].includes(saved.theme)) state.themePref = saved.theme;
    } catch (error) {
      console.warn('Preferences unavailable, using defaults.', error.name);
    }
  }

  function savePrefs() {
    try {
      window.localStorage.setItem(STORAGE_KEY,
          JSON.stringify({lang: state.lang, theme: state.themePref}));
    } catch (error) {
      console.warn('Preferences not saved.', error.name);
    }
  }

  /**
   * Returns the next release moment for a task created on `day` (0 = Sunday)
   * at `minutes` after midnight. Outside working hours it waits for 7:30 on
   * the next working day.
   * @param {number} day
   * @param {number} minutes
   * @return {{immediate: boolean, day?: number, sameDay?: boolean}}
   */
  function nextRelease(day, minutes) {
    const isWorkDay = day >= 1 && day <= 5;
    if (isWorkDay && minutes >= WORK_START_MIN && minutes < WORK_END_MIN) {
      return {immediate: true};
    }
    if (isWorkDay && minutes < WORK_START_MIN) {
      return {immediate: false, day, sameDay: true};
    }
    let candidate = (day + 1) % 7;
    while (candidate < 1 || candidate > 5) candidate = (candidate + 1) % 7;
    return {immediate: false, day: candidate, sameDay: false};
  }

  function renderDemo() {
    const result = $('demoResult');
    if (!result) return;
    const [hours, mins] = ($('demoTime').value || '').split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(mins)) {
      result.textContent = t('demoInvalid');
      return;
    }
    const release = nextRelease(Number($('demoDay').value), hours * 60 + mins);
    if (release.immediate) {
      result.textContent = t('demoNow');
    } else if ($('demoUrgent').checked) {
      result.textContent = t('demoUrgentRes');
    } else {
      const when = release.sameDay ?
        t('whenToday').replace('{time}', t('releaseTime')) :
        t('whenDay').replace('{day}', DAY_NAMES[state.lang][release.day])
            .replace('{time}', t('releaseTime'));
      result.textContent = t('demoHeld').replace('{when}', when);
    }
  }

  function renderDayOptions() {
    const select = $('demoDay');
    if (!select) return;
    const selected = select.value || '5';
    select.textContent = '';
    DAY_NAMES[state.lang].forEach((name, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = selected;
  }

  function renderToolbar() {
    const bar = $('toolbar');
    if (!bar) return;
    const current = document.body.dataset.design;
    const designLinks = DESIGNS.map((design) => {
      const isCurrent = design.key === current;
      return `<a href="./${design.file}" class="tb-btn"${isCurrent ? ' aria-current="page"' : ''}>${design.label}</a>`;
    }).join('');
    const langButtons = ['ms', 'en'].map((code) =>
      `<button type="button" class="tb-btn" data-lang-btn="${code}" aria-pressed="${state.lang === code}">${code.toUpperCase()}</button>`).join('');
    const themeButtons = ['auto', 'light', 'dark'].map((mode) =>
      `<button type="button" class="tb-btn" data-theme-btn="${mode}" aria-pressed="${state.themePref === mode}">${t('theme' + mode[0].toUpperCase() + mode.slice(1))}</button>`).join('');
    bar.setAttribute('aria-label', t('tbLabel'));
    bar.innerHTML =
      `<div class="tb-group"><span class="tb-label">${t('tbDesign')}</span>${designLinks}</div>` +
      `<div class="tb-group"><span class="tb-label">${t('tbLang')}</span>${langButtons}` +
      `<span class="tb-label">${t('tbTheme')}</span>${themeButtons}</div>`;
  }

  function applyTheme() {
    const resolved = state.themePref === 'auto' ?
      (systemDark.matches ? 'dark' : 'light') : state.themePref;
    document.documentElement.dataset.theme = resolved;
  }

  function renderText() {
    document.documentElement.lang = state.lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    renderDayOptions();
    renderDemo();
    renderToolbar();
  }

  function injectIcons() {
    document.querySelectorAll('[data-icon]').forEach((el) => {
      const path = ICONS[el.dataset.icon];
      if (!path) return;
      el.innerHTML = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        path + '</svg>';
    });
  }

  /** Decorative gold specks. Skipped entirely when the user prefers less motion. */
  function makeSparks() {
    const host = document.querySelector('[data-sparks]');
    if (!host || reducedMotion.matches) return;
    for (let i = 0; i < 22; i++) {
      const spark = document.createElement('span');
      spark.className = 'spark';
      spark.style.left = `${Math.random() * 100}%`;
      spark.style.setProperty('--size', `${2 + Math.random() * 3}px`);
      spark.style.setProperty('--dur', `${9 + Math.random() * 10}s`);
      spark.style.setProperty('--delay', `${-Math.random() * 14}s`);
      host.appendChild(spark);
    }
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const langBtn = event.target.closest('[data-lang-btn]');
      const themeBtn = event.target.closest('[data-theme-btn]');
      if (langBtn) {
        state.lang = langBtn.dataset.langBtn;
        savePrefs();
        renderText();
      } else if (themeBtn) {
        state.themePref = themeBtn.dataset.themeBtn;
        savePrefs();
        applyTheme();
        renderToolbar();
      }
    });
    ['demoDay', 'demoTime', 'demoUrgent'].forEach((id) => {
      const el = $(id);
      if (el) el.addEventListener('input', renderDemo);
    });
    systemDark.addEventListener('change', applyTheme);
  }

  function init() {
    state.themePref = document.body.dataset.defaultTheme || 'dark';
    loadPrefs();
    applyTheme();
    injectIcons();
    renderText();
    makeSparks();
    bindEvents();
  }

  init();
})();
