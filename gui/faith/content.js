// Content for the "Wege" tools: the same depth for Christians and Muslims.
// Sources are given wherever a text comes from scripture or tradition.

// ---- Gefühls-Kompass -------------------------------------------------------------------------
export const EMOTIONS = [
  { id: "tempted", icon: "🔥", label: "In Versuchung", themes: ["temptation", "strength"], moment: "craving", text: "Das Verlangen ist stark, aber es ist nicht dein Herr. Du darfst jetzt um Hilfe bitten." },
  { id: "anxious", icon: "😟", label: "Ängstlich", themes: ["peace", "comfort"], moment: "anxiety", text: "Angst macht alles größer, als es ist. Atme. Du bist nicht allein." },
  { id: "guilty", icon: "😔", label: "Schuldig", themes: ["forgiveness"], moment: "relapse", text: "Schuld zeigt, dass dein Gewissen lebt. Gottes Barmherzigkeit ist größer als dein Fehler." },
  { id: "relapse", icon: "🌧️", label: "Nach einem Rückfall", themes: ["renewal", "forgiveness"], moment: "relapse", text: "Fallen gehört zum Weg vieler Menschen. Entscheidend ist, dass du wieder aufstehst – heute." },
  { id: "lonely", icon: "😶", label: "Einsam", themes: ["love", "comfort"], moment: "anxiety", text: "Du bist gesehen. Von Gott – und von Menschen, die genau das kennen." },
  { id: "sad", icon: "💧", label: "Traurig", themes: ["comfort", "hope"], moment: "anxiety", text: "Tränen sind kein Zeichen von Schwäche. Auch die dunkelste Nacht geht vorbei." },
  { id: "weak", icon: "😩", label: "Schwach & müde", themes: ["strength", "patience"], moment: "craving", text: "Du musst heute nicht stark sein. Nur ehrlich – und einen Schritt nach dem anderen gehen." },
  { id: "angry", icon: "😤", label: "Wütend", themes: ["patience", "peace"], moment: "anxiety", text: "Wut ist ein Signal, kein Befehl. Setz dich hin, atme, und warte ein paar Minuten." },
  { id: "hopeless", icon: "🕳️", label: "Hoffnungslos", themes: ["hope"], moment: "anxiety", text: "Hoffnungslosigkeit lügt. Es gibt einen Ausweg – auch wenn du ihn noch nicht siehst. Bitte sprich mit jemandem." },
  { id: "restless", icon: "🌀", label: "Unruhig", themes: ["peace", "trust"], moment: "anxiety", text: "Unruhig ist unser Herz, bis es Ruhe findet. Gönn dir einen Moment der Stille." },
  { id: "lost", icon: "🧭", label: "Orientierungslos", themes: ["trust", "hope"], moment: "morning", text: "Du musst nicht den ganzen Weg sehen. Nur den nächsten Schritt." },
  { id: "grateful", icon: "🌻", label: "Dankbar", themes: ["gratitude"], moment: "gratitude", text: "Wie schön. Halte diesen Moment fest – Dankbarkeit macht stark für schwere Tage." },
];

// ---- Wort des Tages: Hadith / christliche Tradition ----------------------------------------------
export const HADITH = [
  ["Die Taten werden nur nach den Absichten beurteilt, und jedem Menschen steht nur das zu, was er beabsichtigt hat.", "Buchārī 1, Muslim 1907"],
  ["Nicht der ist stark, der andere im Ringkampf besiegt. Stark ist vielmehr, wer sich im Zorn beherrscht.", "Buchārī 6114, Muslim 2609"],
  ["Alle Kinder Adams begehen Fehler, und die Besten unter denen, die Fehler begehen, sind die, die bereuen.", "Tirmidhī 2499, Ibn Mādscha 4251"],
  ["Allah freut sich über die Reue Seines Dieners mehr als jemand, der sein verlorenes Reittier mitten in der Wüste wiederfindet.", "Buchārī 6309, Muslim 2747"],
  ["Wer an Allah und den Jüngsten Tag glaubt, der soll Gutes sprechen oder schweigen.", "Buchārī 6018, Muslim 47"],
  ["Dein Lächeln für deinen Bruder ist eine Ṣadaqa.", "Tirmidhī 1956"],
  ["Die Barmherzigen – ihnen erweist der Allerbarmer Barmherzigkeit. Seid barmherzig mit denen auf der Erde, so wird Der im Himmel mit euch barmherzig sein.", "Tirmidhī 1924, Abū Dāwūd 4941"],
  ["Achte auf Allah, so wird Er auf dich achten. Achte auf Allah, so wirst du Ihn vor dir finden.", "Tirmidhī 2516"],
  ["Wie wunderbar ist die Lage des Gläubigen! Alles ist gut für ihn: Trifft ihn Gutes, ist er dankbar; trifft ihn Schlechtes, ist er geduldig – und beides ist gut für ihn.", "Muslim 2999"],
  ["Allah schaut nicht auf eure Körper und eure Gestalt, sondern Er schaut auf eure Herzen und eure Taten.", "Muslim 2564"],
  ["Der Gläubige ist für den Gläubigen wie ein Gebäude, dessen Teile einander stützen.", "Buchārī 481, Muslim 2585"],
  ["Keiner von euch glaubt wirklich, bis er für seinen Bruder liebt, was er für sich selbst liebt.", "Buchārī 13, Muslim 45"],
  ["Die Taten, die Allah am meisten liebt, sind die beständigsten – auch wenn sie gering sind.", "Buchārī 6464, Muslim 783"],
  ["Nutze fünf Dinge vor fünf: deine Jugend vor deinem Alter, deine Gesundheit vor deiner Krankheit, deinen Reichtum vor deiner Armut, deine freie Zeit vor deiner Beschäftigung und dein Leben vor deinem Tod.", "al-Ḥākim, al-Mustadrak 7846"],
  ["Allah ist sanft und liebt die Sanftheit in allen Dingen.", "Buchārī 6927, Muslim 2593"],
  ["Allah sagt: O Sohn Adams, solange du Mich anrufst und auf Mich hoffst, vergebe Ich dir, was von dir kam, und es kümmert Mich nicht.", "Tirmidhī 3540 (Ḥadīth Qudsī)"],
  ["Allah sagt: Wer sich Mir eine Spanne nähert, dem nähere Ich Mich eine Elle. Und wer gehend zu Mir kommt, zu dem komme Ich eilend.", "Buchārī 7405, Muslim 2675 (Ḥadīth Qudsī)"],
  ["Lass das, was dich zweifeln lässt, für das, was dich nicht zweifeln lässt.", "Tirmidhī 2518, an-Nasāʾī 5711"],
  ["Strebe nach dem, was dir nützt, bitte Allah um Hilfe und gib nicht auf.", "Muslim 2664"],
  ["Wenn einer von euch zornig wird, während er steht, soll er sich setzen. Geht der Zorn nicht weg, soll er sich hinlegen.", "Abū Dāwūd 4782"],
  ["Wer den Menschen nicht dankt, dankt Allah nicht.", "Abū Dāwūd 4811, Tirmidhī 1954"],
  ["Wer einen Weg beschreitet, um Wissen zu suchen, dem erleichtert Allah dadurch einen Weg ins Paradies.", "Muslim 2699"],
];

