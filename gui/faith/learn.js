// "Gebet lernen": an animated figure shows each posture (left) with numbered highlights,
// the words appear in the original language, in Latin letters and in the chosen translation
// (right). Audio: real Quran recitation, other words through the system voice.
import { escapeHtml } from "../api.js";
import { openSheet } from "../ui.js";
import { motionLevel } from "../prefs.js";
import { faith, saveFaith } from "./state.js";
import { FORMULAS, GUIDE_SURAHS, RULING_LABELS, ruling } from "./salah-text.js";
import { TIMING } from "./salah-timing.js";
import { fetchScripture } from "./ui.js";
import { currentLanguage } from "../i18n.js";
import { RECITATION_ID, ISLAM_TRADITIONS, CHRISTIAN_TRADITIONS } from "./data.js";

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
POSES.qunut = { ...POSES.stand, elbow: [120, 116], hand: [134, 98] };

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
  qunut: [["hand", "Hände vor der Brust erheben, Handflächen zum Himmel – wie beim Bittgebet."], ["head", "Blick bleibt unten, auf dem Platz der Niederwerfung."]],
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
const VOICE_LANG = { de: (globalThis.document?.documentElement.lang || "de-DE"), en: "en-US", tr: "tr-TR", fr: "fr-FR", ar: "ar" };
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

