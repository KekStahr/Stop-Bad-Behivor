// "Gebet lernen": an animated figure shows each posture (left) with numbered highlights,
// the words appear in the original language, in Latin letters and in the chosen translation
// (right). Audio: real Quran recitation, other words through the system voice.
import { escapeHtml } from "../api.js";
import { openSheet } from "../ui.js";
import { motionLevel } from "../prefs.js";
import { faith } from "./state.js";
import { fetchScripture } from "./ui.js";

// ---- the figure ----------------------------------------------------------------------------------
// Side view, facing right (towards the Qibla / the altar). Joints in a 220 × 270 box.
const BASE = { head: [100, 52], neck: [100, 72], hip: [100, 150], knee: [101, 200], foot: [102, 250], toe: [120, 250] };
const POSES = {
  stand: { ...BASE, elbow: [104, 112], hand: [105, 150] },
  takbir: { ...BASE, elbow: [118, 92], hand: [112, 56] },
  qiyamNavel: { ...BASE, elbow: [116, 120], hand: [118, 142] },
  qiyamChest: { ...BASE, elbow: [116, 108], hand: [119, 116] },
  ruku: { eye: [5, 6], head: [178, 140], neck: [158, 142], hip: [98, 146], knee: [104, 198], foot: [102, 250], toe: [120, 250], elbow: [126, 172], hand: [108, 194] },
  sujud: { eye: [4, 7], head: [178, 238], neck: [154, 220], hip: [92, 196], knee: [118, 246], foot: [66, 250], toe: [58, 236], elbow: [154, 240], hand: [168, 248] },
  sit: { head: [92, 124], neck: [90, 144], hip: [80, 218], knee: [138, 244], foot: [70, 250], toe: [56, 247], elbow: [106, 194], hand: [130, 226] },
  tashahhud: { head: [92, 124], neck: [90, 144], hip: [80, 218], knee: [138, 244], foot: [70, 250], toe: [56, 247], elbow: [108, 194], hand: [133, 222], finger: true },
  salamR: { head: [97, 124], neck: [90, 144], hip: [80, 218], knee: [138, 244], foot: [70, 250], toe: [56, 247], elbow: [106, 194], hand: [130, 226], turn: 1, eye: [11, -1] },
  salamL: { head: [84, 124], neck: [90, 144], hip: [80, 218], knee: [138, 244], foot: [70, 250], toe: [56, 247], elbow: [106, 194], hand: [130, 226], turn: -1, eye: [-4, -3] },
  folded: { ...BASE, elbow: [112, 118], hand: [120, 100] },
  bow: { eye: [6, 2], head: [116, 60], neck: [106, 78], hip: [100, 150], knee: [101, 200], foot: [102, 250], toe: [120, 250], elbow: [113, 120], hand: [120, 106] },
  kneel: { head: [106, 98], neck: [106, 118], hip: [106, 194], knee: [120, 246], foot: [64, 250], toe: [56, 240], elbow: [118, 160], hand: [124, 142] },
  cross1: { ...BASE, elbow: [120, 90], hand: [108, 44] },
  cross2: { ...BASE, elbow: [120, 112], hand: [110, 100] },
  cross3: { ...BASE, elbow: [118, 98], hand: [94, 80] },
  cross4: { ...BASE, elbow: [120, 98], hand: [110, 82] },
};
POSES.qiyam = POSES.qiyamNavel;

// What to pay attention to in each posture: numbered rings on the figure + the same numbers in the text.
const FOCUS = {
  stand: [["head", "Blick auf die Stelle, an der die Stirn bei der Niederwerfung liegt."], ["foot", "Gerade stehen, Füße etwa eine Handbreit auseinander, Zehen zur Qibla."]],
  takbir: [["hand", "Hände heben, Handflächen zur Qibla, Daumen etwa auf Höhe der Ohrläppchen."], ["head", "Blick bleibt unten, auf dem Platz der Niederwerfung."]],
  qiyamNavel: [["hand", "Rechte Hand über die linke legen – unterhalb des Nabels (hanafitisch)."], ["head", "Ruhig stehen, Blick auf den Platz der Niederwerfung."]],
  qiyamChest: [["hand", "Rechte Hand über die linke legen – auf der Brust bzw. über dem Nabel."], ["head", "Ruhig stehen, Blick auf den Platz der Niederwerfung."]],
  ruku: [["neck", "Rücken gerade und waagerecht – Kopf in einer Linie mit dem Rücken, nicht hängen lassen."], ["hand", "Hände greifen die Knie, Finger leicht gespreizt."], ["knee", "Beine gestreckt, nicht einknicken."]],
  sujud: [["head", "Stirn UND Nase berühren den Boden."], ["hand", "Hände flach neben dem Kopf, Finger geschlossen zur Qibla."], ["knee", "Beide Knie am Boden."], ["toe", "Zehenspitzen aufgestellt, zur Qibla gerichtet."], ["elbow", "Ellbogen vom Boden abheben, nicht auflegen."]],
  sit: [["foot", "Auf dem linken Fuß sitzen, der rechte Fuß bleibt aufgestellt (Zehen zur Qibla)."], ["hand", "Hände ruhig auf den Oberschenkeln, nahe den Knien."], ["neck", "Aufrecht sitzen, kurz zur Ruhe kommen."]],
  tashahhud: [["finger", "Rechten Zeigefinger heben bei „Aschhadu an lā ilāha illa llāh“ – das Glaubenszeugnis. Die übrigen Finger bleiben geschlossen."], ["foot", "Sitzhaltung wie beim Sitzen zwischen den Niederwerfungen: auf dem linken Fuß, rechter Fuß aufgestellt."]],
  salamR: [["head", "Kopf nach rechts drehen, Blick über die rechte Schulter."]],
  salamL: [["head", "Kopf nach links drehen, Blick über die linke Schulter – das Gebet ist beendet."]],
  folded: [["hand", "Hände falten oder offen halten – wie es dir hilft, ruhig zu werden."]],
  bow: [["head", "Den Kopf leicht neigen – ein Zeichen der Ehrfurcht."]],
  kneel: [["knee", "Auf beiden Knien, Oberkörper aufrecht."], ["hand", "Hände gefaltet vor der Brust."]],
  cross1: [["hand", "Mit der rechten Hand die Stirn berühren …"]],
};