export const CHRISTIAN_WORDS = [
  ["Du hast uns zu dir hin geschaffen, und unruhig ist unser Herz, bis es ruht in dir.", "Augustinus, Bekenntnisse I,1"],
  ["Liebe – und dann tu, was du willst.", "Augustinus, Predigt über den 1. Johannesbrief"],
  ["Nichts soll dich verwirren, nichts dich erschrecken. Alles vergeht, Gott ändert sich nicht. Die Geduld erreicht alles. Wer Gott hat, dem fehlt nichts. Gott allein genügt.", "Teresa von Ávila"],
  ["Von guten Mächten wunderbar geborgen, erwarten wir getrost, was kommen mag. Gott ist bei uns am Abend und am Morgen und ganz gewiss an jedem neuen Tag.", "Dietrich Bonhoeffer, 1944"],
  ["Ich glaube, dass Gott aus allem, auch aus dem Bösesten, Gutes entstehen lassen kann und will.", "Dietrich Bonhoeffer"],
  ["Herr, mach mich zu einem Werkzeug deines Friedens: dass ich liebe, wo man hasst; dass ich verzeihe, wo man beleidigt.", "Friedensgebet (Frankreich 1912, Franz von Assisi zugeschrieben)"],
  ["Hab Geduld mit allen Dingen, vor allem aber mit dir selbst.", "Franz von Sales"],
  ["Bete, als hinge alles von Gott ab; handle, als hinge alles von dir ab.", "Ignatianische Tradition"],
  ["Befiehl du deine Wege und was dein Herze kränkt der allertreusten Pflege des, der den Himmel lenkt.", "Paul Gerhardt, 1653"],
  ["Aus tiefer Not schrei ich zu dir, Herr Gott, erhör mein Rufen.", "Martin Luther, 1524 (nach Psalm 130)"],
  ["Führe, freundliches Licht, durch die Dunkelheit, die mich umgibt – führe du mich weiter.", "John Henry Newman, 1833"],
  ["Bete und arbeite.", "Benediktinische Tradition"],
  ["Gott verlangt nicht, dass wir Erfolg haben, sondern dass wir treu sind.", "christliche Tradition"],
  ["Wer singt, betet doppelt.", "Augustinus zugeschrieben"],
  ["Die Herrlichkeit Gottes ist der lebendige Mensch.", "Irenäus von Lyon"],
  ["Gott ist nicht fern von einem jeden unter uns. Denn in ihm leben, weben und sind wir.", "Apostelgeschichte 17,27–28"],
];