// Real Arabic recordings of the prayer formulas (not Quran verses, so no reciter has them):
// Ḥiṣn al-Muslim (hisnmuslim.com) for the supplications, Mishary Alafasy (everyayah.com) for
// taʿawwudh/basmala, Lingua Libre (CC0) for the takbīr. `end` plays only the formula itself –
// those files continue with "three times" and the source reference.
const HISN = (id, end) => ({ url: `https://www.hisnmuslim.com/audio/ar/${id}.mp3`, end });
const CLIPS = {
  takbir: [{ url: "https://upload.wikimedia.org/wikipedia/commons/8/8d/LL-Q13955_%28ara%29-Ajron_Bach-Allahu_Akbar_%28noun%29.wav" }],
  opening: [HISN(28)],
  refuge: [{ url: "https://everyayah.com/data/Alafasy_128kbps/audhubillah.mp3" }, { url: "https://everyayah.com/data/Alafasy_128kbps/bismillah.mp3" }],
  basmala: [{ url: "https://everyayah.com/data/Alafasy_128kbps/bismillah.mp3" }],
  ruku: [HISN(33, 2.0)],
  rise: [HISN(38, 2.3), HISN(39)],
  sujud: [HISN(41, 2.1)],
  jalsa: [HISN(48, 3.5)],
  tashahhud: [HISN(52)],
  salawat: [HISN(53)],
};

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
  opening: { clip: "opening", pose: "qiyam", title: "Eröffnungs-Bittgebet (Thanāʾ)", arabic: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَٰهَ غَيْرُكَ", translit: "Subḥānaka llāhumma wa bi-ḥamdika, wa tabāraka smuka, wa taʿālā dschadduka, wa lā ilāha ghairuk.", tr: { de: "Gepriesen seist Du, o Allah, und Dir gebührt das Lob. Gesegnet ist Dein Name, erhaben ist Deine Majestät, und es gibt keinen Gott außer Dir.", en: "Glory be to You, O Allah, and all praise. Blessed is Your name, exalted is Your majesty, and there is no god but You.", tr: "Allah'ım! Seni her türlü eksiklikten tenzih ederim ve Sana hamdederim. Senin adın mübarektir, şanın yücedir. Senden başka ilah yoktur.", fr: "Gloire à Toi, ô Allah, et louange à Toi. Béni soit Ton nom, exaltée soit Ta majesté, et il n'y a de divinité que Toi." }, note: "Nach hanafitischer Praxis – andere Rechtsschulen sprechen hier andere Eröffnungs-Bittgebete." },
  refuge: { clip: "refuge", pose: "qiyam", title: "Zuflucht und Basmala", arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ ۝ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translit: "Aʿūdhu billāhi mina sch-schaiṭāni r-radschīm. Bismillāhi r-raḥmāni r-raḥīm.", tr: { de: "Ich suche Zuflucht bei Allah vor dem verfluchten Satan. Im Namen Allahs, des Allerbarmers, des Barmherzigen.", en: "I seek refuge in Allah from the accursed Satan. In the name of Allah, the Most Gracious, the Most Merciful.", tr: "Kovulmuş şeytanın şerrinden Allah'a sığınırım. Rahman ve Rahim olan Allah'ın adıyla.", fr: "Je cherche refuge auprès d'Allah contre Satan le maudit. Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux." } },
  fatiha: { pose: "qiyam", title: "Al-Fātiḥa", surah: 1, translit: "Bismillāhi r-raḥmāni r-raḥīm. Al-ḥamdu lillāhi rabbi l-ʿālamīn. Ar-raḥmāni r-raḥīm. Māliki yaumi d-dīn. Iyyāka naʿbudu wa iyyāka nastaʿīn. Ihdinā ṣ-ṣirāṭa l-mustaqīm. Ṣirāṭa lladhīna anʿamta ʿalaihim, ghairi l-maghḍūbi ʿalaihim wa la ḍ-ḍāllīn. – Āmīn.", note: "Die Fātiḥa wird in jeder Rakʿa rezitiert. Danach leise „Āmīn“." },
  ikhlas: { pose: "qiyam", title: "Eine kurze Sure: Al-Ichlāṣ", surah: 112, translit: "Qul huwa llāhu aḥad. Allāhu ṣ-ṣamad. Lam yalid wa lam yūlad. Wa lam yakun lahū kufuwan aḥad.", note: "In den ersten beiden Rakʿāt folgt nach der Fātiḥa eine weitere Sure – jede kurze Sure ist möglich." },
  ruku: { lead: "takbir", clip: "ruku", pose: "ruku", title: "Rukūʿ – die Verbeugung", arabic: "سُبْحَانَ رَبِّيَ الْعَظِيمِ", translit: "Subḥāna rabbiya l-ʿaẓīm.", repeat: 3, tr: { de: "Gepriesen sei mein Herr, der Gewaltige.", en: "Glory be to my Lord, the Most Great.", tr: "Ulu Rabbimi tesbih ederim.", fr: "Gloire à mon Seigneur, le Très Grand." }, note: "„Allāhu akbar“ sagen und mit geradem Rücken verbeugen, die Hände auf den Knien." },
  rise: { clip: "rise", pose: "stand", title: "Iʿtidāl – Aufrichten", arabic: "سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ ۝ رَبَّنَا وَلَكَ الْحَمْدُ، حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ", translit: "Samiʿa llāhu liman ḥamidah. – Rabbanā wa laka l-ḥamd, ḥamdan kathīran ṭayyiban mubārakan fīh.", tr: { de: "Allah hört den, der Ihn lobt. – Unser Herr, Dir gebührt das Lob: viel Lob, gutes und gesegnetes.", en: "Allah hears whoever praises Him. – Our Lord, to You belongs all praise: abundant, good and blessed praise.", tr: "Allah kendisine hamdedeni işitir. – Rabbimiz, hamd Sana mahsustur; çok, temiz ve bereketli bir hamd.", fr: "Allah entend celui qui Le loue. – Notre Seigneur, à Toi la louange : une louange abondante, bonne et bénie." }, note: "Den zweiten Teil („ḥamdan kathīran …“) kannst du auch weglassen – „Rabbanā wa laka l-ḥamd“ genügt (Buchārī 799)." },
  sujud: { lead: "takbir", clip: "sujud", pose: "sujud", title: "Sudschūd – die Niederwerfung", arabic: "سُبْحَانَ رَبِّيَ الْأَعْلَىٰ", translit: "Subḥāna rabbiya l-aʿlā.", repeat: 3, tr: { de: "Gepriesen sei mein Herr, der Höchste.", en: "Glory be to my Lord, the Most High.", tr: "Yüce Rabbimi tesbih ederim.", fr: "Gloire à mon Seigneur, le Très-Haut." }, note: "„Allāhu akbar“ – Stirn, Nase, Hände, Knie und Zehen berühren den Boden. Hier bist du Allah am nächsten." },
  jalsa: { lead: "takbir", clip: "jalsa", clipRepeat: 1, pose: "sit", title: "Sitzen zwischen den Niederwerfungen", arabic: "رَبِّ اغْفِرْ لِي", translit: "Rabbi ghfir lī.", repeat: 2, tr: { de: "Mein Herr, vergib mir.", en: "My Lord, forgive me.", tr: "Rabbim, beni bağışla.", fr: "Mon Seigneur, pardonne-moi." } },
  tashahhud: { clip: "tashahhud", pose: "tashahhud", title: "Taschahhud – das Glaubenszeugnis", arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَىٰ عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ", translit: "At-taḥiyyātu lillāhi wa ṣ-ṣalawātu wa ṭ-ṭayyibāt. As-salāmu ʿalaika ayyuha n-nabiyyu wa raḥmatu llāhi wa barakātuh. As-salāmu ʿalainā wa ʿalā ʿibādi llāhi ṣ-ṣāliḥīn. Aschhadu an lā ilāha illa llāh, wa aschhadu anna Muḥammadan ʿabduhū wa rasūluh.", tr: { de: "Alle Grüße, Gebete und guten Worte gebühren Allah. Friede sei mit dir, o Prophet, und die Barmherzigkeit Allahs und Sein Segen. Friede sei mit uns und mit den rechtschaffenen Dienern Allahs. Ich bezeuge, dass es keinen Gott gibt außer Allah, und ich bezeuge, dass Muhammad Sein Diener und Gesandter ist.", en: "All greetings, prayers and good words are for Allah. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous servants of Allah. I bear witness that there is no god but Allah, and I bear witness that Muhammad is His servant and messenger.", tr: "Bütün dualar, ibadetler ve güzel sözler Allah'a aittir. Ey Peygamber! Allah'ın selamı, rahmeti ve bereketi senin üzerine olsun. Selam bizim üzerimize ve Allah'ın salih kulları üzerine olsun. Şahitlik ederim ki Allah'tan başka ilah yoktur ve yine şahitlik ederim ki Muhammed O'nun kulu ve elçisidir.", fr: "Les salutations, les prières et les bonnes œuvres sont à Allah. Que la paix soit sur toi, ô Prophète, ainsi que la miséricorde d'Allah et Ses bénédictions. Que la paix soit sur nous et sur les pieux serviteurs d'Allah. J'atteste qu'il n'y a de divinité qu'Allah et j'atteste que Muhammad est Son serviteur et Son messager." }, note: "Beim Glaubenszeugnis wird der rechte Zeigefinger angehoben." },
  salawat: { clip: "salawat", pose: "sit", title: "Ṣalawāt Ibrāhīmiyya", arabic: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ", translit: "Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā ṣallaita ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka ḥamīdun madschīd. Allāhumma bārik ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā bārakta ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka ḥamīdun madschīd.", tr: { de: "O Allah, segne Muhammad und die Familie Muhammads, wie Du Ibrahim und die Familie Ibrahims gesegnet hast. Du bist der Lobenswerte, der Ruhmreiche. O Allah, schenke Muhammad und der Familie Muhammads Gnade, wie Du Ibrahim und der Familie Ibrahims Gnade geschenkt hast. Du bist der Lobenswerte, der Ruhmreiche.", en: "O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim; You are Praiseworthy, Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim; You are Praiseworthy, Glorious.", tr: "Allah'ım! İbrahim'e ve İbrahim'in ailesine rahmet ettiğin gibi Muhammed'e ve Muhammed'in ailesine de rahmet eyle. Şüphesiz Sen övülmeye layıksın, şanı yücesin. Allah'ım! İbrahim'e ve İbrahim'in ailesine bereket verdiğin gibi Muhammed'e ve Muhammed'in ailesine de bereket ver. Şüphesiz Sen övülmeye layıksın, şanı yücesin.", fr: "Ô Allah, prie sur Muhammad et sur la famille de Muhammad comme Tu as prié sur Ibrahim et sur la famille d'Ibrahim ; Tu es certes Digne de louange et de gloire. Ô Allah, bénis Muhammad et la famille de Muhammad comme Tu as béni Ibrahim et la famille d'Ibrahim ; Tu es certes Digne de louange et de gloire." } },
};
const takbir = (title, pose, note) => ({ clip: "takbir", pose, title, arabic: "اللَّهُ أَكْبَرُ", translit: "Allāhu akbar.", tr: { de: "Allah ist größer.", en: "Allah is the Greatest.", tr: "Allah en büyüktür.", fr: "Allah est le plus grand." }, note });
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

// What is different in each school – shown above the steps after choosing it.
export const TRADITION_NOTES = {
  "sunni-hanafi": ["Hände unterhalb des Nabels, die rechte über der linken.", "Hände nur beim Eröffnungs-Takbīr heben.", "Eröffnungs-Bittgebet „Subḥānaka llāhumma …“, Taʿawwudh und Basmala leise.", "„Āmīn“ leise.", "Zeigefinger bei „lā ilāha“ heben, bei „illa llāh“ wieder senken.", "In beiden Sitzungen auf dem linken Fuß sitzen (Iftirāsch).", "Kein Qunūt im Fadschr – das Qunūt gehört zum Witr."],
  "sunni-shafii": ["Hände auf der Brust bzw. zwischen Brust und Nabel.", "Hände heben beim Eröffnungs-Takbīr, vor dem Rukūʿ, beim Aufrichten und beim Aufstehen nach dem ersten Taschahhud.", "Meist das Eröffnungs-Bittgebet „Wadschdschahtu wadschhiya …“; das „Subḥānaka llāhumma …“ ist ebenfalls überliefert.", "Die Basmala gehört zur Fātiḥa und ist Pflicht – in lauten Gebeten laut.", "Qunūt im Fadschr: in der 2. Rakʿa nach dem Aufrichten vom Rukūʿ.", "Zeigefinger bei „illa llāh“ heben und bis zum Ende oben lassen.", "Im letzten Sitzen auf der linken Hüfte sitzen (Tawarruk)."],
  "sunni-maliki": ["Hände locker an den Seiten (Sadl).", "Im Pflichtgebet kein Eröffnungs-Bittgebet, kein Taʿawwudh und keine Basmala – direkt „Al-ḥamdu lillāh …“.", "Qunūt im Fadschr: leise in der 2. Rakʿa vor dem Rukūʿ.", "Den Zeigefinger während des ganzen Taschahhud leicht hin und her bewegen.", "In allen Sitzungen Tawarruk.", "Ein Salām nach rechts beendet das Gebet."],
  "sunni-hanbali": ["Hände unter dem Nabel oder auf der Brust – beides überliefert.", "Hände heben beim Eröffnungs-Takbīr, vor dem Rukūʿ und beim Aufrichten.", "Das „Allāhu akbar“ bei jedem Wechsel ist Wādschib – vergisst du es, folgt Sudschūd as-Sahw.", "Bei jeder Erwähnung Allahs im Taschahhud mit dem Zeigefinger zeigen.", "Tawarruk im letzten Sitzen von Gebeten mit zwei Sitzungen.", "Beide Salām-Grüße sind Pflicht."],
  "shia-jafari": ["Hände an den Seiten; die Stirn wird auf natürliches Material gelegt (Turba).", "Hände bei jedem Takbīr bis zu den Ohren heben.", "Kein „Āmīn“ nach der Fātiḥa.", "Qunūt in jedem Gebet: in der 2. Rakʿa vor dem Rukūʿ.", "„Allāhu akbar“ auch nach dem Aufrichten vom Rukūʿ, vor dem Sudschūd.", "Eigener Wortlaut von Taschahhud und Salām; am Ende dreimal „Allāhu akbar“ mit erhobenen Händen.", "Lerne die Einzelheiten am besten mit deinem Imam – die Anleitung zeigt die gemeinsamen Grundzüge."],
  catholic: ["Kreuzzeichen von links nach rechts: Stirn – Brust – linke – rechte Schulter.", "Das Vaterunser endet im persönlichen Gebet meist mit „… erlöse uns von dem Bösen. Amen.“", "Der Lobpreis „Denn dein ist das Reich …“ folgt in der Messe nach dem Embolismus des Priesters.", "Der Rosenkranz ist ein typisches katholisches Gebet (siehe Tracker)."],
  protestant: ["Das Kreuzzeichen ist möglich, aber freiwillig.", "Das Vaterunser wird mit dem Lobpreis „Denn dein ist das Reich …“ gebetet.", "Freies Gebet in eigenen Worten hat einen hohen Stellenwert."],
  orthodox: ["Kreuzzeichen mit drei zusammengelegten Fingern (Dreifaltigkeit), von rechts nach links: Stirn – Brust – rechte – linke Schulter.", "Der Lobpreis wird vom Priester gesprochen.", "Verneigungen und Metanien (Verbeugung bis zum Boden) begleiten das Gebet.", "Das Jesusgebet mit der Gebetsschnur ist sehr verbreitet."],
  free: ["Das Gebet ist meist frei und persönlich; das Vaterunser wird gemeinsam gesprochen.", "Das Kreuzzeichen ist unüblich, aber nicht verboten.", "Der Lobpreis „Denn dein ist das Reich …“ wird mitgebetet."],
};

const QUNUT = {
  "sunni-shafii": { translit: "Allāhumma hdinī fīman hadait, wa ʿāfinī fīman ʿāfait, wa tawallanī fīman tawallait, wa bārik lī fīmā aʿṭait, wa qinī scharra mā qaḍait, fa-innaka taqḍī wa lā yuqḍā ʿalaik, wa innahū lā yadhillu man wālait, tabārakta rabbanā wa taʿālait.", de: "O Allah, leite mich unter denen, die Du leitest, schenke mir Wohlergehen unter denen, denen Du es schenkst, nimm Dich meiner an unter denen, derer Du Dich annimmst, segne mir, was Du gegeben hast, und schütze mich vor dem Übel dessen, was Du bestimmt hast …", source: "Abū Dāwūd 1425, Tirmidhī 464" },
  "sunni-maliki": { translit: "Allāhumma innā nastaʿīnuka wa nastaghfiruk, wa nuʾminu bika wa natawakkalu ʿalaik …", de: "O Allah, wir bitten Dich um Hilfe und um Vergebung, wir glauben an Dich und vertrauen auf Dich …", source: "nach malikitischer Überlieferung – leise gesprochen" },
  "shia-jafari": { translit: "Rabbanā ātinā fi d-dunyā ḥasanatan wa fi l-āchirati ḥasanatan wa qinā ʿadhāba n-nār.", de: "Unser Herr, gib uns im Diesseits Gutes und im Jenseits Gutes und bewahre uns vor der Strafe des Feuers.", source: "Koran 2:201 – jedes Bittgebet ist möglich" },
};

function salahSteps(tradition, prayer, suras) {
  const hanafi = tradition === "sunni-hanafi";
  const shafii = tradition === "sunni-shafii";
  const maliki = tradition === "sunni-maliki";
  const hanbali = tradition === "sunni-hanbali";
  const jafari = tradition === "shia-jafari";
  const handsDown = jafari || maliki;
  const qiyam = handsDown ? "stand" : hanafi ? "qiyamNavel" : "qiyamChest";
  const raise = shafii || hanbali || jafari; // raising the hands at the bow and when rising
  const amin = jafari ? " Kein „Āmīn“ (dschaʿfaritisch)." : hanafi ? " Danach leise „Āmīn“." : " Danach „Āmīn“ – in lauten Gebeten hörbar.";
  // finger: Hanafi lifts at "lā ilāha", Shafiʿi at "illa llāh", Hanbali points at each mention of Allah
  const cue = hanafi ? { word: 2, until: 4, text: "☝️ Bei „lā ilāha“ den Zeigefinger heben – bei „illa llāh“ wieder senken" }
    : shafii ? { word: 4, text: "☝️ Bei „illa llāh“ den Zeigefinger heben und oben lassen" }
      : hanbali ? { word: 5, text: "☝️ Bei „Allāh“ mit dem Zeigefinger zeigen" }
        : maliki ? { word: 0, text: "☝️ Den Zeigefinger leicht hin und her bewegen" } : null;
  const move = "„Allāhu akbar“ beim Wechsel der Haltung";
  const F = (formula, extra) => ({ formula, ...extra });
  const qunut = (rakah) => ({ pose: "qunut", title: "Qunūt – Bittgebet im Stehen", translitText: QUNUT[tradition].translit, text: QUNUT[tradition].de, note: QUNUT[tradition].source, rakah });
  const steps = [
    { pose: "stand", title: "Absicht (Niyya)", text: `Steh zur Qibla gewandt. Fasse im Herzen die Absicht: „Ich bete das ${NIYYA[prayer.id]}-Gebet – ${prayer.rakat} Rakʿāt – für Allah.“`, note: "Die Absicht muss nicht laut gesprochen werden.", rulings: ["niyya"] },
    F("takbir", { pose: "takbir", title: "Takbīr – das Gebet beginnt", note: "Hände heben und „Allāhu akbar“ sagen. Ab jetzt gehört deine ganze Aufmerksamkeit dem Gebet.", rulings: ["takbir_ihram", "raise_hands"] }),
  ];
  if (!maliki) {
    steps.push(
      F("opening", { pose: qiyam, title: "Eröffnungs-Bittgebet (Thanāʾ)", note: shafii ? "Schafiʿiten sprechen meist „Wadschdschahtu wadschhiya …“ – dieses Bittgebet ist ebenfalls überliefert (Muslim 399)." : jafari ? "In der dschaʿfaritischen Praxis sind andere Eröffnungs-Bittgebete üblich." : "Leise gesprochen, nur in der ersten Rakʿa.", rulings: ["opening", "hands"], rakah: 1 }),
      F("refuge", { pose: qiyam, title: "Zuflucht (Taʿawwudh)", note: "Die Basmala („Bismillāhi r-raḥmāni r-raḥīm“) folgt direkt am Anfang der Fātiḥa.", rulings: ["refuge"], rakah: 1 }),
    );
  }
  for (let rakah = 1; rakah <= prayer.rakat; rakah += 1) {
    if (rakah > 1) {
      steps.push(F("takbir", { pose: "stand", via: rakah === 3 && (shafii || jafari) ? "takbir" : null, transition: true, title: `Aufstehen zur ${rakah}. Rakʿa`, note: `Mit „Allāhu akbar“ wieder aufstehen.${rakah === 3 && shafii ? " Dabei die Hände heben." : ""}`, rulings: ["takbir_move"], rakah }));
    }
    const basmalaNote = maliki ? " Malikiten beginnen ohne Basmala direkt mit „Al-ḥamdu lillāh“ – die Rezitation enthält sie trotzdem." : shafii ? " Die Basmala ist hier Pflicht." : "";
    steps.push({ pose: qiyam, title: "Al-Fātiḥa", surah: 1, rakah, rulings: shafii ? ["fatiha", "basmala", "qiyam"] : ["fatiha", "qiyam"], note: `${rakah > 2 ? "In der 3. und 4. Rakʿa wird nur die Fātiḥa rezitiert – keine weitere Sure." : "Die Fātiḥa wird in jeder Rakʿa rezitiert."}${amin}${basmalaNote}` });
    if (rakah <= 2) {
      const chosen = SHORT_SURAS.find((item) => item.surah === suras[rakah - 1]) || SHORT_SURAS[0];
      steps.push({ pose: qiyam, title: `Eine Sure: ${chosen.name}`, surah: chosen.surah, rakah, rulings: ["sura"], note: `In den ersten beiden Rakʿāt folgt nach der Fātiḥa eine weitere Sure – oben kannst du sie wählen (Rakʿa ${rakah}).` });
    }
    if (rakah === 2 && (jafari || (maliki && prayer.id === "fajr"))) steps.push(qunut(rakah));
    steps.push(
      F("ruku", { pose: "ruku", via: raise ? "takbir" : null, title: "Rukūʿ – die Verbeugung", repeat: 3, lead: "takbir", note: `${move}: erst sagen, dabei mit geradem Rücken verbeugen, die Hände auf die Knie.${raise ? " Vorher die Hände heben." : ""}`, rulings: ["ruku", "ruku_dhikr", "takbir_move"], rakah }),
      F("rise", { pose: "stand", via: raise ? "takbir" : null, transition: "rise", title: "Iʿtidāl – Aufrichten", note: `Beim Aufrichten sagst du statt „Allāhu akbar“: „Samiʿa llāhu liman ḥamidah“.${raise ? " Dabei die Hände heben." : ""} ${SALAH.rise.note}`, rulings: ["rise", "rise_dhikr"], rakah }),
    );
    if (rakah === 2 && shafii && prayer.id === "fajr") steps.push(qunut(rakah));
    steps.push(
      F("sujud", { pose: "sujud", title: "Sudschūd – die Niederwerfung", repeat: 3, lead: "takbir", note: `${move}: während du dich niederwirfst. Stirn, Nase, Hände, Knie und Zehen berühren den Boden – hier bist du Allah am nächsten.${jafari ? " Dschaʿfaritisch: vorher im Stehen noch einmal „Allāhu akbar“." : ""}`, rulings: ["sujud", "sujud_dhikr", "takbir_move"], rakah }),
      F("jalsa", { pose: "sit", title: "Sitzen zwischen den Niederwerfungen", lead: "takbir", note: `${move}: beim Aufsetzen.`, rulings: ["jalsa", "jalsa_dhikr", "takbir_move"], rakah }),
      F("sujud", { pose: "sujud", title: "Zweite Niederwerfung", repeat: 3, lead: "takbir", note: `${move}: beim erneuten Niederwerfen. Genau wie die erste Niederwerfung.`, rulings: ["sujud", "sujud_dhikr", "takbir_move"], rakah }),
    );
    if (rakah === 2 && prayer.rakat > 2) {
      steps.push(
        F("tashahhud", { pose: maliki ? "tashahhud" : "sit", lead: "takbir", title: "Erstes Sitzen – Taschahhud", note: `${move}: beim Aufsetzen. Nach der 2. Rakʿa nur das Taschahhud sprechen, dann zur nächsten Rakʿa aufstehen.${maliki || jafari ? "" : " Der Finger bleibt hier noch unten."}`, rulings: ["first_tashahhud", "takbir_move"], rakah }),
        F("shahada", { pose: jafari ? "sit" : "tashahhud", cue, title: "Erstes Sitzen – Glaubenszeugnis", note: jafari ? "Dschaʿfaritisch ohne Fingerheben." : cue.text.slice(3), rulings: jafari ? ["first_tashahhud"] : ["first_tashahhud", "finger"], rakah }),
      );
    }
  }
  const last = prayer.rakat;
  const sitNote = shafii || maliki || (hanbali && prayer.rakat > 2) ? " Im letzten Sitzen auf der linken Hüfte sitzen, beide Füße nach rechts (Tawarruk)." : "";
  steps.push(
    F("tashahhud", { pose: maliki ? "tashahhud" : "sit", lead: "takbir", title: "Letztes Sitzen – Taschahhud", note: `${move}: beim Aufsetzen nach der Niederwerfung.${maliki ? "" : " Bei „At-taḥiyyātu …“ bleibt der Finger noch unten."}${sitNote}`, rulings: ["last_sitting", "last_tashahhud", "takbir_move"], rakah: last }),
    F("shahada", { pose: jafari ? "sit" : "tashahhud", cue, title: jafari ? "Glaubenszeugnis" : "Glaubenszeugnis – Finger", note: jafari ? "Dschaʿfaritisch ohne Fingerheben." : cue.text.slice(3), rulings: jafari ? ["last_tashahhud"] : ["last_tashahhud", "finger"], rakah: last }),
    F("salawat", { pose: "sit", title: "Ṣalawāt Ibrāhīmiyya", rulings: ["salawat"], rakah: last }),
    F("protection", { pose: "sit", title: "Bittgebet vor dem Salām", note: "Der Prophet ﷺ lehrte, vor dem Salām Zuflucht vor diesen vier Dingen zu suchen (Muslim 588).", rulings: ["protection"], rakah: last }),
    F("salam", { pose: "salamR", title: "Friedensgruß nach rechts", note: maliki ? "Den Kopf nach rechts drehen – nach malikitischer Lehre beendet dieser eine Gruß das Gebet." : "Den Kopf nach rechts drehen.", rulings: ["salam_right"] }),
  );
  if (!maliki) steps.push(F("salamLeft", { pose: "salamL", title: "Friedensgruß nach links", note: jafari ? "Danach dreimal „Allāhu akbar“ mit erhobenen Händen." : "Den Kopf nach links drehen – das Gebet ist beendet.", rulings: ["salam_left"] }));
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
  let tradition = religion === "islam" ? faith().islamTradition : faith().christianTradition;
  const traditions = religion === "islam" ? ISLAM_TRADITIONS : CHRISTIAN_TRADITIONS;
  let prayer = PRAYER_TYPES[0];
  let suras = [112, 103]; // Al-Ichlāṣ from the own recording, then Al-ʿAṣr – both short and well known
  let steps = religion === "islam" ? salahSteps(tradition, prayer, suras) : christianSteps(tradition);
  const quranCache = {};
  let index = 0;
  let lang = currentLanguage();
  if (!LANGS.some(([id]) => id === lang)) lang = "de";
  let original = tradition === "orthodox" ? "greek" : "latin";
  let show = { original: true, translit: true, translation: true };
  let playing = false; // tutorial runs through by itself
  let held = false; // paused – ▶ continues exactly there
  let wordActive = false; // a tapped word is sounding
  let resumeTick = null; // continues highlighting after a pause
  let stepDone = false;
  let poseTimer;
  let sound = true;
  let rate = 1;
  let tapMode = "here"; // "here": play on from the word · "word": only this word
  let loopWord = false;
  let echo = false; // pause after each phrase so you can repeat it
  let timer;
  let crossTimer;
  let audio = null;
  let frame = 0;
  let run = 0; // invalidates pending playback when the step changes
  let media = null; // current step: { clips: [{ url, end, words: [a, b], times }], phrases, words }

  const stopSound = () => {
    cancelAnimationFrame(frame);
    audio?.pause();
    audio = null;
    window.speechSynthesis?.cancel();
  };
  const { dialog } = openSheet({
    title: religion === "islam" ? "Gebet lernen – die Ṣalāh" : "Gebet lernen – das Vaterunser",
    wide: true,
    onClose: () => { playing = false; run += 1; clearTimeout(timer); clearTimeout(poseTimer); clearInterval(crossTimer); stopSound(); },
    body: `
      <div class="learn">
        <div class="learn-stage">
          <div class="learn-pose-name" id="learn-pose-name"></div>
          ${figureSvg(religion === "islam" ? "mat" : "floor")}
          <div class="learn-cue" id="learn-cue" hidden></div>
          <div class="learn-progress" id="learn-progress"></div>
          <div class="learn-transport">
            <button class="icon-button" id="learn-prev" type="button" aria-label="Zurück" title="Zurück (←)">⏮</button>
            <button class="learn-play" id="learn-play" type="button" aria-label="Tutorial abspielen" title="Tutorial abspielen (Leertaste)">▶</button>
            <button class="icon-button" id="learn-next" type="button" aria-label="Weiter" title="Weiter (→)">⏭</button>
            <button class="icon-button" id="learn-sound" type="button" aria-label="Ton an/aus" title="Ton an/aus">🔊</button>
          </div>
          <div class="learn-tools">
            <label title="Abspielgeschwindigkeit">🐢 <select id="learn-rate"><option value="0.6">0,6×</option><option value="0.8">0,8×</option><option value="1" selected>1×</option><option value="1.2">1,2×</option></select></label>
            <label title="Nach jedem Satzteil eine Pause zum Nachsprechen"><input type="checkbox" id="learn-echo"> 🎤 Nachsprechen</label>
          </div>
          <p class="learn-play-hint">Einmal ▶ drücken – das Tutorial läuft von allein bis zum Ende.</p>
        </div>
        <div class="learn-text">
          <div class="learn-options">
            <label class="reader-field learn-school"><span>${religion === "islam" ? "Rechtsschule" : "Konfession"}</span><select id="learn-tradition">${traditions.map(([id, label]) => `<option value="${id}" ${id === tradition ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>
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
          <details class="learn-school-notes" id="learn-school-notes" open></details>
          ${religion === "islam" ? `
            <div class="learn-wordbar">
              <span>Wort antippen:</span>
              <label><input type="radio" name="tap" value="here" checked> ab hier abspielen</label>
              <label><input type="radio" name="tap" value="word"> nur dieses Wort</label>
              <label><input type="checkbox" id="learn-loop"> 🔁 3× wiederholen</label>
            </div>` : ""}
          <div id="learn-step" class="learn-step" aria-live="polite"></div>
          ${religion === "islam" ? `<details class="learn-legend"><summary>Was bedeuten Pflicht, Wādschib und Sunnah?</summary>
            ${Object.values(RULING_LABELS).map((item) => `<p><span class="ruling ${item.tone}">${item.short}</span> ${escapeHtml(item.long.split(" – ")[1] || item.long)}</p>`).join("")}
            <p>Außerdem gilt für alle Haltungen: <strong>Ruhe (Ṭumaʾnīna)</strong> – in jeder Haltung kurz zur Ruhe kommen, nicht hetzen. Nach den gängigen Positionen der Rechtsschulen; im Zweifel frag deinen Imam.</p></details>` : ""}
          <p class="muted small" id="learn-voice-hint" hidden></p>
        </div>
      </div>`,
  });
  const svg = dialog.querySelector(".learn-figure");
  const moveTo = animator(svg);
  const learned = () => new Set(faith().learnedSteps || []);
  const stepKey = (step) => step.formula || (step.surah ? `surah-${step.surah}` : step.title);

  // ---- media of a step: recordings + word timings ----------------------------------------------
  function formulaMedia(key) {
    const formula = FORMULAS[key];
    return {
      words: formula.words.map(([ar, lat]) => ({ ar, lat })),
      phrases: formula.phrases.map(([from, to, tr]) => ({ from, to, text: tr[lang] || tr.de })),
      clips: formula.clips.map((clip, i) => ({ url: clip.url, start: clip.start, end: clip.end, words: clip.words, reps: clip.reps || 1, times: TIMING[key]?.[i] || [] })),
      cue: formula.cue,
    };
  }

  async function quranMedia(surah) {
    const recitation = RECITATION_ID[faith().reciter] || 7;
    const key = `${surah}:${lang}:${recitation}`;
    if (!quranCache[key]) {
      const [rec, verses, translation] = await Promise.all([
        fetchScripture("qurancom", `/api/v4/chapter_recitations/${recitation}/${surah}?segments=true`),
        fetchScripture("qurancom", `/api/v4/verses/by_chapter/${surah}?words=true&word_fields=text_uthmani&per_page=50`),
        fetchScripture("quran", `/v1/surah/${surah}/${QURAN_EDITION[lang]}`),
      ]);
      const words = [];
      const times = [];
      const phrases = [];
      verses.verses.forEach((verse, vi) => {
        const stamp = rec.audio_file.timestamps[vi];
        const own = verse.words.filter((word) => word.char_type_name === "word");
        const from = words.length;
        const segments = new Map((stamp?.segments || []).filter((segment) => segment.length === 3).map(([position, t0, t1]) => [position, [t0 / 1000, t1 / 1000]]));
        own.forEach((word, wi) => {
          words.push({ ar: word.text_uthmani || word.text, lat: word.transliteration?.text || "", gloss: word.translation?.text || "" });
          // fall back to an even split when a word has no segment
          const span = stamp ? (stamp.timestamp_to - stamp.timestamp_from) / 1000 / own.length : 0;
          times.push(segments.get(wi + 1) || (stamp ? [stamp.timestamp_from / 1000 + wi * span, stamp.timestamp_from / 1000 + (wi + 1) * span] : [0, 0]));
        });
        phrases.push({ from, to: words.length - 1, text: translation.data.ayahs[vi]?.text || "", marker: verse.verse_number });
      });
      const lastStamp = rec.audio_file.timestamps.at(-1);
      const guide = GUIDE_SURAHS[surah];
      if (guide && guide.words.length === words.length) {
        // the user's own recording, slow and clear – same voice as the rest of the prayer
        quranCache[key] = { words, phrases, clips: [{ url: guide.clip.url, start: guide.clip.start, end: guide.clip.end, words: [0, words.length - 1], reps: 1, times: TIMING[`surah${surah}`][0] }] };
        return quranCache[key];
      }
      quranCache[key] = { words, phrases, clips: [{ url: rec.audio_file.audio_url, start: (rec.audio_file.timestamps[0]?.timestamp_from || 0) / 1000, end: lastStamp ? lastStamp.timestamp_to / 1000 + 0.15 : undefined, words: [0, words.length - 1], times }] };
    }
    return quranCache[key];
  }

  // ---- highlighting --------------------------------------------------------------------------------
  let lastHighlighted = -1;
  function highlight(wordIndex) {
    if (wordIndex === lastHighlighted) return;
    lastHighlighted = wordIndex;
    const box = dialog.querySelector("#learn-step");
    box.querySelectorAll(".lw.is-now").forEach((node) => node.classList.remove("is-now"));
    box.querySelectorAll(".lp.is-now").forEach((node) => node.classList.remove("is-now"));
    if (wordIndex < 0 || !media) {
      box.querySelectorAll(".lw.is-done").forEach((node) => node.classList.remove("is-done"));
      return;
    }
    box.querySelectorAll(`.lw[data-w="${wordIndex}"]`).forEach((node) => node.classList.add("is-now"));
    const phrase = media.phrases.findIndex((item) => wordIndex >= item.from && wordIndex <= item.to);
    if (phrase >= 0) box.querySelector(`.lp[data-p="${phrase}"]`)?.classList.add("is-now");
    box.querySelectorAll(".lw").forEach((node) => node.classList.toggle("is-done", Number(node.dataset.w) < wordIndex));
    const cue = dialog.querySelector("#learn-cue");
    const active = media.cue && wordIndex >= media.cue.word && wordIndex < (media.cue.until ?? media.words.length);
    cue.hidden = !active;
    if (active) cue.textContent = media.cue.text;
    svg.classList.toggle("cue-on", Boolean(active));
  }

  // plays clips of the current media from a word; resolves when done
  function playFrom(fromWord, { onlyWord = false, token }) {
    return new Promise((resolve) => {
      const clipIndex = media.clips.findIndex((clip) => fromWord >= clip.words[0] && fromWord <= clip.words[1]);
      if (clipIndex < 0) return resolve();
      const next = async (ci, startWord) => {
        const clip = media.clips[ci];
        if (!clip || token !== run) return resolve();
        const local = startWord - clip.words[0];
        const startAt = startWord === clip.words[0] && !onlyWord ? clip.start || 0 : Math.max(0, (clip.times[local]?.[0] ?? 0) - 0.05);
        const stopAt = onlyWord ? (clip.times[local]?.[1] ?? 0) + 0.08 : clip.end;
        audio = new Audio(clip.url);
        audio.playbackRate = rate;
        audio.preservesPitch = true;
        let echoed = new Set();
        const finish = () => {
          resumeTick = null;
          cancelAnimationFrame(frame);
          audio?.pause();
          if (onlyWord || ci === media.clips.length - 1) resolve();
          else next(ci + 1, media.clips[ci + 1].words[0]);
        };
        const tick = () => {
          if (token !== run || !audio) return;
          const t = audio.currentTime;
          let current = -1;
          const span = clip.words[1] - clip.words[0] + 1;
          clip.times.forEach(([t0, t1], i) => { if (t >= t0 - 0.03 && t < t1) current = clip.words[0] + (i % span); });
          if (clip.reps > 1 && !onlyWord) {
            const k = clip.times.findIndex(([t0, t1]) => t >= t0 - 0.03 && t < t1);
            if (k >= 0) dialog.querySelector("#learn-repeat").textContent = `${Math.floor(k / span) + 1}. von ${clip.reps}`;
          }
          if (current >= 0) highlight(current);
          // "Nachsprechen": pause after each phrase, as long as the phrase took
          if (echo && !onlyWord) {
            const phrase = media.phrases.find((item) => item.to >= clip.words[0] && item.to <= clip.words[1] && !echoed.has(item.to) && t >= (clip.times[item.to - clip.words[0]]?.[1] ?? Infinity));
            if (phrase) {
              echoed.add(phrase.to);
              audio.pause();
              const length = (clip.times[phrase.to - clip.words[0]][1] - (clip.times[Math.max(phrase.from, clip.words[0]) - clip.words[0]]?.[0] ?? 0)) / rate;
              const cue = dialog.querySelector("#learn-cue");
              cue.hidden = false;
              cue.textContent = "🎤 Jetzt du – sprich es nach";
              setTimeout(() => { if (token === run && audio && !held) { cue.hidden = true; audio.play().catch(finish); frame = requestAnimationFrame(tick); } }, length * 1100 + 600);
              return;
            }
          }
          if (stopAt && t >= stopAt) return finish();
          frame = requestAnimationFrame(tick);
        };
        audio.addEventListener("ended", finish);
        audio.addEventListener("error", finish);
        audio.addEventListener("loadedmetadata", () => { audio.currentTime = startAt; }, { once: true });
        resumeTick = tick;
        try {
          await audio.play();
          frame = requestAnimationFrame(tick);
        } catch {
          finish();
        }
        return undefined;
      };
      next(clipIndex, fromWord);
      return undefined;
    });
  }

  // a calm speaking pace for read-along: ~0.09 s per letter, at least 0.45 s per word
  const readTime = (latin) => Math.max(450, latin.replace(/[^a-zA-Zāīūḥḍṣṭẓʿʾ]/g, "").length * 90);

  // plays one cut of a recording (start/end in seconds)
  const playClip = (clip, token) => new Promise((resolve) => {
    if (token !== run) return resolve();
    audio = new Audio(clip.url);
    audio.playbackRate = rate;
    const done = () => { clearInterval(watch); audio?.pause(); resolve(); };
    const watch = setInterval(() => { if (token !== run || (clip.end && audio && audio.currentTime >= clip.end)) done(); }, 40);
    audio.addEventListener("ended", done);
    audio.addEventListener("error", done);
    if (clip.start) audio.addEventListener("loadedmetadata", () => { audio.currentTime = clip.start; }, { once: true });
    audio.play().catch(done);
    return undefined;
  });

  async function playStep(step, token) {
    if (!sound) return;
    if (religion !== "islam") {
      const text = step.line ? step.line.tr[lang] : step.tr?.[lang] || step.text;
      if (!(await speak(text, lang))) await new Promise((resolve) => { setTimeout(resolve, 2500); });
      return;
    }
    if (step.lead) {
      // the posture changes WHILE "Allāhu akbar" is said
      const banner = dialog.querySelector("#learn-move");
      banner?.classList.add("is-now");
      posture(step);
      for (const clip of FORMULAS[step.lead].clips) await playClip(clip, token);
      banner?.classList.remove("is-now");
      if (token !== run) return;
      await new Promise((resolve) => { setTimeout(resolve, 350); });
    }
    if (!media) return;
    if (!media.clips.length) {
      // no verified recording yet: read along – the words light up at a calm speaking pace
      const repeat = Math.min(step.repeat || 1, 3);
      for (let i = 0; i < repeat; i += 1) {
        if (repeat > 1) dialog.querySelector("#learn-repeat").textContent = `${i + 1}. von ${repeat}`;
        for (let word = 0; word < media.words.length; word += 1) {
          if (token !== run) return;
          highlight(word);
          await new Promise((resolve) => { setTimeout(resolve, readTime(media.words[word].lat) / rate); });
          const phrase = media.phrases.find((item) => item.to === word);
          if (phrase) await new Promise((resolve) => { setTimeout(resolve, (echo ? 1600 + (phrase.to - phrase.from) * 550 : 350) / rate); });
        }
        highlight(-1);
        if (repeat > 1) await new Promise((resolve) => { setTimeout(resolve, 400); });
      }
      return;
    }
    // the recording already contains the repetitions (e.g. 3× in Rukūʿ) – then it plays once
    const repeat = media.clips[0].reps > 1 ? 1 : Math.min(step.repeat || 1, 3);
    for (let i = 0; i < repeat; i += 1) {
      if (token !== run) return;
      if (repeat > 1) dialog.querySelector("#learn-repeat").textContent = `${i + 1}. von ${repeat}`;
      await playFrom(0, { token });
      highlight(-1);
      if (repeat > 1) await new Promise((resolve) => { setTimeout(resolve, 300); });
    }
  }

  // ---- drawing --------------------------------------------------------------------------------------
  const POSE_NAMES = { stand: "Stehen (Qiyām)", takbir: "Takbīr", qiyamNavel: "Stehen (Qiyām)", qiyamChest: "Stehen (Qiyām)", ruku: "Verbeugung (Rukūʿ)", sujud: "Niederwerfung (Sudschūd)", sit: "Sitzen (Dschalsa)", tashahhud: "Sitzen mit Taschahhud", salamR: "Salām rechts", salamL: "Salām links", qunut: "Stehen mit Bittgebet (Qunūt)", folded: "Stehen, Hände gefaltet", bow: "Verneigung", kneel: "Knien", cross1: "Kreuzzeichen" };

  function renderStep(step) {
    const box = dialog.querySelector("#learn-step");
    const poseKey = step.pose === "qiyam" ? "qiyamNavel" : step.pose;
    const focus = FOCUS[step.cross ? "cross1" : poseKey] || [];
    const done = learned().has(stepKey(step));
    const rulingsHtml = (step.rulings || []).map((key) => {
      const value = ruling(key, tradition);
      const label = RULING_LABELS[value];
      const names = { niyya: "Absicht", takbir_ihram: "Eröffnungs-Takbīr", raise_hands: "Hände heben", qiyam: "Stehen", hands: "Hände halten", opening: "Eröffnungs-Bittgebet", refuge: "Taʿawwudh", basmala: "Basmala", fatiha: "Fātiḥa", sura: "weitere Sure", takbir_move: "„Allāhu akbar“ beim Wechsel", ruku: "Verbeugung", ruku_dhikr: "Lobpreis im Rukūʿ", rise: "Aufrichten", rise_dhikr: "Worte beim Aufrichten", sujud: "Niederwerfung", sujud_dhikr: "Lobpreis im Sudschūd", jalsa: "Sitzen dazwischen", jalsa_dhikr: "„Rabbi ghfir lī“", first_tashahhud: "Erstes Sitzen mit Taschahhud", last_sitting: "Letztes Sitzen", last_tashahhud: "Taschahhud", salawat: "Ṣalawāt", protection: "Bittgebet", finger: "Zeigefinger heben", salam_right: "Salām rechts", salam_left: "Salām links" };
      return `<span class="ruling ${label.tone}" title="${escapeHtml(label.long)}"><b>${label.short}</b> ${escapeHtml(names[key] || key)}</span>`;
    }).join("");
    let body = "";
    if (religion === "islam" && media) {
      const ar = media.words.map((word, i) => `<span class="lw" data-w="${i}">${escapeHtml(word.ar)}</span>${media.phrases.find((p) => p.to === i && p.marker) ? ` <i class="ayah-mark">﴿${media.phrases.find((p) => p.to === i).marker}﴾</i>` : ""}`).join(" ");
      const lat = media.words.map((word, i) => `<span class="lw" data-w="${i}" title="${escapeHtml(word.gloss || "")}">${escapeHtml(word.lat)}</span>`).join(" ");
      const tr = media.phrases.map((phrase, k) => `<span class="lp" data-p="${k}">${escapeHtml(phrase.text)}</span>`).join(" ");
      body = `
        ${show.original ? `<p class="learn-original is-arabic" dir="rtl" lang="ar">${ar}</p>` : ""}
        ${show.translit ? `<p class="learn-translit">${lat}</p>` : ""}
        ${show.translation ? `<p class="learn-translation">${tr}</p>` : ""}`;
    } else if (step.line) {
      body = `
        ${show.original ? `<p class="learn-original" lang="${original === "greek" ? "el" : "la"}">${escapeHtml(step.line[original])}</p>` : ""}
        ${original === "greek" && show.translit ? `<p class="learn-translit">${escapeHtml(step.line.translit)}</p>` : ""}
        ${show.translation ? `<p class="learn-translation">${escapeHtml(step.line.tr[lang])}</p>` : ""}`;
    }
    box.innerHTML = `
      <div class="learn-head">${step.rakah ? `<span class="learn-rakah">Rakʿa ${step.rakah} von ${prayer.rakat}</span>` : ""}<span class="learn-repeat" id="learn-repeat"></span><span class="learn-count">Schritt ${index + 1} von ${steps.length}</span></div>
      <h3>${escapeHtml(step.title)}${step.repeat ? ` <small>× ${step.repeat}</small>` : ""}</h3>
      ${rulingsHtml ? `<div class="learn-rulings">${rulingsHtml}</div>` : ""}
      ${step.lead || step.transition ? `<div class="learn-move" id="learn-move">🔄 ${step.transition === "rise" ? "Wechsel zum Stehen mit „Samiʿa llāhu liman ḥamidah“ – hier kein „Allāhu akbar“" : "Wechsel der Haltung mit <b>„Allāhu akbar“</b> – sprich es, während du dich bewegst"}${step.via === "takbir" ? " · Hände heben" : ""}</div>` : ""}
      ${focus.length ? `<div class="learn-focus"><strong>Achte auf:</strong><ol>${focus.map(([, text]) => `<li>${escapeHtml(text)}</li>`).join("")}</ol></div>` : ""}
      ${step.translitText ? `<p class="learn-translit">${escapeHtml(step.translitText)}</p>` : ""}
      ${step.text ? `<p class="learn-plain">${escapeHtml(step.text)}</p>` : ""}
      ${body}
      ${step.note ? `<p class="learn-note">💡 ${escapeHtml(step.note)}</p>` : ""}
      ${religion === "islam" && media && !media.clips.length ? '<p class="learn-readalong">📖 Für diesen Teil gibt es noch keine geprüfte Aufnahme. Lies mit – die Wörter leuchten im ruhigen Sprechtempo auf.</p>' : ""}
      ${religion === "islam" && (step.formula || step.surah) ? `<button type="button" class="learn-learned ${done ? "is-done" : ""}" id="learn-learned">${done ? "✓ Kann ich auswendig" : "Ich kann das auswendig"}</button>` : ""}`;
    lastHighlighted = -1;
    box.querySelector("#learn-learned")?.addEventListener("click", () => {
      const set = learned();
      const key = stepKey(step);
      if (set.has(key)) set.delete(key); else set.add(key);
      saveFaith({ learnedSteps: [...set] });
      renderStep(step);
      drawProgress();
    });
  }

  function drawProgress() {
    const set = learned();
    dialog.querySelector("#learn-progress").innerHTML = steps.map((item, i) => `<button type="button" class="${i === index ? "is-now" : i < index ? "is-done" : ""} ${item.rakah && item.rakah !== steps[i - 1]?.rakah ? "is-rakah" : ""} ${set.has(stepKey(item)) ? "is-learned" : ""}" data-go="${i}" title="${escapeHtml(item.title)}"></button>`).join("");
    dialog.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => { index = Number(button.dataset.go); draw(); }));
  }

  async function draw() {
    const token = ++run;
    held = false;
    stepDone = false;
    stopSound();
    clearTimeout(timer);
    clearTimeout(poseTimer);
    clearInterval(crossTimer);
    const step = steps[index];
    updatePlay();
    if (step.cross) {
      const seq = tradition === "orthodox" ? ["cross1", "cross2", "cross4", "cross3"] : ["cross1", "cross2", "cross3", "cross4"];
      let i = 0;
      moveTo(seq[0]);
      crossTimer = setInterval(() => { i = (i + 1) % (seq.length + 1); moveTo(i === seq.length ? "folded" : seq[i], 600); }, 1000);
    } else if (!(playing && sound && step.lead && religion === "islam")) posture(step);
    svg.classList.remove("cue-on");
    dialog.querySelector("#learn-cue").hidden = true;
    const poseKey = step.pose === "qiyam" ? "qiyamNavel" : step.pose;
    dialog.querySelector("#learn-pose-name").textContent = POSE_NAMES[step.cross ? "cross1" : poseKey] || "";
    media = null;
    if (religion === "islam" && step.formula) {
      media = formulaMedia(step.formula);
      if ("cue" in step) media.cue = step.cue;
    }
    renderStep(step);
    drawProgress();
    dialog.querySelector("#learn-prev").disabled = index === 0;
    if (religion === "islam" && step.surah) {
      try {
        const loaded = await quranMedia(step.surah);
        if (token !== run) return;
        media = loaded;
        renderStep(step);
      } catch {
        dialog.querySelector("#learn-step").insertAdjacentHTML("beforeend", '<p class="muted small">Arabischer Text, Wort-Markierung und Rezitation brauchen eine Internetverbindung.</p>');
      }
    }
    if (!playing) return;
    const started = Date.now();
    await playStep(step, token);
    if (token !== run || !playing) return;
    stepDone = true;
    const minimum = sound ? 1200 : 5000; // give the posture time even without sound
    timer = setTimeout(() => {
      if (token !== run || !playing || held) return;
      if (index < steps.length - 1) { index += 1; draw(); } else { playing = false; updatePlay(); }
    }, Math.max(900, minimum - (Date.now() - started)));
  }
  function updatePlay() {
    const button = dialog.querySelector("#learn-play");
    const active = (playing || wordActive) && !held;
    button.textContent = active ? "⏸" : "▶";
    button.setAttribute("aria-label", active ? "Pause" : held ? "Weiter abspielen" : "Tutorial abspielen");
  }
  function posture(step) {
    clearTimeout(poseTimer);
    if (!step.via) return moveTo(step.pose);
    moveTo(step.via, 450); // e.g. raise the hands first, then bow
    poseTimer = setTimeout(() => moveTo(step.pose, 750), 550);
    return undefined;
  }
  const rebuild = () => {
    steps = religion === "islam" ? salahSteps(tradition, prayer, suras) : christianSteps(tradition);
    index = Math.min(index, steps.length - 1);
    draw();
  };

  // tapping a word: jump there (or play only that word, optionally three times)
  dialog.querySelector("#learn-step").addEventListener("click", async (event) => {
    const node = event.target.closest(".lw");
    if (!node || !media) return;
    if (!media.clips.length) {
      highlight(Number(node.dataset.w));
      return;
    }
    const word = Number(node.dataset.w);
    playing = false;
    held = false;
    wordActive = true;
    const token = ++run;
    stopSound();
    clearTimeout(timer);
    updatePlay();
    const times = tapMode === "word" && loopWord ? 3 : 1;
    for (let i = 0; i < times; i += 1) {
      if (token !== run) return;
      highlight(word);
      await playFrom(word, { onlyWord: tapMode === "word", token });
      if (times > 1) await new Promise((resolve) => { setTimeout(resolve, 450); });
    }
    if (token === run) {
      highlight(-1);
      wordActive = false;
      updatePlay();
    }
  });

  dialog.querySelector("#learn-prev").addEventListener("click", () => { if (index > 0) { index -= 1; draw(); } });
  dialog.querySelector("#learn-next").addEventListener("click", () => { index = index === steps.length - 1 ? 0 : index + 1; draw(); });
  // ▶/⏸ pauses and continues at the same spot – also after tapping a word
  dialog.querySelector("#learn-play").addEventListener("click", () => {
    if (held) {
      held = false;
      if (audio && !audio.ended && resumeTick) {
        audio.play().catch(() => {});
        frame = requestAnimationFrame(resumeTick);
        updatePlay();
      } else if (playing) {
        if (stepDone && index < steps.length - 1) index += 1;
        draw();
      } else updatePlay();
      return;
    }
    if (playing || wordActive) {
      held = true;
      cancelAnimationFrame(frame);
      if (audio && resumeTick) audio.pause();
      else { // read-along or between steps: stop here, ▶ continues with this step
        run += 1;
        clearTimeout(timer);
        stopSound();
        wordActive = false;
      }
      updatePlay();
      return;
    }
    playing = true;
    draw();
  });
  dialog.querySelector("#learn-tradition").addEventListener("change", (event) => { tradition = event.target.value; drawSchool(); rebuild(); });
  dialog.querySelector("#learn-sound").addEventListener("click", (event) => {
    sound = !sound;
    event.currentTarget.textContent = sound ? "🔊" : "🔇";
    if (!sound) stopSound();
  });
  dialog.querySelector("#learn-rate").addEventListener("change", (event) => { rate = Number(event.target.value); if (audio) audio.playbackRate = rate; });
  dialog.querySelector("#learn-echo").addEventListener("change", (event) => { echo = event.target.checked; });
  dialog.querySelectorAll('input[name="tap"]').forEach((input) => input.addEventListener("change", () => { tapMode = input.value; }));
  dialog.querySelector("#learn-loop")?.addEventListener("change", (event) => { loopWord = event.target.checked; });
  dialog.querySelector("#learn-prayer")?.addEventListener("change", (event) => { prayer = PRAYER_TYPES.find((item) => item.id === event.target.value); index = 0; rebuild(); });
  dialog.querySelectorAll("[data-sura]").forEach((select) => select.addEventListener("change", () => { suras[Number(select.dataset.sura)] = Number(select.value); rebuild(); }));
  dialog.querySelector("#learn-lang").addEventListener("change", (event) => { lang = event.target.value; draw(); });
  dialog.querySelector("#learn-original")?.addEventListener("change", (event) => { original = event.target.value; draw(); });
  dialog.querySelectorAll("[data-show]").forEach((input) => input.addEventListener("change", () => { show = { ...show, [input.dataset.show]: input.checked }; draw(); }));
  dialog.addEventListener("keydown", (event) => {
    if (event.target.closest("select, input")) return;
    if (event.key === "ArrowRight") dialog.querySelector("#learn-next").click();
    if (event.key === "ArrowLeft") dialog.querySelector("#learn-prev").click();
    if (event.key === " ") { event.preventDefault(); dialog.querySelector("#learn-play").click(); }
  });
  function drawSchool() {
    const notes = TRADITION_NOTES[tradition] || [];
    const name = traditions.find(([id]) => id === tradition)?.[1] || "";
    dialog.querySelector("#learn-school-notes").innerHTML = `<summary>Besonderheiten: ${escapeHtml(name)}</summary><ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`;
  }
  window.speechSynthesis?.getVoices(); // voices load lazily
  drawSchool();
  draw();
}

export { POSES, SHORT_SURAS, salahSteps };