function figureSvg(ground) {
  return `
    <svg viewBox="0 0 220 270" class="learn-figure" aria-hidden="true">
      <defs><radialGradient id="learn-glow" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="#ffe7a8" stop-opacity="0.38"/><stop offset="100%" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient></defs>
      <rect x="0" y="0" width="220" height="270" fill="url(#learn-glow)"/>
      ${ground === "mat"
        ? '<rect x="24" y="250" width="176" height="9" rx="3" class="learn-mat"/><path d="M32 254.5h160" class="learn-mat-line"/><path d="M186 244l8 6-8 6" class="learn-qibla"/>'
        : '<rect x="24" y="250" width="176" height="5" rx="2" class="learn-floor"/>'}
      <line class="learn-guide" x1="0" y1="0" x2="0" y2="0"/>
      <g class="learn-body">
        <line data-limb="leg2a" class="is-back"/><line data-limb="leg2b" class="is-back"/>
        <line data-limb="arm2a" class="is-back"/><line data-limb="arm2b" class="is-back"/>
        <path data-limb="robe" class="learn-robe"/>
        <line data-limb="torso"/><line data-limb="thigh"/><line data-limb="shin"/><line data-limb="sole"/>
        <line data-limb="upper"/><line data-limb="fore"/><line data-limb="finger"/>
        <circle data-limb="palm" r="5.5"/>
        <circle data-limb="head" r="15"/>
        <circle data-limb="eye" r="2" class="learn-eye"/>
      </g>
      <g class="learn-marks"></g>
    </svg>`;
}

const lerp = (a, b, t) => a + (b - a) * t;
const shoulderOf = (pose) => [lerp(pose.neck[0], pose.hip[0], 0.12), lerp(pose.neck[1], pose.hip[1], 0.12)];
const fingerTip = (pose) => (pose.finger ? [pose.hand[0] + 12, pose.hand[1] - 24] : pose.hand);

function applyPose(svg, pose) {
  const set = (name, from, to) => {
    const line = svg.querySelector(`[data-limb="${name}"]`);
    line.setAttribute("x1", from[0]); line.setAttribute("y1", from[1]);
    line.setAttribute("x2", to[0]); line.setAttribute("y2", to[1]);
  };
  const shoulder = shoulderOf(pose);
  set("torso", pose.neck, pose.hip);
  set("thigh", pose.hip, pose.knee);
  set("shin", pose.knee, pose.foot);
  set("sole", pose.foot, pose.toe);
  set("upper", shoulder, pose.elbow);
  set("fore", pose.elbow, pose.hand);
  const off = 6; // the second arm and leg, a little behind
  set("leg2a", [pose.hip[0] - off, pose.hip[1]], [pose.knee[0] - off, pose.knee[1]]);
  set("leg2b", [pose.knee[0] - off, pose.knee[1]], [pose.foot[0] - off, pose.foot[1]]);
  set("arm2a", [shoulder[0] - off, shoulder[1]], [pose.elbow[0] - off, pose.elbow[1]]);
  set("arm2b", [pose.elbow[0] - off, pose.elbow[1]], [pose.hand[0] - off, pose.hand[1]]);
  set("finger", pose.hand, fingerTip(pose));
  // a simple garment from the shoulders over the hip
  const dx = pose.hip[0] - pose.neck[0];
  const dy = pose.hip[1] - pose.neck[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 11;
  const ny = (dx / len) * 11;
  const hem = [lerp(pose.hip[0], pose.knee[0], 0.7), lerp(pose.hip[1], pose.knee[1], 0.7)];
  svg.querySelector('[data-limb="robe"]').setAttribute("d", `M${pose.neck[0] + nx * 0.7} ${pose.neck[1] + ny * 0.7} L${pose.hip[0] + nx * 1.2} ${pose.hip[1] + ny * 1.2} L${hem[0] + nx * 0.85} ${hem[1] + ny * 0.85} L${hem[0] - nx * 0.85} ${hem[1] - ny * 0.85} L${pose.hip[0] - nx * 1.2} ${pose.hip[1] - ny * 1.2} L${pose.neck[0] - nx * 0.7} ${pose.neck[1] - ny * 0.7} Z`);
  const palm = svg.querySelector('[data-limb="palm"]');
  palm.setAttribute("cx", pose.hand[0]);
  palm.setAttribute("cy", pose.hand[1]);
  const head = svg.querySelector('[data-limb="head"]');
  head.setAttribute("cx", pose.head[0]);
  head.setAttribute("cy", pose.head[1]);
  // the eye shows where the face looks (during the salām it moves towards the shoulder)
  const [ex, ey] = pose.eye || [7, -3];
  const eye = svg.querySelector('[data-limb="eye"]');
  eye.setAttribute("cx", pose.head[0] + ex);
  eye.setAttribute("cy", pose.head[1] + ey);
}

function pointOf(pose, joint) {
  if (joint === "finger") return fingerTip(pose);
  if (joint === "neck") return [lerp(pose.neck[0], pose.hip[0], 0.45), lerp(pose.neck[1], pose.hip[1], 0.45)];
  return pose[joint];
}

function drawMarks(svg, poseName, pose) {
  const layer = svg.querySelector(".learn-marks");
  const focus = FOCUS[poseName] || [];
  layer.innerHTML = focus.map(([joint], index) => {
    const [x, y] = pointOf(pose, joint);
    return `<g class="learn-mark" style="animation-delay:${index * 140}ms"><circle cx="${x}" cy="${y}" r="11" class="learn-ring"/><circle cx="${x + 13}" cy="${y - 13}" r="8" class="learn-badge"/><text x="${x + 13}" y="${y - 10}" class="learn-num">${index + 1}</text></g>`;
  }).join("");
  // a helper line for the most important detail
  const guide = svg.querySelector(".learn-guide");
  const lines = { ruku: [pose.hip, [pose.head[0] + 14, pose.hip[1] - 2]], stand: [pose.head, [168, 250]], qiyam: [pose.head, [168, 250]], qiyamNavel: [pose.head, [168, 250]], qiyamChest: [pose.head, [168, 250]], takbir: [pose.head, [168, 250]] };
  const line = lines[poseName];
  guide.style.display = line ? "" : "none";
  if (line) {
    guide.setAttribute("x1", line[0][0]); guide.setAttribute("y1", line[0][1]);
    guide.setAttribute("x2", line[1][0]); guide.setAttribute("y2", line[1][1]);
  }
}

function animator(svg) {
  let current = POSES.stand;
  let frame;
  applyPose(svg, current);
  return (name, duration = 900) => {
    const target = POSES[name] || POSES.stand;
    cancelAnimationFrame(frame);
    svg.querySelector(".learn-marks").innerHTML = "";
    svg.querySelector(".learn-guide").style.display = "none";
    const finish = () => {
      current = target;
      applyPose(svg, current);
      drawMarks(svg, name, target);
    };
    if (motionLevel() === "off") return finish();
    const from = current;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const pose = {};
      for (const key of Object.keys(target)) {
        pose[key] = Array.isArray(target[key]) ? [lerp((from[key] || target[key])[0], target[key][0], ease), lerp((from[key] || target[key])[1], target[key][1], ease)] : t > 0.6 ? target[key] : from[key];
      }
      applyPose(svg, pose);
      if (t < 1) frame = requestAnimationFrame(step);
      else finish();
    };
    frame = requestAnimationFrame(step);
    return undefined;
  };
}