// ---- Namen Gottes ---------------------------------------------------------------------------
export const ASMA = [
  ["Ar-Raḥmān", "Der Allerbarmer"], ["Ar-Raḥīm", "Der Barmherzige"], ["Al-Malik", "Der König"], ["Al-Quddūs", "Der Heilige"], ["As-Salām", "Der Frieden"],
  ["Al-Muʾmin", "Der Sicherheit Gewährende"], ["Al-Muhaymin", "Der Behütende"], ["Al-ʿAzīz", "Der Allmächtige"], ["Al-Dschabbār", "Der Unwiderstehliche, der Heilende"], ["Al-Mutakabbir", "Der Erhabene"],
  ["Al-Chāliq", "Der Schöpfer"], ["Al-Bāriʾ", "Der Erschaffer"], ["Al-Muṣawwir", "Der Gestalter"], ["Al-Ghaffār", "Der immer wieder Vergebende"], ["Al-Qahhār", "Der Bezwingende"],
  ["Al-Wahhāb", "Der Schenkende"], ["Ar-Razzāq", "Der Versorger"], ["Al-Fattāḥ", "Der Öffnende"], ["Al-ʿAlīm", "Der Allwissende"], ["Al-Qābiḍ", "Der Zurückhaltende"],
  ["Al-Bāsiṭ", "Der Ausbreitende"], ["Al-Chāfiḍ", "Der Erniedrigende"], ["Ar-Rāfiʿ", "Der Erhöhende"], ["Al-Muʿizz", "Der Ehre Verleihende"], ["Al-Mudhill", "Der Demütigende"],
  ["As-Samīʿ", "Der Allhörende"], ["Al-Baṣīr", "Der Allsehende"], ["Al-Ḥakam", "Der Richter"], ["Al-ʿAdl", "Der Gerechte"], ["Al-Laṭīf", "Der Feinfühlige"],
  ["Al-Chabīr", "Der Kundige"], ["Al-Ḥalīm", "Der Nachsichtige"], ["Al-ʿAẓīm", "Der Gewaltige"], ["Al-Ghafūr", "Der Vergebende"], ["Asch-Schakūr", "Der Dankbare"],
  ["Al-ʿAliyy", "Der Hohe"], ["Al-Kabīr", "Der Große"], ["Al-Ḥafīẓ", "Der Bewahrer"], ["Al-Muqīt", "Der Ernährer"], ["Al-Ḥasīb", "Der Genügende"],
  ["Al-Dschalīl", "Der Majestätische"], ["Al-Karīm", "Der Großzügige"], ["Ar-Raqīb", "Der Wachsame"], ["Al-Mudschīb", "Der Erhörende"], ["Al-Wāsiʿ", "Der Allumfassende"],
  ["Al-Ḥakīm", "Der Weise"], ["Al-Wadūd", "Der Liebevolle"], ["Al-Madschīd", "Der Ruhmreiche"], ["Al-Bāʿith", "Der Auferweckende"], ["Asch-Schahīd", "Der Zeuge"],
  ["Al-Ḥaqq", "Die Wahrheit"], ["Al-Wakīl", "Der Sachwalter"], ["Al-Qawiyy", "Der Starke"], ["Al-Matīn", "Der Feste"], ["Al-Waliyy", "Der Schutzherr"],
  ["Al-Ḥamīd", "Der Lobenswerte"], ["Al-Muḥṣī", "Der alles Erfassende"], ["Al-Mubdiʾ", "Der Beginnende"], ["Al-Muʿīd", "Der Wiederherstellende"], ["Al-Muḥyī", "Der Leben Gebende"],
  ["Al-Mumīt", "Der sterben Lässt"], ["Al-Ḥayy", "Der Lebendige"], ["Al-Qayyūm", "Der Beständige"], ["Al-Wādschid", "Der Findende"], ["Al-Mādschid", "Der Edle"],
  ["Al-Wāḥid", "Der Eine"], ["Al-Aḥad", "Der Einzige"], ["Aṣ-Ṣamad", "Der Unabhängige"], ["Al-Qādir", "Der Fähige"], ["Al-Muqtadir", "Der Allmächtige"],
  ["Al-Muqaddim", "Der Voranbringende"], ["Al-Muʾachchir", "Der Zurückstellende"], ["Al-Awwal", "Der Erste"], ["Al-Āchir", "Der Letzte"], ["Aẓ-Ẓāhir", "Der Offenkundige"],
  ["Al-Bāṭin", "Der Verborgene"], ["Al-Wālī", "Der Herrschende"], ["Al-Mutaʿālī", "Der Erhabene"], ["Al-Barr", "Der Gütige"], ["At-Tawwāb", "Der die Reue Annehmende"],
  ["Al-Muntaqim", "Der Vergeltende"], ["Al-ʿAfuww", "Der Verzeihende"], ["Ar-Raʾūf", "Der Mitfühlende"], ["Mālik al-Mulk", "Der Herr der Herrschaft"], ["Dhu l-Dschalāli wa l-Ikrām", "Der Herr der Majestät und der Ehre"],
  ["Al-Muqsiṭ", "Der Ausgleichende"], ["Al-Dschāmiʿ", "Der Versammelnde"], ["Al-Ghaniyy", "Der Unbedürftige"], ["Al-Mughnī", "Der reich Machende"], ["Al-Māniʿ", "Der Abwehrende"],
  ["Aḍ-Ḍārr", "Der Schaden Zulassende"], ["An-Nāfiʿ", "Der Nutzen Bringende"], ["An-Nūr", "Das Licht"], ["Al-Hādī", "Der Rechtleitende"], ["Al-Badīʿ", "Der unvergleichliche Schöpfer"],
  ["Al-Bāqī", "Der Bleibende"], ["Al-Wārith", "Der Erbe"], ["Ar-Raschīd", "Der zum Rechten Führende"], ["Aṣ-Ṣabūr", "Der Geduldige"],
];

// [name, reference, book, chapter, verse]
export const GOD_NAMES = [
  ["Vater unser im Himmel", "Matthäus 6,9", 40, 6, 9], ["Der Herr, mein Hirte", "Psalm 23,1", 19, 23, 1], ["Ich bin, der ich bin", "2. Mose 3,14", 2, 3, 14],
  ["Immanuel – Gott mit uns", "Matthäus 1,23", 40, 1, 23], ["Der gute Hirte", "Johannes 10,11", 43, 10, 11], ["Das Licht der Welt", "Johannes 8,12", 43, 8, 12],
  ["Das Brot des Lebens", "Johannes 6,35", 43, 6, 35], ["Der Weg, die Wahrheit und das Leben", "Johannes 14,6", 43, 14, 6], ["Die Auferstehung und das Leben", "Johannes 11,25", 43, 11, 25],
  ["Der wahre Weinstock", "Johannes 15,5", 43, 15, 5], ["Die Tür", "Johannes 10,9", 43, 10, 9], ["Lamm Gottes", "Johannes 1,29", 43, 1, 29],
  ["Wunder-Rat, Gott-Held, Ewig-Vater, Friede-Fürst", "Jesaja 9,5", 23, 9, 5], ["Alpha und Omega", "Offenbarung 22,13", 66, 22, 13], ["Der Tröster – Heiliger Geist", "Johannes 14,26", 43, 14, 26],
  ["Gott allen Trostes", "2. Korinther 1,3", 47, 1, 3], ["Gott der Hoffnung", "Römer 15,13", 45, 15, 13], ["Gott des Friedens", "Römer 15,33", 45, 15, 33],
  ["Der Gott, der mich sieht", "1. Mose 16,13", 1, 16, 13], ["Der Herr, dein Arzt", "2. Mose 15,26", 2, 15, 26], ["Der Herr, mein Panier", "2. Mose 17,15", 2, 17, 15],
  ["Mein Fels und meine Burg", "Psalm 18,3", 19, 18, 3], ["Meine Zuflucht", "Psalm 91,2", 19, 91, 2], ["Mein Erlöser", "Hiob 19,25", 18, 19, 25],
  ["Der Heiland", "Lukas 2,11", 42, 2, 11], ["Freund", "Johannes 15,15", 43, 15, 15], ["Gott ist Liebe", "1. Johannes 4,8", 62, 4, 8],
  ["Abba, lieber Vater", "Römer 8,15", 45, 8, 15], ["König aller Könige", "Offenbarung 19,16", 66, 19, 16], ["Der helle Morgenstern", "Offenbarung 22,16", 66, 22, 16],
];

