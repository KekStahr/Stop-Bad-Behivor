// Word-by-word data of the prayer formulas: every Arabic word with its Latin transliteration,
// translations per phrase (word ranges), and where the recording comes from.
// Pure data – also read by tools/align-clips.cjs to compute the word timings.

const EVERYAYAH = (file) => `https://everyayah.com/data/Alafasy_128kbps/${file}`;
const TAKBIR_AUDIO = "https://upload.wikimedia.org/wikipedia/commons/8/8d/LL-Q13955_%28ara%29-Ajron_Bach-Allahu_Akbar_%28noun%29.wav";

const w = (text) => text.trim().split(/\s*\|\s*/).map((pair) => pair.split(" = ").map((part) => part.trim()));

// clips: [{ url, end?, words: [from, to] }] – which words are spoken in which recording
export const FORMULAS = {
  takbir: {
    words: w("اللَّهُ = Allāhu | أَكْبَرُ = akbar"),
    phrases: [[0, 1, { de: "Allah ist größer.", en: "Allah is the Greatest.", tr: "Allah en büyüktür.", fr: "Allah est le plus grand." }]],
    clips: [{ url: TAKBIR_AUDIO, words: [0, 1] }],
  },
  opening: {
    words: w("سُبْحَانَكَ = Subḥānaka | اللَّهُمَّ = llāhumma | وَبِحَمْدِكَ = wa bi-ḥamdika | وَتَبَارَكَ = wa-tabāraka | اسْمُكَ = smuka | وَتَعَالَىٰ = wa-taʿālā | جَدُّكَ = dschadduka | وَلَا = wa-lā | إِلَٰهَ = ilāha | غَيْرُكَ = ghairuk"),
    phrases: [
      [0, 2, { de: "Gepriesen seist Du, o Allah, und Dir gebührt das Lob.", en: "Glory be to You, O Allah, and all praise.", tr: "Allah'ım! Seni tenzih ederim ve Sana hamdederim.", fr: "Gloire à Toi, ô Allah, et louange à Toi." }],
      [3, 4, { de: "Gesegnet ist Dein Name,", en: "Blessed is Your name,", tr: "Senin adın mübarektir,", fr: "Béni soit Ton nom," }],
      [5, 6, { de: "erhaben ist Deine Majestät,", en: "exalted is Your majesty,", tr: "şanın yücedir,", fr: "exaltée soit Ta majesté," }],
      [7, 9, { de: "und es gibt keinen Gott außer Dir.", en: "and there is no god but You.", tr: "Senden başka ilah yoktur.", fr: "et il n'y a de divinité que Toi." }],
    ],
    clips: [], // no verified recording yet – read-along mode
  },
  refuge: {
    words: w("أَعُوذُ = Aʿūdhu | بِاللَّهِ = billāhi | مِنَ = mina | الشَّيْطَانِ = sch-schaiṭāni | الرَّجِيمِ = r-radschīm"),
    phrases: [[0, 4, { de: "Ich suche Zuflucht bei Allah vor dem verfluchten Satan.", en: "I seek refuge in Allah from the accursed Satan.", tr: "Kovulmuş şeytanın şerrinden Allah'a sığınırım.", fr: "Je cherche refuge auprès d'Allah contre Satan le maudit." }]],
    clips: [{ url: EVERYAYAH("audhubillah.mp3"), words: [0, 4] }],
  },
  basmala: {
    words: w("بِسْمِ = Bismi | اللَّهِ = llāhi | الرَّحْمَٰنِ = r-raḥmāni | الرَّحِيمِ = r-raḥīm"),
    phrases: [[0, 3, { de: "Im Namen Allahs, des Allerbarmers, des Barmherzigen.", en: "In the name of Allah, the Most Gracious, the Most Merciful.", tr: "Rahman ve Rahim olan Allah'ın adıyla.", fr: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux." }]],
    clips: [{ url: EVERYAYAH("bismillah.mp3"), words: [0, 3] }],
  },
  ruku: {
    words: w("سُبْحَانَ = Subḥāna | رَبِّيَ = rabbiya | الْعَظِيمِ = l-ʿaẓīm"),
    phrases: [[0, 2, { de: "Gepriesen sei mein Herr, der Gewaltige.", en: "Glory be to my Lord, the Most Great.", tr: "Ulu Rabbimi tesbih ederim.", fr: "Gloire à mon Seigneur, le Très Grand." }]],
    clips: [], // no verified recording yet – read-along mode
  },
  rise: {
    words: w("سَمِعَ = Samiʿa | اللَّهُ = llāhu | لِمَنْ = liman | حَمِدَهُ = ḥamidah | رَبَّنَا = Rabbanā | وَلَكَ = wa-laka | الْحَمْدُ = l-ḥamd | حَمْدًا = ḥamdan | كَثِيرًا = kathīran | طَيِّبًا = ṭayyiban | مُبَارَكًا = mubārakan | فِيهِ = fīh"),
    phrases: [
      [0, 3, { de: "Allah hört den, der Ihn lobt.", en: "Allah hears whoever praises Him.", tr: "Allah kendisine hamdedeni işitir.", fr: "Allah entend celui qui Le loue." }],
      [4, 6, { de: "Unser Herr, Dir gebührt das Lob:", en: "Our Lord, to You belongs all praise:", tr: "Rabbimiz, hamd Sana mahsustur;", fr: "Notre Seigneur, à Toi la louange :" }],
      [7, 11, { de: "viel Lob, gutes und gesegnetes.", en: "abundant, good and blessed praise.", tr: "çok, temiz ve bereketli bir hamd.", fr: "une louange abondante, bonne et bénie." }],
    ],
    clips: [], // no verified recording yet – read-along mode
  },
  sujud: {
    words: w("سُبْحَانَ = Subḥāna | رَبِّيَ = rabbiya | الْأَعْلَىٰ = l-aʿlā"),
    phrases: [[0, 2, { de: "Gepriesen sei mein Herr, der Höchste.", en: "Glory be to my Lord, the Most High.", tr: "Yüce Rabbimi tesbih ederim.", fr: "Gloire à mon Seigneur, le Très-Haut." }]],
    clips: [], // no verified recording yet – read-along mode
  },
  jalsa: {
    words: w("رَبِّ = Rabbi | اغْفِرْ = ghfir | لِي = lī | رَبِّ = Rabbi | اغْفِرْ = ghfir | لِي = lī"),
    phrases: [
      [0, 2, { de: "Mein Herr, vergib mir.", en: "My Lord, forgive me.", tr: "Rabbim, beni bağışla.", fr: "Mon Seigneur, pardonne-moi." }],
      [3, 5, { de: "Mein Herr, vergib mir.", en: "My Lord, forgive me.", tr: "Rabbim, beni bağışla.", fr: "Mon Seigneur, pardonne-moi." }],
    ],
    clips: [], // no verified recording yet – read-along mode
  },
  tashahhud: {
    words: w("التَّحِيَّاتُ = At-taḥiyyātu | لِلَّهِ = lillāhi | وَالصَّلَوَاتُ = wa-ṣ-ṣalawātu | وَالطَّيِّبَاتُ = wa-ṭ-ṭayyibāt | السَّلَامُ = As-salāmu | عَلَيْكَ = ʿalaika | أَيُّهَا = ayyuha | النَّبِيُّ = n-nabiyyu | وَرَحْمَةُ = wa-raḥmatu | اللَّهِ = llāhi | وَبَرَكَاتُهُ = wa-barakātuh | السَّلَامُ = As-salāmu | عَلَيْنَا = ʿalainā | وَعَلَىٰ = wa-ʿalā | عِبَادِ = ʿibādi | اللَّهِ = llāhi | الصَّالِحِينَ = ṣ-ṣāliḥīn"),
    phrases: [
      [0, 3, { de: "Alle Grüße, Gebete und guten Worte gebühren Allah.", en: "All greetings, prayers and good words are for Allah.", tr: "Bütün dualar, ibadetler ve güzel sözler Allah'a aittir.", fr: "Les salutations, les prières et les bonnes œuvres sont à Allah." }],
      [4, 10, { de: "Friede sei mit dir, o Prophet, und die Barmherzigkeit Allahs und Sein Segen.", en: "Peace be upon you, O Prophet, and the mercy of Allah and His blessings.", tr: "Ey Peygamber! Allah'ın selamı, rahmeti ve bereketi senin üzerine olsun.", fr: "Que la paix soit sur toi, ô Prophète, ainsi que la miséricorde d'Allah et Ses bénédictions." }],
      [11, 16, { de: "Friede sei mit uns und mit den rechtschaffenen Dienern Allahs.", en: "Peace be upon us and upon the righteous servants of Allah.", tr: "Selam bizim üzerimize ve Allah'ın salih kulları üzerine olsun.", fr: "Que la paix soit sur nous et sur les pieux serviteurs d'Allah." }],
    ],
    clips: [], // no verified recording yet – read-along mode
  },
  shahada: {
    words: w("أَشْهَدُ = Aschhadu | أَنْ = an | لَا = lā | إِلَٰهَ = ilāha | إِلَّا = illa | اللَّهُ = llāh | وَأَشْهَدُ = wa-aschhadu | أَنَّ = anna | مُحَمَّدًا = Muḥammadan | عَبْدُهُ = ʿabduhū | وَرَسُولُهُ = wa-rasūluh"),
    phrases: [
      [0, 5, { de: "Ich bezeuge, dass es keinen Gott gibt außer Allah,", en: "I bear witness that there is no god but Allah,", tr: "Şahitlik ederim ki Allah'tan başka ilah yoktur", fr: "J'atteste qu'il n'y a de divinité qu'Allah" }],
      [6, 10, { de: "und ich bezeuge, dass Muhammad Sein Diener und Gesandter ist.", en: "and I bear witness that Muhammad is His servant and messenger.", tr: "ve yine şahitlik ederim ki Muhammed O'nun kulu ve elçisidir.", fr: "et j'atteste que Muhammad est Son serviteur et Son messager." }],
    ],
    cue: { word: 0, text: "☝️ Jetzt den rechten Zeigefinger heben" },
    clips: [], // no verified recording yet – read-along mode
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
    clips: [], // no verified recording yet – read-along mode
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
    clips: [],
  },
};

// ---- Is it obligatory? (main positions of the schools; Shia practice differs) --------------------
// pflicht: the prayer is invalid without it · wajib (Hanafi): if forgotten, prostration of forgetfulness
// sunnah: recommended – the prayer stays valid without it
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