// ---- audio ---------------------------------------------------------------------------------------
const VOICE_LANG = { de: "de-DE", en: "en-US", tr: "tr-TR", fr: "fr-FR", ar: "ar" };
function voiceFor(lang) {
  const voices = window.speechSynthesis?.getVoices() || [];
  const wanted = VOICE_LANG[lang] || lang;
  return voices.find((voice) => voice.lang === wanted) || voices.find((voice) => voice.lang.startsWith(wanted.slice(0, 2)));
}
function speak(text, lang, rate = 0.85) {
  return new Promise((resolve) => {
    const voice = voiceFor(lang);
    if (!window.speechSynthesis || !voice || !text) return resolve(false);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = rate;
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    window.speechSynthesis.speak(utterance);
    return undefined;
  });
}

// ---- texts ---------------------------------------------------------------------------------------
const LANGS = [["de", "Deutsch"], ["en", "English"], ["tr", "Türkçe"], ["fr", "Français"]];
const QURAN_EDITION = { de: "de.bubenheim", en: "en.sahih", tr: "tr.diyanet", fr: "fr.hamidullah" };

// short suras to choose from after the Fātiḥa (sorted by length)
const SHORT_SURAS = [
  { surah: 103, name: "Al-ʿAṣr (Die Zeit)", translit: "Wal-ʿaṣr. Inna l-insāna la-fī chusr. Illa lladhīna āmanū wa ʿamilu ṣ-ṣāliḥāti wa tawāṣau bil-ḥaqqi wa tawāṣau biṣ-ṣabr." },
  { surah: 108, name: "Al-Kauthar (Die Fülle)", translit: "Innā aʿṭaināka l-kauthar. Fa-ṣalli li-rabbika wa-nḥar. Inna schāniʾaka huwa l-abtar." },
  { surah: 112, name: "Al-Ichlāṣ (Die Aufrichtigkeit)", translit: "Qul huwa llāhu aḥad. Allāhu ṣ-ṣamad. Lam yalid wa lam yūlad. Wa lam yakun lahū kufuwan aḥad." },
  { surah: 110, name: "An-Naṣr (Die Hilfe)", translit: "Idhā dschāʾa naṣru llāhi wa l-fatḥ. Wa raʾaita n-nāsa yadchulūna fī dīni llāhi afwādschā. Fa-sabbiḥ bi-ḥamdi rabbika wa-staghfirh, innahū kāna tawwābā." },
  { surah: 106, name: "Quraisch", translit: "Li-īlāfi quraisch. Īlāfihim riḥlata sch-schitāʾi wa ṣ-ṣaif. Fal-yaʿbudū rabba hādha l-bait. Alladhī aṭʿamahum min dschūʿin wa āmanahum min chauf." },
  { surah: 113, name: "Al-Falaq (Das Morgengrauen)", translit: "Qul aʿūdhu bi-rabbi l-falaq. Min scharri mā chalaq. Wa min scharri ghāsiqin idhā waqab. Wa min scharri n-naffāthāti fi l-ʿuqad. Wa min scharri ḥāsidin idhā ḥasad." },
  { surah: 114, name: "An-Nās (Die Menschen)", translit: "Qul aʿūdhu bi-rabbi n-nās. Maliki n-nās. Ilāhi n-nās. Min scharri l-waswāsi l-channās. Alladhī yuwaswisu fī ṣudūri n-nās. Mina l-dschinnati wa n-nās." },
  { surah: 105, name: "Al-Fīl (Der Elefant)", translit: "A-lam tara kaifa faʿala rabbuka bi-aṣḥābi l-fīl. A-lam yadschʿal kaidahum fī taḍlīl. Wa arsala ʿalaihim ṭairan abābīl. Tarmīhim bi-ḥidschāratin min siddschīl. Fa-dschaʿalahum ka-ʿaṣfin maʾkūl." },
  { surah: 109, name: "Al-Kāfirūn (Die Ungläubigen)", translit: "Qul yā ayyuha l-kāfirūn. Lā aʿbudu mā taʿbudūn. Wa lā antum ʿābidūna mā aʿbud. Wa lā ana ʿābidun mā ʿabattum. Wa lā antum ʿābidūna mā aʿbud. Lakum dīnukum wa liya dīn." },
  { surah: 107, name: "Al-Māʿūn (Die Hilfeleistung)", translit: "A-raʾaita lladhī yukadhdhibu bi-d-dīn. Fa-dhālika lladhī yaduʿʿu l-yatīm. Wa lā yaḥuḍḍu ʿalā ṭaʿāmi l-miskīn. Fa-wailun lil-muṣallīn. Alladhīna hum ʿan ṣalātihim sāhūn. Alladhīna hum yurāʾūn. Wa yamnaʿūna l-māʿūn." },
];