// ---- Geschichten der Umkehr ---------------------------------------------------------------------
export const STORIES = [
  { religion: "islam", title: "Adam und Ḥawwāʾ", icon: "🍃", ref: "Koran 7:19–23", target: { surah: 7, ayah: 19 }, text: "Die ersten Menschen ließen sich verführen und aßen vom verbotenen Baum. Doch sie versteckten sich nicht in Scham, sondern wandten sich an ihren Herrn: „Unser Herr, wir haben uns selbst Unrecht getan …“ – und Allah nahm ihre Reue an.", lesson: "Der erste Fehler der Menschheit endete nicht in Verzweiflung, sondern in Vergebung." },
  { religion: "islam", title: "Yūnus im Bauch des Wals", icon: "🐋", ref: "Koran 21:87–88; 37:139–148", target: { surah: 21, ayah: 87 }, text: "Yūnus lief davon und landete in der tiefsten Dunkelheit – im Meer, in der Nacht, im Bauch des Wals. Von dort rief er: „Es gibt keinen Gott außer Dir … ich gehörte zu denen, die Unrecht tun.“ Und Allah rettete ihn.", lesson: "Kein Ort ist zu dunkel, um von dort aus zu beten." },
  { religion: "islam", title: "Yūsuf widersteht der Versuchung", icon: "🚪", ref: "Koran 12:23–34", target: { surah: 12, ayah: 23 }, text: "Yūsuf wurde verführt, die Türen waren verschlossen, niemand sah zu. Er sagte: „Ich suche Zuflucht bei Allah“ und rannte zur Tür. Lieber ging er ins Gefängnis, als nachzugeben – und wurde später erhöht.", lesson: "Weglaufen ist manchmal die stärkste Tat. Lauf zur Tür." },
  { religion: "islam", title: "Mūsā bittet um Vergebung", icon: "🌊", ref: "Koran 28:15–16", target: { surah: 28, ayah: 15 }, text: "Mūsā tat in einem Moment der Wut etwas Schreckliches. Er bereute sofort: „Mein Herr, ich habe mir selbst Unrecht getan, so vergib mir.“ Allah vergab ihm – und machte ihn zu einem der größten Propheten.", lesson: "Deine schlimmste Tat definiert nicht, wer du werden kannst." },
  { religion: "islam", title: "Die Geduld des Ayyūb", icon: "🌱", ref: "Koran 21:83–84; 38:41–44", target: { surah: 21, ayah: 83 }, text: "Ayyūb verlor Gesundheit, Besitz und Familie. Er klagte nicht gegen Gott, sondern zu Gott: „Mich hat Unheil getroffen, und Du bist der Barmherzigste der Barmherzigen.“ Allah heilte ihn und gab ihm doppelt zurück.", lesson: "Geduld ist nicht Schweigen – Geduld ist, Gott dein Leid zu erzählen." },
  { religion: "islam", title: "Der Mann, der 99 Menschen getötet hatte", icon: "🛤️", ref: "Buchārī 3470, Muslim 2766", text: "Ein Mann hatte schreckliche Schuld auf sich geladen und fragte einen Gelehrten, ob es noch Reue für ihn gebe. Die Antwort: „Wer stellt sich zwischen dich und die Reue?“ Er machte sich auf den Weg in ein besseres Land und starb unterwegs – und Allah vergab ihm.", lesson: "Schon der Weg zur Umkehr zählt bei Gott." },
  { religion: "christian", title: "Der verlorene Sohn", icon: "🏡", ref: "Lukas 15,11–32", target: { book: 42, chapter: 15, verse: 11 }, text: "Ein Sohn verprasst sein Erbe und landet ganz unten – bei den Schweinen. Er fasst den Mut, nach Hause zu gehen. Der Vater sieht ihn schon von Weitem, läuft ihm entgegen, umarmt ihn und feiert ein Fest.", lesson: "Gott wartet nicht mit Vorwürfen, sondern mit offenen Armen." },
  { religion: "christian", title: "Petrus fällt – und steht wieder auf", icon: "🐓", ref: "Lukas 22,54–62; Johannes 21,15–19", target: { book: 43, chapter: 21, verse: 15 }, text: "Petrus schwor, Jesus nie zu verlassen – und verleugnete ihn dreimal in einer Nacht. Er weinte bitterlich. Nach der Auferstehung fragte Jesus ihn dreimal: „Hast du mich lieb?“ und gab ihm einen neuen Auftrag.", lesson: "Auch nach dem tiefsten Versagen bekommst du eine neue Aufgabe." },
  { religion: "christian", title: "Zachäus", icon: "🌳", ref: "Lukas 19,1–10", target: { book: 42, chapter: 19, verse: 1 }, text: "Zachäus war verachtet und gierig. Jesus sah ihn im Baum und sagte: „Heute muss ich in deinem Haus einkehren.“ Zachäus änderte sein Leben und machte alles vierfach wieder gut.", lesson: "Wiedergutmachen gehört zur Umkehr – und macht frei." },
  { religion: "christian", title: "David und Psalm 51", icon: "👑", ref: "2. Samuel 12; Psalm 51", target: { book: 19, chapter: 51, verse: 1 }, text: "König David beging Ehebruch und schuldete den Tod eines Mannes. Als der Prophet Nathan ihn konfrontierte, versteckte er sich nicht. Er bekannte: „Ich habe gesündigt“ und betete Psalm 51: „Schaffe in mir, Gott, ein reines Herz.“", lesson: "Ehrlichkeit vor Gott ist der Anfang jeder Heilung." },
  { religion: "christian", title: "Josef widersteht der Versuchung", icon: "🚪", ref: "1. Mose 39", target: { book: 1, chapter: 39, verse: 1 }, text: "Josef wurde täglich verführt. Er sagte: „Wie sollte ich ein so großes Unrecht tun und gegen Gott sündigen?“ Als es ernst wurde, ließ er seinen Mantel zurück und floh.", lesson: "Lass lieber den Mantel zurück als deine Freiheit." },
  { religion: "christian", title: "Jesus und die Frau, die gesündigt hatte", icon: "🕊️", ref: "Johannes 8,1–11", target: { book: 43, chapter: 8, verse: 1 }, text: "Alle wollten Steine werfen. Jesus sagte: „Wer von euch ohne Sünde ist, werfe den ersten Stein.“ Einer nach dem anderen ging. Zu ihr sagte er: „So verdamme ich dich auch nicht; geh hin und sündige nicht mehr.“", lesson: "Gnade kommt zuerst – dann die Kraft, neu zu leben." },
];

