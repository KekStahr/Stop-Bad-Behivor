// Word-by-word data of the prayer formulas: every Arabic word with its Latin transliteration,
// translations per phrase (word ranges), and where the recording comes from.
// Pure data – also read by tools/align-clips.cjs to compute the word timings.


// the same recording, cut by the user into one clean file per part (gui/assets/audio/<name>.mp4)
const piece = (name, start, end, words, anchors, extra = {}) => ({ url: `assets/audio/${name}.mp4`, start, end, words, anchors, ...extra });

const w = (text) => text.trim().split(/\s*\|\s*/).map((pair) => pair.split(" = ").map((part) => part.trim()));

// clips: [{ url, start?, end?, words: [from, to], reps?, anchors? }] – which words are spoken where;
// reps: the recording already repeats the words this often (no extra repetition when playing)
export const FORMULAS = {
  takbir: {
    words: w("اللَّهُ = Allāhu | أَكْبَرُ = akbar"),
    phrases: [[0, 1, { de: "Allah ist größer.", en: "Allah is the Greatest.", tr: "Allah en büyüktür.", fr: "Allah est le plus grand." }]],
    clips: [piece("takbir", 0, 4.9, [0, 1], [0.05, 1.7])],
  },
  opening: {
    words: w("سُبْحَانَكَ = Subḥānaka | اللَّهُمَّ = llāhumma | وَبِحَمْدِكَ = wa bi-ḥamdika | وَتَبَارَكَ = wa-tabāraka | اسْمُكَ = smuka | وَتَعَالَىٰ = wa-taʿālā | جَدُّكَ = dschadduka | وَلَا = wa-lā | إِلَٰهَ = ilāha | غَيْرُكَ = ghairuk"),
    phrases: [
      [0, 2, { de: "Gepriesen seist Du, o Allah, und Dir gebührt das Lob.", en: "Glory be to You, O Allah, and all praise.", tr: "Allah'ım! Seni tenzih ederim ve Sana hamdederim.", fr: "Gloire à Toi, ô Allah, et louange à Toi." }],
      [3, 4, { de: "Gesegnet ist Dein Name,", en: "Blessed is Your name,", tr: "Senin adın mübarektir,", fr: "Béni soit Ton nom," }],
      [5, 6, { de: "erhaben ist Deine Majestät,", en: "exalted is Your majesty,", tr: "şanın yücedir,", fr: "exaltée soit Ta majesté," }],
      [7, 9, { de: "und es gibt keinen Gott außer Dir.", en: "and there is no god but You.", tr: "Senden başka ilah yoktur.", fr: "et il n'y a de divinité que Toi." }],
    ],
    clips: [piece("opening", 0.13, 24.08, [0, 9], [0.21, 1.48, 3.28, 7.48, 10.17, 12.51, 15.63, 17.71, null, null])],
  },
  refuge: {
    words: w("أَعُوذُ = Aʿūdhu | بِاللَّهِ = billāhi | مِنَ = mina | الشَّيْطَانِ = sch-schaiṭāni | الرَّجِيمِ = r-radschīm"),
    phrases: [[0, 4, { de: "Ich suche Zuflucht bei Allah vor dem verfluchten Satan.", en: "I seek refuge in Allah from the accursed Satan.", tr: "Kovulmuş şeytanın şerrinden Allah'a sığınırım.", fr: "Je cherche refuge auprès d'Allah contre Satan le maudit." }]],
    clips: [piece("refuge", 0.03, 7.98, [0, 4], [0.11, 0.88, 2.18, 2.58, 4.88])],
  },
  basmala: {
    words: w("بِسْمِ = Bismi | اللَّهِ = llāhi | الرَّحْمَٰنِ = r-raḥmāni | الرَّحِيمِ = r-raḥīm"),
    phrases: [[0, 3, { de: "Im Namen Allahs, des Allerbarmers, des Barmherzigen.", en: "In the name of Allah, the Most Gracious, the Most Merciful.", tr: "Rahman ve Rahim olan Allah'ın adıyla.", fr: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux." }]],
    clips: [piece("fatiha", 0.35, 6.6, [0, 3], [0.47, 1.1, 1.5, 2.66])],
  },
  ruku: {
    words: w("سُبْحَانَ = Subḥāna | رَبِّيَ = rabbiya | الْعَظِيمِ = l-ʿaẓīm"),
    phrases: [[0, 2, { de: "Gepriesen sei mein Herr, der Gewaltige.", en: "Glory be to my Lord, the Most Great.", tr: "Ulu Rabbimi tesbih ederim.", fr: "Gloire à mon Seigneur, le Très Grand." }]],
    clips: [piece("ruku", 0.23, 12.48, [0, 2], [0.3, 1.38, 2.18, 4.45, 5.28, 6.18, 8.84, 9.68, 10.28], { reps: 3 })],
  },
  rise: {
    words: w("سَمِعَ = Samiʿa | اللَّهُ = llāhu | لِمَنْ = liman | حَمِدَهُ = ḥamidah | رَبَّنَا = Rabbanā | وَلَكَ = wa-laka | الْحَمْدُ = l-ḥamd"),
    phrases: [
      [0, 3, { de: "Allah hört den, der Ihn lobt.", en: "Allah hears whoever praises Him.", tr: "Allah kendisine hamdedeni işitir.", fr: "Allah entend celui qui Le loue." }],
      [4, 6, { de: "Unser Herr, Dir gebührt das Lob.", en: "Our Lord, to You belongs all praise.", tr: "Rabbimiz, hamd Sana mahsustur.", fr: "Notre Seigneur, à Toi la louange." }],
    ],
    clips: [piece("rise", 0.07, 8.57, [0, 6], [0.14, 0.77, 1.87, 2.57, 4.73, 5.97, 6.97])],
  },
  sujud: {
    words: w("سُبْحَانَ = Subḥāna | رَبِّيَ = rabbiya | الْأَعْلَىٰ = l-aʿlā"),
    phrases: [[0, 2, { de: "Gepriesen sei mein Herr, der Höchste.", en: "Glory be to my Lord, the Most High.", tr: "Yüce Rabbimi tesbih ederim.", fr: "Gloire à mon Seigneur, le Très-Haut." }]],
    clips: [piece("sujud", 0, 12.4, [0, 2], [0.0, 1.3, 2.2, 3.5, 5.4, 6.4, 7.8, 9.6, 10.5], { reps: 3 })],
  },
  jalsa: {
    words: w("رَبِّ = Rabbi | اغْفِرْ = ghfir | لِي = lī | رَبِّ = Rabbi | اغْفِرْ = ghfir | لِي = lī"),
    phrases: [
      [0, 2, { de: "Mein Herr, vergib mir.", en: "My Lord, forgive me.", tr: "Rabbim, beni bağışla.", fr: "Mon Seigneur, pardonne-moi." }],
      [3, 5, { de: "Mein Herr, vergib mir.", en: "My Lord, forgive me.", tr: "Rabbim, beni bağışla.", fr: "Mon Seigneur, pardonne-moi." }],
    ],
    clips: [piece("jalsa", 0.0, 7.85, [0, 5], [0.02, null, null, 4.29, null, null])],
  },
  tashahhud: {
    words: w("التَّحِيَّاتُ = At-taḥiyyātu | لِلَّهِ = lillāhi | وَالصَّلَوَاتُ = wa-ṣ-ṣalawātu | وَالطَّيِّبَاتُ = wa-ṭ-ṭayyibāt | السَّلَامُ = As-salāmu | عَلَيْكَ = ʿalaika | أَيُّهَا = ayyuha | النَّبِيُّ = n-nabiyyu | وَرَحْمَةُ = wa-raḥmatu | اللَّهِ = llāhi | وَبَرَكَاتُهُ = wa-barakātuh | السَّلَامُ = As-salāmu | عَلَيْنَا = ʿalainā | وَعَلَىٰ = wa-ʿalā | عِبَادِ = ʿibādi | اللَّهِ = llāhi | الصَّالِحِينَ = ṣ-ṣāliḥīn"),
    phrases: [
      [0, 3, { de: "Alle Grüße, Gebete und guten Worte gebühren Allah.", en: "All greetings, prayers and good words are for Allah.", tr: "Bütün dualar, ibadetler ve güzel sözler Allah'a aittir.", fr: "Les salutations, les prières et les bonnes œuvres sont à Allah." }],
      [4, 10, { de: "Friede sei mit dir, o Prophet, und die Barmherzigkeit Allahs und Sein Segen.", en: "Peace be upon you, O Prophet, and the mercy of Allah and His blessings.", tr: "Ey Peygamber! Allah'ın selamı, rahmeti ve bereketi senin üzerine olsun.", fr: "Que la paix soit sur toi, ô Prophète, ainsi que la miséricorde d'Allah et Ses bénédictions." }],
      [11, 16, { de: "Friede sei mit uns und mit den rechtschaffenen Dienern Allahs.", en: "Peace be upon us and upon the righteous servants of Allah.", tr: "Selam bizim üzerimize ve Allah'ın salih kulları üzerine olsun.", fr: "Que la paix soit sur nous et sur les pieux serviteurs d'Allah." }],
    ],
    clips: [piece("tashahhud", 0.0, 33.93, [0, 16], [0.02, 2.33, 3.73, 6.33, 8.93, 11.83, 13.43, 14.43, 15.83, 17.93, 18.73, 22.13, 24.83, 26.33, 27.13, 28.53, 29.43])],
  },
  shahada: {
    words: w("أَشْهَدُ = Aschhadu | أَنْ = an | لَا = lā | إِلَٰهَ = ilāha | إِلَّا = illa | اللَّهُ = llāh | وَأَشْهَدُ = wa-aschhadu | أَنَّ = anna | مُحَمَّدًا = Muḥammadan | عَبْدُهُ = ʿabduhū | وَرَسُولُهُ = wa-rasūluh"),
    phrases: [
      [0, 5, { de: "Ich bezeuge, dass es keinen Gott gibt außer Allah,", en: "I bear witness that there is no god but Allah,", tr: "Şahitlik ederim ki Allah'tan başka ilah yoktur", fr: "J'atteste qu'il n'y a de divinité qu'Allah" }],
      [6, 10, { de: "und ich bezeuge, dass Muhammad Sein Diener und Gesandter ist.", en: "and I bear witness that Muhammad is His servant and messenger.", tr: "ve yine şahitlik ederim ki Muhammed O'nun kulu ve elçisidir.", fr: "et j'atteste que Muhammad est Son serviteur et Son messager." }],
    ],
    cue: { word: 0, text: "☝️ Jetzt den rechten Zeigefinger heben" },
    clips: [piece("shahada", 0.0, 15.92, [0, 10], [0.0, 0.72, 1.12, 2.32, 4.42, 5.32, 6.92, 8.52, 9.12, 12.02, 13.52])],
  },
  salawat: {
    words: w("اللَّهُمَّ = Allāhumma | صَلِّ = ṣalli | عَلَىٰ = ʿalā | مُحَمَّدٍ = Muḥammadin | وَعَلَىٰ = wa-ʿalā | آلِ = āli | مُحَمَّدٍ = Muḥammad | كَمَا = kamā | صَلَّيْتَ = ṣallaita | عَلَىٰ = ʿalā | إِبْرَاهِيمَ = Ibrāhīma | وَعَلَىٰ = wa-ʿalā | آلِ = āli | إِبْرَاهِيمَ = Ibrāhīm | إِنَّكَ = innaka | حَمِيدٌ = ḥamīdun | مَجِيدٌ = madschīd | اللَّهُمَّ = Allāhumma | بَارِكْ = bārik | عَلَىٰ = ʿalā | مُحَمَّدٍ = Muḥammadin | وَعَلَىٰ = wa-ʿalā | آلِ = āli | مُحَمَّدٍ = Muḥammad | كَمَا = kamā | بَارَكْتَ = bārakta | عَلَىٰ = ʿalā | إِبْرَاهِيمَ = Ibrāhīma | وَعَلَىٰ = wa-ʿalā | آلِ = āli | إِبْرَاهِيمَ = Ibrāhīm | إِنَّكَ = innaka | حَمِيدٌ = ḥamīdun | مَجِيدٌ = madschīd"),
    phrases: [
      [0, 6, { de: "O Allah, segne Muhammad und die Familie Muhammads,", en: "O Allah, send prayers upon Muhammad and the family of Muhammad,", tr: "Allah'ım! Muhammed'e ve Muhammed'in ailesine rahmet eyle,", fr: "Ô Allah, prie sur Muhammad et sur la famille de Muhammad," }],
      [7, 13, { de: "wie Du Ibrahim und die Familie Ibrahims gesegnet hast.", en: "as You sent prayers upon Ibrahim and the family of Ibrahim.", tr: "İbrahim'e ve İbrahim'in ailesine rahmet ettiğin gibi.", fr: "comme Tu as prié sur Ibrahim et sur la famille d'Ibrahim." }],
      [14, 16, { de: "Du bist der Lobenswerte, der Ruhmreiche.", en: "You are Praiseworthy, Glorious.", tr: "Şüphesiz Sen övülmeye layıksın, şanı yücesin.", fr: "Tu es certes Digne de louange et de gloire." }],
      [17, 23, { de: "O Allah, schenke Muhammad und der Familie Muhammads Segen,", en: "O Allah, bless Muhammad and the family of Muhammad,", tr: "Allah'ım! Muhammed'e ve Muhammed'in ailesine bereket ver,", fr: "Ô Allah, bénis Muhammad et la famille de Muhammad," }],
      [24, 30, { de: "wie Du Ibrahim und die Familie Ibrahims gesegnet hast.", en: "as You blessed Ibrahim and the family of Ibrahim.", tr: "İbrahim'e ve İbrahim'in ailesine bereket verdiğin gibi.", fr: "comme Tu as béni Ibrahim et la famille d'Ibrahim." }],
      [31, 33, { de: "Du bist der Lobenswerte, der Ruhmreiche.", en: "You are Praiseworthy, Glorious.", tr: "Şüphesiz Sen övülmeye layıksın, şanı yücesin.", fr: "Tu es certes Digne de louange et de gloire." }],
    ],
    clips: [piece("salawat", 0.0, 58.75, [0, 33], [0.07, 1.2, 2.2, 2.7, 5.91, 7.0, 8.0, 10.97, 11.4, 12.9, 13.4, 16.3, 17.5, 18.9, 22.39, 23.7, 25.2, 28.07, 28.9, 31.22, 31.8, 34.7, 35.8, 36.7, 39.46, 40.0, 41.25, 42.1, 43.9, 46.4, 47.4, 51.63, 53.0, 55.84])],
  },
  protection: {
    words: w("اللَّهُمَّ = Allāhumma | إِنِّي = innī | أَعُوذُ = aʿūdhu | بِكَ = bika | مِنْ = min | عَذَابِ = ʿadhābi | الْقَبْرِ = l-qabr | وَمِنْ = wa-min | عَذَابِ = ʿadhābi | جَهَنَّمَ = dschahannam | وَمِنْ = wa-min | فِتْنَةِ = fitnati | الْمَحْيَا = l-maḥyā | وَالْمَمَاتِ = wa-l-mamāt | وَمِنْ = wa-min | شَرِّ = scharri | فِتْنَةِ = fitnati | الْمَسِيحِ = l-masīḥi | الدَّجَّالِ = d-dadschdschāl"),
    phrases: [
      [0, 6, { de: "O Allah, ich suche Zuflucht bei Dir vor der Strafe des Grabes,", en: "O Allah, I seek refuge in You from the punishment of the grave,", tr: "Allah'ım! Kabir azabından Sana sığınırım,", fr: "Ô Allah, je cherche refuge auprès de Toi contre le châtiment de la tombe," }],
      [7, 9, { de: "vor der Strafe der Hölle,", en: "from the punishment of Hell,", tr: "cehennem azabından,", fr: "contre le châtiment de l'Enfer," }],
      [10, 13, { de: "vor der Prüfung des Lebens und des Todes", en: "from the trials of life and death,", tr: "hayatın ve ölümün fitnesinden", fr: "contre les épreuves de la vie et de la mort" }],
      [14, 18, { de: "und vor dem Übel der Prüfung des falschen Messias (Daddschāl).", en: "and from the evil of the trial of the False Messiah.", tr: "ve Mesih Deccal'in fitnesinin şerrinden.", fr: "et contre le mal de l'épreuve du faux Messie." }],
    ],
    clips: [], // no verified recording yet – read-along mode
  },
  salam: {
    words: w("السَّلَامُ = As-salāmu | عَلَيْكُمْ = ʿalaikum | وَرَحْمَةُ = wa-raḥmatu | اللَّهِ = llāh"),
    phrases: [[0, 3, { de: "Friede sei mit euch und die Barmherzigkeit Allahs.", en: "Peace be upon you and the mercy of Allah.", tr: "Allah'ın selamı ve rahmeti üzerinize olsun.", fr: "Que la paix et la miséricorde d'Allah soient sur vous." }]],
    clips: [piece("salam", 0.0, 7.92, [0, 3], [0.12, 1.82, 4.32, 5.92])],
  },
};

// ---- Is it obligatory? (main positions of the schools; Shia practice differs) --------------------
// pflicht: the prayer is invalid without it · wajib (Hanafi): if forgotten, prostration of forgetfulness
// sunnah: recommended – the prayer stays valid without it
// the greeting to the left has its own place in the recording
FORMULAS.salamLeft = { ...FORMULAS.salam, clips: [piece("salam", 9.17, 16.02, [0, 3], [9.27, null, 14.03, null])] };

// Fātiḥa (with Basmala) and Al-Ichlāṣ from the same recording – word counts match Quran.com's words.
export const GUIDE_SURAHS = {
  1: { words: "بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين إياك نعبد وإياك نستعين اهدنا الصراط المستقيم صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين".split(" "),
    clip: piece("fatiha", 0.35, 59.5, [0, 28], [0.47, 1.1, 1.5, 2.66, 7.61, 8.7, 9.9, 10.65, 15.48, 17.0, 19.78, 20.95, 22.22, 25.94, 27.0, 28.0, 29.7, 33.98, 35.13, 37.08, 40.48, 41.2, 42.5, 43.8, 47.8, 48.4, 49.4, 52.58, 53.46], { speechEnd: 57.1 }) },
  112: { words: "قل هو الله أحد الله الصمد لم يلد ولم يولد ولم يكن له كفوا أحد".split(" "),
    clip: piece("ikhlas", 0, 17.1, [0, 14], [0.0, 0.3, 0.6, 1.5, 2.5, 4.4, 7.1, 8.3, 9.0, 9.9, 11.5, 12.2, null, 13.8, 15.5]) },
};

export const RULINGS = {
  niyya: { all: "pflicht" },
  takbir_ihram: { all: "pflicht" },
  raise_hands: { all: "sunnah" },
  qiyam: { all: "pflicht" },
  hands: { all: "sunnah" },
  opening: { all: "sunnah" },
  refuge: { all: "sunnah" },
  basmala: { all: "sunnah", "sunni-shafii": "pflicht" },
  fatiha: { all: "pflicht", "sunni-hanafi": "wajib" },
  sura: { all: "sunnah", "sunni-hanafi": "wajib" },
  takbir_move: { all: "sunnah", "sunni-hanbali": "wajib" },
  ruku: { all: "pflicht" },
  ruku_dhikr: { all: "sunnah", "sunni-hanbali": "wajib" },
  rise: { all: "pflicht", "sunni-hanafi": "wajib" },
  rise_dhikr: { all: "sunnah", "sunni-hanbali": "wajib" },
  sujud: { all: "pflicht" },
  sujud_dhikr: { all: "sunnah", "sunni-hanbali": "wajib" },
  jalsa: { all: "pflicht", "sunni-hanafi": "wajib" },
  jalsa_dhikr: { all: "sunnah", "sunni-hanbali": "wajib" },
  first_tashahhud: { all: "sunnah", "sunni-hanafi": "wajib", "sunni-hanbali": "wajib" },
  last_sitting: { all: "pflicht" },
  last_tashahhud: { all: "pflicht", "sunni-hanafi": "wajib", "sunni-maliki": "sunnah" },
  salawat: { all: "sunnah", "sunni-shafii": "pflicht", "sunni-hanbali": "pflicht" },
  protection: { all: "sunnah" },
  finger: { all: "sunnah" },
  salam_right: { all: "pflicht", "sunni-hanafi": "wajib" },
  salam_left: { all: "sunnah", "sunni-hanafi": "wajib", "sunni-hanbali": "pflicht" },
};

export const RULING_LABELS = {
  pflicht: { short: "Pflicht", long: "Pflicht (Farḍ / Rukn) – ohne diesen Teil ist das Gebet nicht gültig.", tone: "is-fard" },
  wajib: { short: "Wādschib", long: "Wādschib – verpflichtend. Wer es vergisst, macht am Ende die Niederwerfung der Vergesslichkeit (Sudschūd as-Sahw).", tone: "is-wajib" },
  sunnah: { short: "Sunnah", long: "Sunnah – empfohlen nach dem Vorbild des Propheten ﷺ. Das Gebet bleibt auch ohne gültig.", tone: "is-sunnah" },
};

export function ruling(key, tradition) {
  const entry = RULINGS[key];
  if (!entry) return null;
  return entry[tradition] || entry.all;
}