const PRAYER_TYPES = [
  { id: "fajr", label: "Fadschr – 2 Rakʿāt", rakat: 2 },
  { id: "dhuhr", label: "Dhuhr – 4 Rakʿāt", rakat: 4 },
  { id: "asr", label: "Asr – 4 Rakʿāt", rakat: 4 },
  { id: "maghrib", label: "Maghrib – 3 Rakʿāt", rakat: 3 },
  { id: "isha", label: "Ischa – 4 Rakʿāt", rakat: 4 },
];
const SALAH = {
  opening: { pose: "qiyam", title: "Eröffnungs-Bittgebet (Thanāʾ)", arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَٰهَ غَيْرُكَ", translit: "Subḥānaka llāhumma wa bi-ḥamdika, wa tabāraka smuka, wa taʿālā dschadduka, wa lā ilāha ghairuk.", tr: { de: "Gepriesen seist Du, o Allah, und Dir gebührt das Lob. Gesegnet ist Dein Name, erhaben ist Deine Majestät, und es gibt keinen Gott außer Dir.", en: "Glory be to You, O Allah, and all praise. Blessed is Your name, exalted is Your majesty, and there is no god but You.", tr: "Allah'ım! Seni her türlü eksiklikten tenzih ederim ve Sana hamdederim. Senin adın mübarektir, şanın yücedir. Senden başka ilah yoktur.", fr: "Gloire à Toi, ô Allah, et louange à Toi. Béni soit Ton nom, exaltée soit Ta majesté, et il n'y a de divinité que Toi." }, note: "Nach hanafitischer Praxis – andere Rechtsschulen sprechen hier andere Eröffnungs-Bittgebete." },
  refuge: { pose: "qiyam", title: "Zuflucht und Basmala", arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ ۝ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translit: "Aʿūdhu billāhi mina sch-schaiṭāni r-radschīm. Bismillāhi r-raḥmāni r-raḥīm.", tr: { de: "Ich suche Zuflucht bei Allah vor dem verfluchten Satan. Im Namen Allahs, des Allerbarmers, des Barmherzigen.", en: "I seek refuge in Allah from the accursed Satan. In the name of Allah, the Most Gracious, the Most Merciful.", tr: "Kovulmuş şeytanın şerrinden Allah'a sığınırım. Rahman ve Rahim olan Allah'ın adıyla.", fr: "Je cherche refuge auprès d'Allah contre Satan le maudit. Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux." } },
  fatiha: { pose: "qiyam", title: "Al-Fātiḥa", surah: 1, translit: "Bismillāhi r-raḥmāni r-raḥīm. Al-ḥamdu lillāhi rabbi l-ʿālamīn. Ar-raḥmāni r-raḥīm. Māliki yaumi d-dīn. Iyyāka naʿbudu wa iyyāka nastaʿīn. Ihdinā ṣ-ṣirāṭa l-mustaqīm. Ṣirāṭa lladhīna anʿamta ʿalaihim, ghairi l-maghḍūbi ʿalaihim wa la ḍ-ḍāllīn. – Āmīn.", note: "Die Fātiḥa wird in jeder Rakʿa rezitiert. Danach leise „Āmīn“." },
  ikhlas: { pose: "qiyam", title: "Eine kurze Sure: Al-Ichlāṣ", surah: 112, translit: "Qul huwa llāhu aḥad. Allāhu ṣ-ṣamad. Lam yalid wa lam yūlad. Wa lam yakun lahū kufuwan aḥad.", note: "In den ersten beiden Rakʿāt folgt nach der Fātiḥa eine weitere Sure – jede kurze Sure ist möglich." },
  ruku: { pose: "ruku", title: "Rukūʿ – die Verbeugung", arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ", translit: "Subḥāna rabbiya l-ʿaẓīm.", repeat: 3, tr: { de: "Gepriesen sei mein Herr, der Gewaltige.", en: "Glory be to my Lord, the Most Great.", tr: "Ulu Rabbimi tesbih ederim.", fr: "Gloire à mon Seigneur, le Très Grand." }, note: "„Allāhu akbar“ sagen und mit geradem Rücken verbeugen, die Hände auf den Knien." },
  rise: { pose: "stand", title: "Iʿtidāl – Aufrichten", arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ ۝ رَبَّنَا وَلَكَ الْحَمْدُ", translit: "Samiʿa llāhu liman ḥamidah. – Rabbanā wa laka l-ḥamd.", tr: { de: "Allah hört den, der Ihn lobt. – Unser Herr, Dir gebührt das Lob.", en: "Allah hears whoever praises Him. – Our Lord, to You belongs all praise.", tr: "Allah kendisine hamdedeni işitir. – Rabbimiz, hamd Sana mahsustur.", fr: "Allah entend celui qui Le loue. – Notre Seigneur, à Toi la louange." } },
  sujud: { pose: "sujud", title: "Sudschūd – die Niederwerfung", arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَىٰ", translit: "Subḥāna rabbiya l-aʿlā.", repeat: 3, tr: { de: "Gepriesen sei mein Herr, der Höchste.", en: "Glory be to my Lord, the Most High.", tr: "Yüce Rabbimi tesbih ederim.", fr: "Gloire à mon Seigneur, le Très-Haut." }, note: "„Allāhu akbar“ – Stirn, Nase, Hände, Knie und Zehen berühren den Boden. Hier bist du Allah am nächsten." },
  jalsa: { pose: "sit", title: "Sitzen zwischen den Niederwerfungen", arabic: "رَبِّ اغْفِرْ لِي", translit: "Rabbi ghfir lī.", repeat: 2, tr: { de: "Mein Herr, vergib mir.", en: "My Lord, forgive me.", tr: "Rabbim, beni bağışla.", fr: "Mon Seigneur, pardonne-moi." } },
  tashahhud: { pose: "tashahhud", title: "Taschahhud – das Glaubenszeugnis", arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَىٰ عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ", translit: "At-taḥiyyātu lillāhi wa ṣ-ṣalawātu wa ṭ-ṭayyibāt. As-salāmu ʿalaika ayyuha n-nabiyyu wa raḥmatu llāhi wa barakātuh. As-salāmu ʿalainā wa ʿalā ʿibādi llāhi ṣ-ṣāliḥīn. Aschhadu an lā ilāha illa llāh, wa aschhadu anna Muḥammadan ʿabduhū wa rasūluh.", tr: { de: "Alle Grüße, Gebete und guten Worte gebühren Allah. Friede sei mit dir, o Prophet, und die Barmherzigkeit Allahs und Sein Segen. Friede sei mit uns und mit den rechtschaffenen Dienern Allahs. Ich bezeuge, dass es keinen Gott gibt außer Allah, und ich bezeuge, dass Muhammad Sein Diener und Gesandter ist.", en: "All greetings, prayers and good words are for Allah. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous servants of Allah. I bear witness that there is no god but Allah, and I bear witness that Muhammad is His servant and messenger.", tr: "Bütün dualar, ibadetler ve güzel sözler Allah'a aittir. Ey Peygamber! Allah'ın selamı, rahmeti ve bereketi senin üzerine olsun. Selam bizim üzerimize ve Allah'ın salih kulları üzerine olsun. Şahitlik ederim ki Allah'tan başka ilah yoktur ve yine şahitlik ederim ki Muhammed O'nun kulu ve elçisidir.", fr: "Les salutations, les prières et les bonnes œuvres sont à Allah. Que la paix soit sur toi, ô Prophète, ainsi que la miséricorde d'Allah et Ses bénédictions. Que la paix soit sur nous et sur les pieux serviteurs d'Allah. J'atteste qu'il n'y a de divinité qu'Allah et j'atteste que Muhammad est Son serviteur et Son messager." }, note: "Beim Glaubenszeugnis wird der rechte Zeigefinger angehoben." },
  salawat: { pose: "sit", title: "Ṣalawāt Ibrāhīmiyya", arabic: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ", translit: "Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā ṣallaita ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka ḥamīdun madschīd. Allāhumma bārik ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā bārakta ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka ḥamīdun madschīd.", tr: { de: "O Allah, segne Muhammad und die Familie Muhammads, wie Du Ibrahim und die Familie Ibrahims gesegnet hast. Du bist der Lobenswerte, der Ruhmreiche. O Allah, schenke Muhammad und der Familie Muhammads Gnade, wie Du Ibrahim und der Familie Ibrahims Gnade geschenkt hast. Du bist der Lobenswerte, der Ruhmreiche.", en: "O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim; You are Praiseworthy, Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim; You are Praiseworthy, Glorious.", tr: "Allah'ım! İbrahim'e ve İbrahim'in ailesine rahmet ettiğin gibi Muhammed'e ve Muhammed'in ailesine de rahmet eyle. Şüphesiz Sen övülmeye layıksın, şanı yücesin. Allah'ım! İbrahim'e ve İbrahim'in ailesine bereket verdiğin gibi Muhammed'e ve Muhammed'in ailesine de bereket ver. Şüphesiz Sen övülmeye layıksın, şanı yücesin.", fr: "Ô Allah, prie sur Muhammad et sur la famille de Muhammad comme Tu as prié sur Ibrahim et sur la famille d'Ibrahim ; Tu es certes Digne de louange et de gloire. Ô Allah, bénis Muhammad et la famille de Muhammad comme Tu as béni Ibrahim et la famille d'Ibrahim ; Tu es certes Digne de louange et de gloire." } },
};
const takbir = (title, pose, note) => ({ pose, title, arabic: "اللَّهُ أَكْبَرُ", translit: "Allāhu akbar.", tr: { de: "Allah ist größer.", en: "Allah is the Greatest.", tr: "Allah en büyüktür.", fr: "Allah est le plus grand." }, note });
const salam = (side) => ({ pose: side === "right" ? "salamR" : "salamL", title: `Friedensgruß nach ${side === "right" ? "rechts" : "links"}`, arabic: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ", translit: "As-salāmu ʿalaikum wa raḥmatu llāh.", tr: { de: "Friede sei mit euch und die Barmherzigkeit Allahs.", en: "Peace be upon you and the mercy of Allah.", tr: "Allah'ın selamı ve rahmeti üzerinize olsun.", fr: "Que la paix et la miséricorde d'Allah soient sur vous." }, note: side === "right" ? "Den Kopf nach rechts drehen." : "Den Kopf nach links drehen – das Gebet ist beendet." });


const OUR_FATHER = [
  { latin: "Pater noster, qui es in caelis,", greek: "Πάτερ ἡμῶν ὁ ἐν τοῖς οὐρανοῖς·", translit: "Páter hēmṓn ho en toîs ouranoîs;", tr: { de: "Vater unser im Himmel,", en: "Our Father, who art in heaven,", tr: "Göklerdeki Babamız,", fr: "Notre Père, qui es aux cieux," } },
  { latin: "sanctificetur nomen tuum.", greek: "ἁγιασθήτω τὸ ὄνομά σου·", translit: "hagiasthḗtō tò ónomá sou;", tr: { de: "geheiligt werde dein Name.", en: "hallowed be thy name;", tr: "adın kutsal kılınsın.", fr: "que ton nom soit sanctifié," } },
  { latin: "Adveniat regnum tuum. Fiat voluntas tua, sicut in caelo et in terra.", greek: "ἐλθέτω ἡ βασιλεία σου· γενηθήτω τὸ θέλημά σου, ὡς ἐν οὐρανῷ καὶ ἐπὶ γῆς·", translit: "elthétō hē basileía sou; genēthḗtō tò thélēmá sou, hōs en ouranṓi kaì epì gês;", tr: { de: "Dein Reich komme. Dein Wille geschehe, wie im Himmel, so auf Erden.", en: "thy kingdom come; thy will be done on earth as it is in heaven.", tr: "Egemenliğin gelsin. Gökte olduğu gibi, yeryüzünde de Senin istediğin olsun.", fr: "que ton règne vienne, que ta volonté soit faite sur la terre comme au ciel." } },
  { latin: "Panem nostrum quotidianum da nobis hodie,", greek: "τὸν ἄρτον ἡμῶν τὸν ἐπιούσιον δὸς ἡμῖν σήμερον·", translit: "tòn árton hēmṓn tòn epioúsion dòs hēmîn sḗmeron;", tr: { de: "Unser tägliches Brot gib uns heute.", en: "Give us this day our daily bread;", tr: "Gündelik ekmeğimizi bugün bize ver.", fr: "Donne-nous aujourd'hui notre pain de ce jour." } },
  { latin: "et dimitte nobis debita nostra, sicut et nos dimittimus debitoribus nostris.", greek: "καὶ ἄφες ἡμῖν τὰ ὀφειλήματα ἡμῶν, ὡς καὶ ἡμεῖς ἀφίεμεν τοῖς ὀφειλέταις ἡμῶν·", translit: "kaì áphes hēmîn tà opheilḗmata hēmṓn, hōs kaì hēmeîs aphíemen toîs opheilétais hēmṓn;", tr: { de: "Und vergib uns unsere Schuld, wie auch wir vergeben unsern Schuldigern.", en: "and forgive us our trespasses, as we forgive those who trespass against us;", tr: "Bize karşı suç işleyenleri bağışladığımız gibi, Sen de bizim suçlarımızı bağışla.", fr: "Pardonne-nous nos offenses, comme nous pardonnons aussi à ceux qui nous ont offensés." } },
  { latin: "Et ne nos inducas in tentationem, sed libera nos a malo.", greek: "καὶ μὴ εἰσενέγκῃς ἡμᾶς εἰς πειρασμόν, ἀλλὰ ῥῦσαι ἡμᾶς ἀπὸ τοῦ πονηροῦ.", translit: "kaì mḕ eisenénkēis hēmâs eis peirasmón, allà rhŷsai hēmâs apò toû ponēroû.", tr: { de: "Und führe uns nicht in Versuchung, sondern erlöse uns von dem Bösen.", en: "and lead us not into temptation, but deliver us from evil.", tr: "Bizi ayartılmaya uğratma, kötü olandan kurtar.", fr: "Et ne nous laisse pas entrer en tentation, mais délivre-nous du Mal." } },
  { latin: "Quia tuum est regnum, et potestas, et gloria in saecula. Amen.", greek: "ὅτι σοῦ ἐστιν ἡ βασιλεία καὶ ἡ δύναμις καὶ ἡ δόξα εἰς τοὺς αἰῶνας. ἀμήν.", translit: "hóti soû estin hē basileía kaì hē dýnamis kaì hē dóxa eis toùs aiônas. amḗn.", tr: { de: "Denn dein ist das Reich und die Kraft und die Herrlichkeit in Ewigkeit. Amen.", en: "For thine is the kingdom, and the power, and the glory, for ever and ever. Amen.", tr: "Çünkü egemenlik, güç ve yücelik sonsuzlara dek Senindir. Amin.", fr: "Car c'est à toi qu'appartiennent le règne, la puissance et la gloire, aux siècles des siècles. Amen." } },
];
const CROSS = { latin: "In nomine Patris et Filii et Spiritus Sancti. Amen.", greek: "Εἰς τὸ ὄνομα τοῦ Πατρὸς καὶ τοῦ Υἱοῦ καὶ τοῦ Ἁγίου Πνεύματος. Ἀμήν.", translit: "Eis tò ónoma toû Patròs kaì toû Hyioû kaì toû Hagíou Pneúmatos. Amḗn.", tr: { de: "Im Namen des Vaters und des Sohnes und des Heiligen Geistes. Amen.", en: "In the name of the Father, and of the Son, and of the Holy Spirit. Amen.", tr: "Baba, Oğul ve Kutsal Ruh'un adıyla. Amin.", fr: "Au nom du Père, et du Fils, et du Saint-Esprit. Amen." } };


const NIYYA = { fajr: "Fadschr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Ischa" };

function salahSteps(tradition, prayer, suras) {
  const handsDown = tradition === "shia-jafari" || tradition === "sunni-maliki";
  const qiyamPose = handsDown ? "stand" : tradition === "sunni-hanafi" ? "qiyamNavel" : "qiyamChest";
  const stand = (step) => (step.pose === "qiyam" ? { ...step, pose: qiyamPose } : step);
  const sura = (number, rakah) => {
    const chosen = SHORT_SURAS.find((item) => item.surah === number) || SHORT_SURAS[0];
    return { ...SALAH.ikhlas, title: `Eine Sure: ${chosen.name}`, surah: chosen.surah, translit: chosen.translit, note: `In den ersten beiden Rakʿāt folgt nach der Fātiḥa eine weitere Sure. Du kannst sie oben auswählen (Rakʿa ${rakah}).` };
  };
  const basmala = { ...SALAH.refuge, title: "Basmala", arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translit: "Bismillāhi r-raḥmāni r-raḥīm.", tr: { de: "Im Namen Allahs, des Allerbarmers, des Barmherzigen.", en: "In the name of Allah, the Most Gracious, the Most Merciful.", tr: "Rahman ve Rahim olan Allah'ın adıyla.", fr: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux." } };
  const steps = [
    { pose: "stand", title: "Absicht (Niyya)", text: `Steh zur Qibla gewandt. Fasse im Herzen die Absicht: „Ich bete das ${NIYYA[prayer.id]}-Gebet – ${prayer.rakat} Rakʿāt – für Allah.“`, note: "Die Absicht muss nicht laut gesprochen werden." },
    takbir("Takbīr – das Gebet beginnt", "takbir", "Ab jetzt gehört deine ganze Aufmerksamkeit dem Gebet."),
    stand({ ...SALAH.opening, rakah: 1 }),
    stand({ ...SALAH.refuge, rakah: 1 }),
  ];
  for (let rakah = 1; rakah <= prayer.rakat; rakah += 1) {
    if (rakah > 1) steps.push({ ...takbir(`Aufstehen zur ${rakah}. Rakʿa`, "stand", "Mit „Allāhu akbar“ wieder aufstehen."), rakah });
    if (rakah > 1) steps.push(stand({ ...basmala, rakah }));
    steps.push(stand({ ...SALAH.fatiha, rakah }));
    if (rakah <= 2) steps.push(stand({ ...sura(suras[rakah - 1], rakah), rakah }));
    else steps.at(-1).note = "In der 3. und 4. Rakʿa wird nur die Fātiḥa rezitiert – keine weitere Sure.";
    steps.push({ ...SALAH.ruku, rakah }, { ...SALAH.rise, rakah }, { ...SALAH.sujud, rakah }, { ...SALAH.jalsa, rakah }, { ...SALAH.sujud, title: "Zweite Niederwerfung", rakah });
    if (rakah === 2 && prayer.rakat > 2) {
      steps.push({ ...SALAH.tashahhud, title: "Erstes Sitzen – Taschahhud", note: "Nach der 2. Rakʿa nur das Taschahhud sprechen, dann zur nächsten Rakʿa aufstehen. Zeigefinger beim Glaubenszeugnis heben.", rakah });
    }
  }
  steps.push({ ...SALAH.tashahhud, title: "Letztes Sitzen – Taschahhud", rakah: prayer.rakat }, { ...SALAH.salawat, rakah: prayer.rakat }, salam("right"), salam("left"));
  return steps;
}

function christianSteps(tradition) {
  const crossNote = tradition === "orthodox" ? "Stirn – Brust – rechte Schulter – linke Schulter (Daumen, Zeige- und Mittelfinger zusammen)." : "Stirn – Brust – linke Schulter – rechte Schulter.";
  return [
    { pose: "cross1", cross: true, title: "Das Kreuzzeichen", line: CROSS, note: `${crossNote}${tradition === "protestant" || tradition === "free" ? " In evangelischen Gemeinden ist das Kreuzzeichen möglich, aber freiwillig." : ""}` },
    { pose: "folded", title: "Still werden", text: "Falte die Hände, atme ruhig. Du stehst vor Gott – so wie du bist.", note: "Viele beten im Stehen, andere knien – beides ist gut." },
    ...OUR_FATHER.map((line, index) => ({ pose: index === 6 ? "bow" : "kneel", title: index === 6 ? "Lobpreis" : `Vaterunser – Bitte ${index + 1}`, line, note: index === 6 && tradition === "catholic" ? "In der katholischen Messe folgt der Lobpreis nach einem Einschub des Priesters." : index === 0 ? "Jesus selbst hat seine Jünger dieses Gebet gelehrt (Matthäus 6,9–13)." : "" })),
    { pose: "cross1", cross: true, title: "Abschluss", line: CROSS, note: "Mit dem Kreuzzeichen oder einem stillen Amen endet das Gebet." },
  ];
}

// ---- the sheet ------------------------------------------------------------------------------------
export function openLearn(religion) {
  const tradition = religion === "islam" ? faith().islamTradition : faith().christianTradition;
  let prayer = PRAYER_TYPES[0];
  let suras = [103, 108]; // the two shortest suras by default – the prayer is learned quickly
  let steps = religion === "islam" ? salahSteps(tradition, prayer, suras) : christianSteps(tradition);
  const textCache = {};
  const audioCache = {};
  let index = 0;
  let lang = (navigator.language || "de").slice(0, 2);
  if (!LANGS.some(([id]) => id === lang)) lang = "de";
  let original = tradition === "orthodox" ? "greek" : "latin";
  let show = { original: true, translit: true, translation: true };
  let playing = false;
  let sound = true;
  let timer;
  let crossTimer;
  let audio = null;
  let run = 0; // invalidates pending playback when the step changes

  const stopSound = () => {
    audio?.pause();
    audio = null;
    window.speechSynthesis?.cancel();
  };
  const { dialog } = openSheet({
    title: religion === "islam" ? "Gebet lernen – die Ṣalāh" : "Gebet lernen – das Vaterunser",
    wide: true,
    onClose: () => { playing = false; clearTimeout(timer); clearInterval(crossTimer); stopSound(); },
    body: `
      <div class="learn">
        <div class="learn-stage">
          <div class="learn-pose-name" id="learn-pose-name"></div>
          ${figureSvg(religion === "islam" ? "mat" : "floor")}
          <div class="learn-progress" id="learn-progress"></div>
          <div class="learn-transport">
            <button class="icon-button" id="learn-prev" type="button" aria-label="Zurück" title="Zurück (←)">⏮</button>
            <button class="learn-play" id="learn-play" type="button" aria-label="Abspielen">▶</button>
            <button class="icon-button" id="learn-next" type="button" aria-label="Weiter" title="Weiter (→)">⏭</button>
            <button class="icon-button" id="learn-sound" type="button" aria-label="Ton an/aus" title="Ton an/aus">🔊</button>
          </div>
        </div>
        <div class="learn-text">
          <div class="learn-options">
            ${religion === "islam" ? `
              <label class="reader-field"><span>Gebet</span><select id="learn-prayer">${PRAYER_TYPES.map((item) => `<option value="${item.id}">${item.label}</option>`).join("")}</select></label>
              <label class="reader-field"><span>Sure in Rakʿa 1</span><select data-sura="0">${SHORT_SURAS.map((item) => `<option value="${item.surah}" ${item.surah === suras[0] ? "selected" : ""}>${item.name}</option>`).join("")}</select></label>
              <label class="reader-field"><span>Sure in Rakʿa 2</span><select data-sura="1">${SHORT_SURAS.map((item) => `<option value="${item.surah}" ${item.surah === suras[1] ? "selected" : ""}>${item.name}</option>`).join("")}</select></label>` : `
              <label class="reader-field"><span>Ursprache</span><select id="learn-original"><option value="greek" ${original === "greek" ? "selected" : ""}>Griechisch (Urtext)</option><option value="latin" ${original === "latin" ? "selected" : ""}>Latein</option></select></label>`}
            <label class="reader-field"><span>Übersetzung</span><select id="learn-lang">${LANGS.map(([id, label]) => `<option value="${id}" ${id === lang ? "selected" : ""}>${label}</option>`).join("")}</select></label>
            <span class="learn-toggles">
              <label><input type="checkbox" data-show="original" checked> ${religion === "islam" ? "Arabisch" : "Ursprache"}</label>
              <label><input type="checkbox" data-show="translit" checked> Umschrift</label>
              <label><input type="checkbox" data-show="translation" checked> Übersetzung</label>
            </span>
          </div>
          <div id="learn-step" class="learn-step" aria-live="polite"></div>
          ${religion === "islam" && tradition === "shia-jafari" ? '<p class="muted small">Hinweis: Die Anleitung folgt der verbreiteten sunnitischen Form. In der schiitischen Praxis gibt es Unterschiede (z. B. Hände an den Seiten, Qunūt in der 2. Rakʿa, eigener Wortlaut des Taschahhud, Niederwerfung auf natürlichem Material). Lerne die Details am besten mit deinem Imam.</p>' : religion === "islam" ? '<p class="muted small">Zum Lernen gedacht – Details unterscheiden sich je nach Rechtsschule. Frag im Zweifel deinen Imam.</p>' : ""}
          <p class="muted small" id="learn-voice-hint" hidden></p>
        </div>
      </div>`,
  });
  const svg = dialog.querySelector(".learn-figure");
  const moveTo = animator(svg);

  async function quranText(surah) {
    const key = `${surah}:${lang}`;
    if (!textCache[key]) {
      const result = await fetchScripture("quran", `/v1/surah/${surah}/editions/quran-uthmani,${QURAN_EDITION[lang]}`);
      const [arabic, translation] = result.data;
      // the first verse of every sura except 1 carries the basmala in this text – it is shown separately
      const strip = (text, i) => (surah !== 1 && i === 0 ? text.split(" ").slice(4).join(" ") : text);
      textCache[key] = { arabic: arabic.ayahs.map((ayah, i) => `${strip(ayah.text, i)} ﴿${ayah.numberInSurah}﴾`).join(" "), translation: translation.ayahs.map((ayah) => ayah.text).join(" ") };
    }
    return textCache[key];
  }

  // plays the recitation (Quran) or speaks the words; resolves when done
  async function playStep(step, token) {
    if (!sound) return;
    if (step.surah) {
      try {
        audioCache[step.surah] ||= (await fetchScripture("quran", `/v1/surah/${step.surah}/${faith().reciter || "ar.alafasy"}`)).data.ayahs.map((ayah) => ayah.audio);
        for (const url of audioCache[step.surah]) {
          if (token !== run) return;
          await new Promise((resolve) => {
            audio = new Audio(url);
            audio.addEventListener("ended", resolve);
            audio.addEventListener("error", resolve);
            audio.play().catch(resolve);
          });
        }
      } catch {
        // offline – continue silently
      }
      return;
    }
    const repeat = Math.min(step.repeat || 1, 3);
    for (let i = 0; i < repeat; i += 1) {
      if (token !== run) return;
      const said = religion === "islam" && step.arabic ? await speak(step.arabic, "ar", 0.75) : false;
      if (!said) {
        const text = step.line ? step.line.tr[lang] : step.tr?.[lang] || step.text;
        const ok = await speak(text, lang);
        const hint = dialog.querySelector("#learn-voice-hint");
        if (religion === "islam" && step.arabic && !hint.textContent) {
          hint.textContent = "Für die arabische Aussprache fehlt eine arabische Systemstimme – deshalb wird die Übersetzung vorgelesen. Du kannst sie in Windows unter Einstellungen › Zeit und Sprache › Sprache › „Arabisch“ hinzufügen. Die Koran-Rezitation ist immer echt.";
          hint.hidden = false;
        }
        if (!ok) await new Promise((resolve) => { setTimeout(resolve, 2500); });
      }
    }
  }

  async function draw() {
    const token = ++run;
    stopSound();
    clearTimeout(timer);
    const step = steps[index];
    clearInterval(crossTimer);
    if (step.cross) {
      const seq = tradition === "orthodox" ? ["cross1", "cross2", "cross4", "cross3"] : ["cross1", "cross2", "cross3", "cross4"];
      let i = 0;
      moveTo(seq[0]);
      crossTimer = setInterval(() => { i = (i + 1) % (seq.length + 1); moveTo(i === seq.length ? "folded" : seq[i], 600); }, 1000);
    } else moveTo(step.pose);
    const poseKey = step.pose === "qiyam" ? "qiyamNavel" : step.pose;
    const focus = FOCUS[step.cross ? "cross1" : poseKey] || [];
    const POSE_NAMES = { stand: "Stehen (Qiyām)", takbir: "Takbīr", qiyamNavel: "Stehen (Qiyām)", qiyamChest: "Stehen (Qiyām)", ruku: "Verbeugung (Rukūʿ)", sujud: "Niederwerfung (Sudschūd)", sit: "Sitzen (Dschalsa)", tashahhud: "Sitzen mit Taschahhud", salamR: "Salām rechts", salamL: "Salām links", folded: "Stehen, Hände gefaltet", bow: "Verneigung", kneel: "Knien", cross1: "Kreuzzeichen" };
    dialog.querySelector("#learn-pose-name").textContent = POSE_NAMES[step.cross ? "cross1" : poseKey] || "";
    const box = dialog.querySelector("#learn-step");
    let originalText = step.arabic || "";
    let translit = step.translit || "";
    let translation = step.tr ? step.tr[lang] : "";
    if (step.line) {
      originalText = step.line[original];
      translit = original === "greek" ? step.line.translit : "";
      translation = step.line.tr[lang];
    }
    const render = () => {
      box.innerHTML = `
        <div class="learn-head">${step.rakah ? `<span class="learn-rakah">Rakʿa ${step.rakah} von ${prayer.rakat}</span>` : ""}<span class="learn-count">Schritt ${index + 1} von ${steps.length}</span></div>
        <h3>${escapeHtml(step.title)}${step.repeat ? ` <small>× ${step.repeat}</small>` : ""}</h3>
        ${focus.length ? `<div class="learn-focus"><strong>Achte auf:</strong><ol>${focus.map(([, text]) => `<li>${escapeHtml(text)}</li>`).join("")}</ol></div>` : ""}
        ${step.text ? `<p class="learn-plain">${escapeHtml(step.text)}</p>` : ""}
        ${originalText && show.original ? `<p class="learn-original ${religion === "islam" ? "is-arabic" : ""}" ${religion === "islam" ? 'dir="rtl" lang="ar"' : original === "greek" ? 'lang="el"' : 'lang="la"'}>${escapeHtml(originalText)}</p>` : ""}
        ${translit && show.translit ? `<p class="learn-translit">${escapeHtml(translit)}</p>` : ""}
        ${translation && show.translation ? `<p class="learn-translation">${escapeHtml(translation)}</p>` : ""}
        ${step.note ? `<p class="learn-note">💡 ${escapeHtml(step.note)}</p>` : ""}`;
    };
    render();
    dialog.querySelector("#learn-progress").innerHTML = steps.map((item, i) => `<button type="button" class="${i === index ? "is-now" : i < index ? "is-done" : ""} ${item.rakah && item.rakah !== steps[i - 1]?.rakah ? "is-rakah" : ""}" data-go="${i}" title="${escapeHtml(item.title)}"></button>`).join("");
    dialog.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => { index = Number(button.dataset.go); draw(); }));
    dialog.querySelector("#learn-prev").disabled = index === 0;
    if (step.surah) {
      try {
        const text = await quranText(step.surah);
        if (token !== run) return;
        originalText = text.arabic;
        translation = text.translation;
        render();
      } catch {
        box.insertAdjacentHTML("beforeend", '<p class="muted small">Arabischer Text, Übersetzung und Rezitation brauchen eine Internetverbindung.</p>');
      }
    }
    if (!playing) return;
    const started = Date.now();
    await playStep(step, token);
    if (token !== run || !playing) return;
    // give the posture time even when there is no sound
    const words = `${originalText} ${translit}`.split(/\s+/).length;
    const minimum = sound ? 1500 : Math.max(4500, words * 450);
    timer = setTimeout(() => {
      if (token !== run || !playing) return;
      if (index < steps.length - 1) { index += 1; draw(); } else { playing = false; updatePlay(); }
    }, Math.max(1200, minimum - (Date.now() - started)));
  }
  const updatePlay = () => {
    const button = dialog.querySelector("#learn-play");
    button.textContent = playing ? "⏸" : "▶";
    button.setAttribute("aria-label", playing ? "Pause" : "Abspielen");
  };
  const rebuild = () => {
    steps = salahSteps(tradition, prayer, suras);
    index = Math.min(index, steps.length - 1);
    draw();
  };

  dialog.querySelector("#learn-prev").addEventListener("click", () => { if (index > 0) { index -= 1; draw(); } });
  dialog.querySelector("#learn-next").addEventListener("click", () => { index = index === steps.length - 1 ? 0 : index + 1; draw(); });
  dialog.querySelector("#learn-play").addEventListener("click", () => {
    playing = !playing;
    updatePlay();
    if (playing) draw();
    else { run += 1; clearTimeout(timer); stopSound(); }
  });
  dialog.querySelector("#learn-sound").addEventListener("click", (event) => {
    sound = !sound;
    event.currentTarget.textContent = sound ? "🔊" : "🔇";
    if (!sound) stopSound();
  });
  dialog.querySelector("#learn-prayer")?.addEventListener("change", (event) => { prayer = PRAYER_TYPES.find((item) => item.id === event.target.value); index = 0; rebuild(); });
  dialog.querySelectorAll("[data-sura]").forEach((select) => select.addEventListener("change", () => { suras[Number(select.dataset.sura)] = Number(select.value); rebuild(); }));
  dialog.querySelector("#learn-lang").addEventListener("change", (event) => { lang = event.target.value; draw(); });
  dialog.querySelector("#learn-original")?.addEventListener("change", (event) => { original = event.target.value; draw(); });
  dialog.querySelectorAll("[data-show]").forEach((input) => input.addEventListener("change", () => { show = { ...show, [input.dataset.show]: input.checked }; draw(); }));
  dialog.addEventListener("keydown", (event) => {
    if (event.target.closest("select")) return;
    if (event.key === "ArrowRight") dialog.querySelector("#learn-next").click();
    if (event.key === "ArrowLeft") dialog.querySelector("#learn-prev").click();
    if (event.key === " ") { event.preventDefault(); dialog.querySelector("#learn-play").click(); }
  });
  window.speechSynthesis?.getVoices(); // voices load lazily
  draw();
}

export { POSES, SHORT_SURAS, salahSteps };