// ---- 12 Schritte im Glauben (angelehnt an christliche 12-Schritte-Gruppen und Millati Islami) ------
export const STEPS = [
  { title: "Ehrlich werden", christian: "Ich gebe zu, dass ich meiner Sucht gegenüber machtlos bin und mein Leben aus dem Gleichgewicht geraten ist.", islam: "Ich erkenne meine Schwäche an – der Mensch wurde schwach erschaffen (4:28) – und dass ich so nicht weitermachen kann.", prompt: "Wo hat die Sucht mein Leben bestimmt?" },
  { title: "Hoffnung fassen", christian: "Ich glaube, dass Gott mich heilen und mein Leben wieder ordnen kann.", islam: "Ich glaube, dass Allah mich heilen kann und Seine Barmherzigkeit größer ist als meine Fehler (39:53).", prompt: "Woran merke ich schon heute, dass Veränderung möglich ist?" },
  { title: "Mich anvertrauen", christian: "Ich entscheide mich, meinen Willen und mein Leben der Sorge Gottes anzuvertrauen.", islam: "Ich entscheide mich, mich Allah hinzugeben und auf Ihn zu vertrauen (Tawakkul).", prompt: "Was fällt mir am schwersten loszulassen?" },
  { title: "Ehrlich hinschauen", christian: "Ich schaue ohne Angst auf mein Leben – auf Gutes wie Schlechtes.", islam: "Ich halte Muḥāsaba: Ich ziehe mich selbst zur Rechenschaft, bevor ich zur Rechenschaft gezogen werde.", prompt: "Welche Muster wiederholen sich bei mir?" },
  { title: "Bekennen", christian: "Ich bekenne Gott, mir selbst und einem Menschen meines Vertrauens meine Fehler (Jakobus 5,16).", islam: "Ich bekenne Allah meine Fehler im Duʿāʾ und spreche mit einem vertrauenswürdigen Menschen über meinen Weg – ohne mich bloßzustellen.", prompt: "Mit wem kann ich ehrlich sprechen?" },
  { title: "Bereit werden", christian: "Ich bin bereit, Gott meine Schwächen nehmen zu lassen.", islam: "Ich bin bereit, mit Allahs Hilfe meine schlechten Gewohnheiten abzulegen.", prompt: "Welche Schwäche möchte ich als Erstes abgeben?" },
  { title: "Demütig bitten", christian: "Ich bitte Gott demütig, mich von meinen Fehlern zu befreien.", islam: "Ich bitte Allah demütig um Vergebung (Istighfār) und um Kraft.", prompt: "Schreib dein persönliches Gebet dafür." },
  { title: "Aufschreiben", christian: "Ich schreibe auf, wem ich durch meine Sucht geschadet habe, und bin bereit, es gutzumachen.", islam: "Ich schreibe auf, wessen Rechte ich durch meine Sucht verletzt habe – auch das gehört zur Tauba.", prompt: "Wen habe ich verletzt?" },
  { title: "Wiedergutmachen", christian: "Ich mache Schaden wieder gut, wo immer es möglich ist, ohne andere dadurch zu verletzen.", islam: "Ich gebe zurück, was ich anderen schulde, und bitte um Verzeihung, wo es möglich ist.", prompt: "Was ist mein erster Schritt der Wiedergutmachung?" },
  { title: "Täglich prüfen", christian: "Ich prüfe jeden Abend mein Leben (Examen) und gebe Fehler sofort zu.", islam: "Ich halte jeden Abend Muḥāsaba und bitte sofort um Vergebung, wenn ich falle.", prompt: "Was lief heute gut – was nicht?" },
  { title: "Nähe suchen", christian: "Ich suche durch Gebet, Bibel und Stille die Nähe zu Gott.", islam: "Ich suche durch Ṣalāh, Dhikr und Koran die Nähe zu Allah.", prompt: "Wann und wo bete ich ab jetzt jeden Tag?" },
  { title: "Weitergeben", christian: "Ich gebe weiter, was ich empfangen habe, und helfe anderen auf ihrem Weg.", islam: "Ich gebe weiter, was mir geschenkt wurde, und stehe anderen bei – der Gläubige ist für den Gläubigen wie ein Gebäude.", prompt: "Wem kann ich auf seinem Weg helfen?" },
];

// ---- Reading plans ------------------------------------------------------------------------------
const JUZ = [[1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41], [9, 93], [11, 6], [12, 53], [15, 1], [17, 1],
  [18, 75], [21, 1], [23, 1], [25, 21], [27, 56], [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1]];
export const PLANS = [
  { id: "quran30", religion: "islam", title: "Den Koran in 30 Tagen", icon: "📗", text: "Jeden Tag ein Dschuzʾ – ideal für den Ramadan.", days: JUZ.map(([surah, ayah], index) => ({ label: `Dschuzʾ ${index + 1}`, target: { surah, ayah } })) },
  { id: "short", religion: "islam", title: "Kurze Suren fürs Herz", icon: "💚", text: "10 Tage mit Suren, die Trost geben und leicht zu lernen sind.", days: [1, 93, 94, 103, 112, 113, 114, 108, 110, 67].map((surah) => ({ label: `Sure ${surah}`, target: { surah } })) },
  { id: "yusuf", religion: "islam", title: "Sure Yūsuf in 7 Tagen", icon: "🌙", text: "Die „schönste Geschichte“ über Versuchung, Geduld und Vergebung.", days: [[12, 1], [12, 19], [12, 30], [12, 43], [12, 58], [12, 77], [12, 94]].map(([surah, ayah], index) => ({ label: `Teil ${index + 1}`, target: { surah, ayah } })) },
  { id: "psalms", religion: "christian", title: "Die Psalmen in 30 Tagen", icon: "📘", text: "Jeden Tag fünf Psalmen – Gebete für jede Lebenslage.", days: Array.from({ length: 30 }, (_, index) => ({ label: `Psalm ${index * 5 + 1}–${index * 5 + 5}`, target: { book: 19, chapter: index * 5 + 1 } })) },
  { id: "mark", religion: "christian", title: "Das Markusevangelium", icon: "✝️", text: "Das kürzeste Evangelium – ein Kapitel pro Tag.", days: Array.from({ length: 16 }, (_, index) => ({ label: `Markus ${index + 1}`, target: { book: 41, chapter: index + 1 } })) },
  { id: "proverbs", religion: "christian", title: "Sprüche in 31 Tagen", icon: "💡", text: "Ein Kapitel Weisheit für jeden Tag des Monats.", days: Array.from({ length: 31 }, (_, index) => ({ label: `Sprüche ${index + 1}`, target: { book: 20, chapter: index + 1 } })) },
  { id: "freedom", religion: "christian", title: "Frei in Christus – 7 Tage", icon: "🕊️", text: "Sieben Kapitel über Freiheit, Versuchung und Neuanfang.", days: [[43, 8, "Johannes 8"], [45, 6, "Römer 6"], [45, 8, "Römer 8"], [48, 5, "Galater 5"], [46, 10, "1. Korinther 10"], [42, 15, "Lukas 15"], [19, 51, "Psalm 51"]].map(([book, chapter, label]) => ({ label, target: { book, chapter } })) },
];

// ---- 21 Tage in die Freiheit ---------------------------------------------------------------------
export const FREEDOM = [
  ["Entscheidung", "Schreib auf, warum du frei werden willst – vor Gott und vor dir selbst.", "renewal"],
  ["Ehrlichkeit", "Nenne deine drei größten Auslöser. Was passiert kurz bevor das Verlangen kommt?", "temptation"],
  ["Der erste Atemzug", "Beginne den Tag mit einem kurzen Gebet – noch bevor du aufs Handy schaust.", "trust"],
  ["Aufräumen", "Entferne heute eine Versuchung aus deiner Umgebung: eine App, einen Kontakt, einen Vorrat.", "temptation"],
  ["Dankbarkeit", "Schreib drei Dinge auf, für die du heute dankbar bist.", "gratitude"],
  ["Gemeinschaft", "Schreib einem Menschen, der mit dir glaubt – im Glaubensraum oder persönlich.", "love"],
  ["Stille", "Nimm dir zehn Minuten Stille ohne Handy. Sag Gott einfach, wie es dir geht.", "peace"],
  ["Vergebung", "Vergib dir einen Fehler aus der Vergangenheit. Gott hat es schon getan.", "forgiveness"],
  ["Dein Körper", "Geh 20 Minuten spazieren. Dein Körper ist ein Geschenk, kein Mülleimer.", "strength"],
  ["Ein Wort im Herzen", "Lerne einen Vers auswendig, der dir in schweren Momenten hilft.", "strength"],
  ["Der Plan", "Schreib einen Wenn-Dann-Plan: Wenn das Verlangen kommt, dann …", "patience"],
  ["Wiedergutmachen", "Entschuldige dich bei einem Menschen, den deine Sucht verletzt hat.", "renewal"],
  ["Dienen", "Tu heute jemandem etwas Gutes – ohne es jemandem zu erzählen.", "love"],
  ["Halbzeit", "Schau zurück: Was hat sich in zwei Wochen verändert? Danke Gott dafür.", "gratitude"],
  ["Die Nacht", "Leg das Handy eine Stunde vor dem Schlafen weg und bete stattdessen.", "peace"],
  ["Verzicht", "Verzichte heute bewusst auf eine Kleinigkeit – als Training für dein Herz.", "patience"],
  ["Ein Brief", "Schreib einen Brief an dich selbst in einem Jahr. Was wünschst du dir?", "hope"],
  ["Familie", "Verbring bewusst Zeit mit Menschen, die dich lieben – ohne Bildschirm.", "love"],
  ["Die Welle", "Wenn heute Verlangen kommt: Warte 15 Minuten, bete und schau, wie es vergeht.", "temptation"],
  ["Weitergeben", "Ermutige jemanden, der auch kämpft. Deine Geschichte kann retten.", "hope"],
  ["Neuer Mensch", "Danke Gott für 21 Tage – und entscheide dich für die nächsten 21.", "renewal"],
];

// ---- Gutes tun / zurück in die Gesellschaft ---------------------------------------------------------
export const GOOD_DEEDS = [
  ["Familie", "📞", "Ruf jemanden an, den du lange vernachlässigt hast."],
  ["Familie", "🍲", "Koch für deine Familie oder lade jemanden zum Essen ein."],
  ["Familie", "🧸", "Verbring eine Stunde mit deinen Kindern oder Geschwistern – ohne Handy."],
  ["Familie", "💌", "Entschuldige dich bei jemandem, den deine Sucht verletzt hat."],
  ["Nachbarn", "🛒", "Hilf einem älteren Nachbarn beim Einkaufen oder Tragen."],
  ["Nachbarn", "🙂", "Grüße bewusst und lächle – auch das ist eine gute Tat."],
  ["Nachbarn", "🔧", "Repariere etwas für jemanden, der es nicht selbst kann."],
  ["Gemeinde", "🕌", "Hilf in deiner Moschee oder Kirche beim Aufbau, Putzen oder Kochen."],
  ["Gemeinde", "🍽️", "Hilf beim gemeinsamen Iftar, Gemeindefest oder Kirchencafé."],
  ["Gemeinde", "🤝", "Sprich jemanden an, der neu oder allein in der Gemeinde ist."],
  ["Gesellschaft", "🥖", "Engagiere dich ehrenamtlich bei der Tafel oder einer Suppenküche."],
  ["Gesellschaft", "❤️", "Spende Blut – du kannst damit Leben retten."],
  ["Gesellschaft", "🏥", "Besuche jemanden im Krankenhaus oder Pflegeheim."],
  ["Gesellschaft", "📚", "Lies jemandem vor oder hilf bei Hausaufgaben."],
  ["Gesellschaft", "⚽", "Bring dich im Sportverein ein – Struktur und Gemeinschaft helfen."],
  ["Natur", "🌿", "Sammle 15 Minuten Müll im Park oder an deiner Straße."],
  ["Natur", "🌳", "Pflanze etwas oder kümmere dich um Pflanzen."],
  ["Neuanfang", "📝", "Überarbeite deinen Lebenslauf oder schreib eine Bewerbung."],
  ["Neuanfang", "🎓", "Melde dich für einen Kurs an (z. B. Volkshochschule)."],
  ["Neuanfang", "🤗", "Geh zu einer Selbsthilfegruppe – oder biete an, jemanden zu begleiten."],
  ["Teilen", "💶", "Gib einen Teil des Geldes, das du durch deinen Verzicht gespart hast."],
  ["Teilen", "🎁", "Verschenke etwas, das du nicht mehr brauchst."],
  ["Teilen", "⏳", "Schenke Zeit statt Geld: Hör einfach jemandem zu."],
  ["Teilen", "✉️", "Schreib einen Dankesbrief an einen Menschen, der dir geholfen hat."],
];

// ---- Gebetsanleitungen ------------------------------------------------------------------------------
export const GUIDES = [
  { religion: "islam", id: "wudu", title: "Wuḍūʾ – die Gebetswaschung", icon: "💧", steps: ["Fasse die Absicht (Niyya) und sprich „Bismillāh“.", "Wasche die Hände bis zu den Handgelenken – dreimal.", "Spüle den Mund aus – dreimal.", "Zieh Wasser in die Nase und schnaube es aus – dreimal.", "Wasche das Gesicht von Ohr zu Ohr und vom Haaransatz bis zum Kinn – dreimal.", "Wasche die Arme bis einschließlich der Ellbogen, erst rechts, dann links – dreimal.", "Streiche mit nassen Händen über den Kopf.", "Reinige die Ohren mit den nassen Fingern.", "Wasche die Füße bis einschließlich der Knöchel, erst rechts, dann links – dreimal."], note: "Ablauf nach sunnitischer Praxis. In der schiitischen Praxis werden z. B. Kopf und Füße nur bestrichen – frag im Zweifel deinen Imam." },
  { religion: "islam", id: "salah", title: "Die Ṣalāh – Schritt für Schritt", icon: "🕌", steps: ["Richte dich zur Qibla und fasse im Herzen die Absicht für das Gebet.", "Hebe die Hände und sprich „Allāhu akbar“ (Takbīr).", "Im Stehen: Al-Fātiḥa, in den ersten beiden Einheiten danach eine weitere Sure.", "Verbeuge dich (Rukūʿ): „Subḥāna rabbiya l-ʿaẓīm“.", "Richte dich auf: „Samiʿa llāhu liman ḥamidah – Rabbanā wa laka l-ḥamd“.", "Niederwerfung (Sudschūd): „Subḥāna rabbiya l-aʿlā“ – kurz sitzen – zweite Niederwerfung.", "Nach zwei Einheiten und am Ende: sitzen und das Taschahhud sprechen.", "Beende das Gebet mit dem Gruß nach rechts und links: „As-salāmu ʿalaikum wa raḥmatullāh“."], note: "Einheiten (Rakʿāt): Fadschr 2 · Dhuhr 4 · Asr 4 · Maghrib 3 · Ischa 4. Einzelheiten unterscheiden sich je nach Rechtsschule." },
  { religion: "islam", id: "tauba", title: "Tauba – der Weg der Reue", icon: "🌱", steps: ["Hör mit der Sünde auf – jetzt, nicht morgen.", "Bereue aufrichtig im Herzen.", "Fasse den festen Entschluss, nicht zurückzukehren.", "Gib anderen zurück, was ihnen zusteht, und bitte um Verzeihung.", "Bete, wenn du magst, zwei Rakʿāt Ṣalāt at-Tauba und bitte Allah um Vergebung.", "Verzweifle nie: Fällst du wieder, kehre wieder um. Die Tür bleibt offen."], note: "Ṣalāt at-Tauba: Abū Dāwūd 1521, Tirmidhī 406. „Verliert nicht die Hoffnung auf Allahs Barmherzigkeit“ (39:53)." },
  { religion: "islam", id: "tahajjud", title: "Tahadschud – das Nachtgebet", icon: "🌌", steps: ["Schlaf ein wenig und steh im letzten Drittel der Nacht auf (die Uhrzeit steht unter „Gebet“).", "Mach Wuḍūʿ und bete zwei oder mehr Rakʿāt.", "Sprich mit Allah in deinen eigenen Worten – dies ist die Zeit der Erhörung.", "Beende die Nacht mit dem Witr-Gebet."], note: "„Unser Herr steigt jede Nacht zum untersten Himmel herab, wenn das letzte Drittel der Nacht bleibt, und sagt: Wer ruft Mich an, damit Ich ihn erhöre?“ – Buchārī 1145, Muslim 758." },
  { religion: "christian", id: "rosary", title: "Den Rosenkranz beten", icon: "📿", traditions: ["catholic"], steps: ["Am Kreuz: das Apostolische Glaubensbekenntnis.", "Erste große Perle: Vaterunser.", "Drei kleine Perlen: Ave Maria (um Glaube, Hoffnung und Liebe).", "Ehre sei dem Vater.", "Fünf Gesätze: je ein Vaterunser, zehn Ave Maria mit dem Geheimnis des Tages, ein Ehre sei dem Vater.", "Zum Schluss: Salve Regina oder ein eigenes Gebet."], note: "Die Geheimnisse des Tages findest du direkt darunter." },
  { religion: "christian", id: "lectio", title: "Lectio Divina – betend lesen", icon: "📖", steps: ["Lesen (Lectio): Lies einen kurzen Bibeltext langsam, am besten zweimal.", "Nachsinnen (Meditatio): Welches Wort berührt dich? Wiederhole es leise.", "Beten (Oratio): Sprich mit Gott über das, was das Wort in dir auslöst.", "Ruhen (Contemplatio): Sei einfach still in Gottes Gegenwart."], note: "Eine uralte Gebetsweise aus der Tradition der Klöster." },
  { religion: "christian", id: "confession", title: "Beichte & Versöhnung", icon: "🕯️", steps: ["Werde still und bitte den Heiligen Geist um Ehrlichkeit.", "Gewissenserforschung: Wo habe ich der Sucht Raum gegeben? Wen habe ich verletzt? Wo habe ich gelogen oder mich versteckt?", "Bereue – nicht aus Angst, sondern weil du geliebt bist.", "Bekenne: in der Beichte bei einem Priester bzw. Pfarrer oder im persönlichen Gebet.", "Nimm die Vergebung an. „Wenn wir unsre Sünden bekennen, ist er treu und gerecht“ (1. Johannes 1,9).", "Mach einen Schritt der Wiedergutmachung."], note: "Katholisch und orthodox: Sakrament der Beichte. Evangelisch: Beichte beim Pfarrer oder als Gebet möglich." },
  { religion: "christian", id: "jesusprayer", title: "Das Jesusgebet", icon: "🌬️", steps: ["Setz dich ruhig hin und schließ die Augen.", "Beim Einatmen: „Herr Jesus Christus, Sohn Gottes,“", "Beim Ausatmen: „erbarme dich meiner.“", "Wiederhole es ruhig, gern mit einer Gebetsschnur – so oft du magst."], note: "Herzensgebet der Ostkirche – besonders hilfreich, wenn Verlangen oder Unruhe kommen." },
];

export const MYSTERIES = {
  joyful: { label: "Freudenreiche Geheimnisse", items: ["den du, o Jungfrau, vom Heiligen Geist empfangen hast", "den du, o Jungfrau, zu Elisabeth getragen hast", "den du, o Jungfrau, geboren hast", "den du, o Jungfrau, im Tempel aufgeopfert hast", "den du, o Jungfrau, im Tempel wiedergefunden hast"] },
  sorrowful: { label: "Schmerzhafte Geheimnisse", items: ["der für uns Blut geschwitzt hat", "der für uns gegeißelt worden ist", "der für uns mit Dornen gekrönt worden ist", "der für uns das schwere Kreuz getragen hat", "der für uns gekreuzigt worden ist"] },
  glorious: { label: "Glorreiche Geheimnisse", items: ["der von den Toten auferstanden ist", "der in den Himmel aufgefahren ist", "der uns den Heiligen Geist gesandt hat", "der dich, o Jungfrau, in den Himmel aufgenommen hat", "der dich, o Jungfrau, im Himmel gekrönt hat"] },
  luminous: { label: "Lichtreiche Geheimnisse", items: ["der von Johannes getauft worden ist", "der sich bei der Hochzeit in Kana offenbart hat", "der uns das Reich Gottes verkündet hat", "der auf dem Berg verklärt worden ist", "der uns die Eucharistie geschenkt hat"] },
};
// Sunday … Saturday
export const MYSTERY_OF_DAY = ["glorious", "joyful", "sorrowful", "glorious", "luminous", "sorrowful", "joyful"];

// ---- Abendlicher Rückblick: Examen / Muḥāsaba --------------------------------------------------------
export const REVIEW = {
  christian: { title: "Examen – der Tagesrückblick", intro: "Ignatius von Loyola empfahl dieses kurze Gebet für jeden Abend.", steps: ["Werde still. Gott ist da und schaut dich liebevoll an.", "Wofür bist du heute dankbar?", "Wo hast du Gott heute gespürt – und wo hast du ihn vermisst?", "Wo bist du heute schwach geworden? Sag es Gott ehrlich.", "Was nimmst du dir für morgen vor? Bitte um Kraft dafür."] },
  islam: { title: "Muḥāsaba – Rechenschaft mit dir selbst", intro: "„Zieht euch selbst zur Rechenschaft, bevor ihr zur Rechenschaft gezogen werdet“ – ein überliefertes Wort von ʿUmar.", steps: ["Mach dir bewusst: Allah ist bei dir und kennt dein Herz.", "Wofür sagst du heute Alḥamdulillāh?", "Welche Pflichten hast du heute erfüllt – welche versäumt?", "Wo hast du dir heute Unrecht getan? Bitte Allah um Vergebung.", "Was ist deine Absicht (Niyya) für morgen?"] },
};

// ---- Hilfe & Seelsorge im Glauben ---------------------------------------------------------------
export const FAITH_HELP = [
  { religion: "islam", name: "Muslimisches SeelsorgeTelefon (MuTeS)", detail: "Rund um die Uhr, vertraulich, bundesweit · getragen von Islamic Relief Deutschland", phone: "030 44 35 09 821", url: "https://www.mutes.de" },
  { religion: "islam", name: "Millati Islami", detail: "„Weg des Friedens“ – 12-Schritte-Selbsthilfe auf islamischer Grundlage, Treffen vor allem in den USA, teils online", url: "https://www.google.com/search?q=Millati+Islami" },
  { religion: "christian", name: "TelefonSeelsorge", detail: "Rund um die Uhr, kostenlos, anonym · getragen von evangelischer und katholischer Kirche", phone: "0800 111 0 111", url: "https://www.telefonseelsorge.de" },
  { religion: "christian", name: "Kreuzbund", detail: "Katholische Selbsthilfe- und Helfergemeinschaft für Suchtkranke und Angehörige", url: "https://www.kreuzbund.de" },
  { religion: "christian", name: "Blaues Kreuz", detail: "Evangelische Suchthilfe: Selbsthilfegruppen, Beratung, Kliniken", url: "https://www.blaues-kreuz.de" },
  { religion: "christian", name: "Caritas Online-Suchtberatung", detail: "Anonyme Online-Beratung der katholischen Caritas", url: "https://www.caritas.de/onlineberatung" },
  { religion: "christian", name: "Diakonie Suchtberatung", detail: "Beratungsstellen der evangelischen Diakonie in deiner Nähe", url: "https://www.diakonie.de" },
];
