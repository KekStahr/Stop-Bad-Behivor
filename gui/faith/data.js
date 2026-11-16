// Content for the faith area. Both religions get the same depth and the same presentation.
// Local verse texts are short German renderings for offline use; the reader and the verse of
// the day load the exact wording of the translation the user picked.

export const RELIGIONS = {
  christian: { id: "christian", label: "Christentum", symbol: "✝", book: "Bibel", greeting: "Friede sei mit dir" },
  islam: { id: "islam", label: "Islam", symbol: "☪", book: "Koran", greeting: "As-salāmu ʿalaikum – Friede sei mit dir" },
};

export const CHRISTIAN_TRADITIONS = [
  ["catholic", "Römisch-katholisch"],
  ["protestant", "Evangelisch"],
  ["orthodox", "Orthodox"],
  ["free", "Freikirchlich"],
];
export const ISLAM_TRADITIONS = [
  ["sunni-hanafi", "Sunnitisch – Hanafitisch"],
  ["sunni-shafii", "Sunnitisch – Schafiʿitisch"],
  ["sunni-maliki", "Sunnitisch – Malikitisch"],
  ["sunni-hanbali", "Sunnitisch – Hanbalitisch"],
  ["shia-jafari", "Schiitisch – Dschaʿfaritisch"],
];

export const THEMES = {
  hope: "Hoffnung", strength: "Kraft", temptation: "Versuchung", forgiveness: "Vergebung", patience: "Geduld",
  comfort: "Trost", gratitude: "Dankbarkeit", trust: "Vertrauen", renewal: "Neuanfang", peace: "Frieden", love: "Liebe",
};

// ---- Bible ------------------------------------------------------------------------------
export const BIBLE_BOOKS = ["1. Mose", "2. Mose", "3. Mose", "4. Mose", "5. Mose", "Josua", "Richter", "Rut", "1. Samuel", "2. Samuel",
  "1. Könige", "2. Könige", "1. Chronik", "2. Chronik", "Esra", "Nehemia", "Ester", "Hiob", "Psalm", "Sprüche", "Prediger", "Hoheslied",
  "Jesaja", "Jeremia", "Klagelieder", "Hesekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadja", "Jona", "Micha", "Nahum", "Habakuk",
  "Zefanja", "Haggai", "Sacharja", "Maleachi", "Matthäus", "Markus", "Lukas", "Johannes", "Apostelgeschichte", "Römer", "1. Korinther",
  "2. Korinther", "Galater", "Epheser", "Philipper", "Kolosser", "1. Thessalonicher", "2. Thessalonicher", "1. Timotheus", "2. Timotheus",
  "Titus", "Philemon", "Hebräer", "Jakobus", "1. Petrus", "2. Petrus", "1. Johannes", "2. Johannes", "3. Johannes", "Judas", "Offenbarung"];
export const BIBLE_CHAPTERS = [50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4,
  28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22];

// [book, chapter, verse, to, theme, text]
const B = [
  [19, 23, 1, 0, "trust", "Der HERR ist mein Hirte, mir wird nichts mangeln."],
  [19, 23, 4, 0, "comfort", "Und ob ich schon wanderte im finstern Tal, fürchte ich kein Unglück; denn du bist bei mir, dein Stecken und Stab trösten mich."],
  [19, 46, 2, 0, "strength", "Gott ist unsre Zuversicht und Stärke, eine Hilfe in den großen Nöten, die uns getroffen haben."],
  [19, 27, 1, 0, "strength", "Der HERR ist mein Licht und mein Heil; vor wem sollte ich mich fürchten? Der HERR ist meines Lebens Kraft; vor wem sollte mir grauen?"],
  [19, 34, 19, 0, "comfort", "Der HERR ist nahe denen, die zerbrochenen Herzens sind, und hilft denen, die ein zerschlagenes Gemüt haben."],
  [19, 30, 6, 0, "hope", "Den Abend lang währet das Weinen, aber des Morgens ist Freude."],
  [19, 37, 5, 0, "trust", "Befiehl dem HERRN deine Wege und hoffe auf ihn, er wird's wohlmachen."],
  [19, 40, 2, 3, "renewal", "Ich harrte des HERRN, und er neigte sich zu mir und hörte mein Schreien. Er zog mich aus der grausigen Grube, aus lauter Schmutz und Schlamm, und stellte meine Füße auf einen Fels."],
  [19, 51, 12, 0, "renewal", "Schaffe in mir, Gott, ein reines Herz und gib mir einen neuen, beständigen Geist."],
  [19, 55, 23, 0, "trust", "Wirf dein Anliegen auf den HERRN; der wird dich versorgen."],
  [19, 62, 2, 0, "peace", "Meine Seele ist stille zu Gott, der mir hilft."],
  [19, 73, 26, 0, "comfort", "Wenn mir gleich Leib und Seele verschmachtet, so bist du doch, Gott, allezeit meines Herzens Trost und mein Teil."],
  [19, 91, 1, 2, "trust", "Wer unter dem Schirm des Höchsten sitzt und unter dem Schatten des Allmächtigen bleibt, der spricht zu dem HERRN: Meine Zuversicht und meine Burg, mein Gott, auf den ich hoffe."],
  [19, 91, 11, 0, "trust", "Denn er hat seinen Engeln befohlen, dass sie dich behüten auf allen deinen Wegen."],
  [19, 103, 2, 0, "gratitude", "Lobe den HERRN, meine Seele, und vergiss nicht, was er dir Gutes getan hat."],
  [19, 103, 12, 0, "forgiveness", "So fern der Morgen ist vom Abend, lässt er unsre Übertretungen von uns sein."],
  [19, 118, 24, 0, "gratitude", "Dies ist der Tag, den der HERR macht; lasst uns freuen und fröhlich an ihm sein."],
  [19, 119, 105, 0, "trust", "Dein Wort ist meines Fußes Leuchte und ein Licht auf meinem Wege."],
  [19, 121, 1, 2, "strength", "Ich hebe meine Augen auf zu den Bergen. Woher kommt mir Hilfe? Meine Hilfe kommt vom HERRN, der Himmel und Erde gemacht hat."],
  [19, 139, 14, 0, "love", "Ich danke dir dafür, dass ich wunderbar gemacht bin; wunderbar sind deine Werke; das erkennt meine Seele."],
  [19, 147, 3, 0, "comfort", "Er heilt, die zerbrochenen Herzens sind, und verbindet ihre Wunden."],
  [19, 18, 30, 0, "strength", "Denn mit dir kann ich Kriegsvolk zerschlagen und mit meinem Gott über Mauern springen."],
  [19, 42, 6, 0, "hope", "Was betrübst du dich, meine Seele, und bist so unruhig in mir? Harre auf Gott; denn ich werde ihm noch danken, dass er meines Angesichts Hilfe und mein Gott ist."],
  [19, 32, 8, 0, "trust", "Ich will dich unterweisen und dir den Weg zeigen, den du gehen sollst; ich will dich mit meinen Augen leiten."],
  [19, 86, 5, 0, "forgiveness", "Denn du, Herr, bist gut und gnädig, von großer Güte allen, die dich anrufen."],
  [19, 4, 9, 0, "peace", "Ich liege und schlafe ganz mit Frieden; denn allein du, HERR, hilfst mir, dass ich sicher wohne."],
  [19, 16, 11, 0, "hope", "Du tust mir kund den Weg zum Leben: Vor dir ist Freude die Fülle."],
  [19, 31, 16, 0, "trust", "Meine Zeit steht in deinen Händen."],
  [19, 145, 18, 0, "comfort", "Der HERR ist nahe allen, die ihn anrufen, allen, die ihn ernstlich anrufen."],
  [19, 126, 5, 0, "hope", "Die mit Tränen säen, werden mit Freuden ernten."],
  [19, 50, 15, 0, "strength", "Rufe mich an in der Not, so will ich dich erretten, und du sollst mich preisen."],
  [20, 3, 5, 6, "trust", "Verlass dich auf den HERRN von ganzem Herzen und verlass dich nicht auf deinen Verstand, sondern gedenke an ihn in allen deinen Wegen, so wird er dich recht führen."],
  [20, 4, 23, 0, "temptation", "Behüte dein Herz mit allem Fleiß, denn daraus quillt das Leben."],
  [20, 24, 16, 0, "renewal", "Denn ein Gerechter fällt siebenmal und steht wieder auf."],
  [20, 16, 9, 0, "trust", "Des Menschen Herz erdenkt sich seinen Weg; aber der HERR allein lenkt seinen Schritt."],
  [21, 3, 1, 0, "patience", "Ein jegliches hat seine Zeit, und alles Vorhaben unter dem Himmel hat seine Stunde."],
  [23, 40, 31, 0, "strength", "Aber die auf den HERRN harren, kriegen neue Kraft, dass sie auffahren mit Flügeln wie Adler, dass sie laufen und nicht matt werden, dass sie wandeln und nicht müde werden."],
  [23, 41, 10, 0, "strength", "Fürchte dich nicht, ich bin mit dir; weiche nicht, denn ich bin dein Gott. Ich stärke dich, ich helfe dir auch, ich halte dich durch die rechte Hand meiner Gerechtigkeit."],
  [23, 43, 1, 0, "love", "Fürchte dich nicht, denn ich habe dich erlöst; ich habe dich bei deinem Namen gerufen; du bist mein!"],
  [23, 43, 18, 19, "renewal", "Gedenkt nicht an das Frühere und achtet nicht auf das Vorige! Siehe, ich will ein Neues schaffen, jetzt wächst es auf, erkennt ihr's denn nicht?"],
  [23, 54, 10, 0, "love", "Denn es sollen wohl Berge weichen und Hügel hinfallen, aber meine Gnade soll nicht von dir weichen, und der Bund meines Friedens soll nicht hinfallen, spricht der HERR, dein Erbarmer."],
  [23, 1, 18, 0, "forgiveness", "Wenn eure Sünde auch blutrot ist, soll sie doch schneeweiß werden."],
  [23, 66, 13, 0, "comfort", "Ich will euch trösten, wie einen seine Mutter tröstet."],
  [24, 29, 11, 0, "hope", "Denn ich weiß wohl, was ich für Gedanken über euch habe, spricht der HERR: Gedanken des Friedens und nicht des Leides, dass ich euch gebe Zukunft und Hoffnung."],
  [24, 29, 13, 0, "trust", "Wenn ihr mich von ganzem Herzen suchen werdet, so will ich mich von euch finden lassen."],
  [25, 3, 22, 23, "renewal", "Die Güte des HERRN ist's, dass wir nicht gar aus sind, seine Barmherzigkeit hat noch kein Ende, sondern sie ist alle Morgen neu, und deine Treue ist groß."],
  [6, 1, 9, 0, "strength", "Sei getrost und unverzagt. Lass dir nicht grauen und entsetze dich nicht; denn der HERR, dein Gott, ist mit dir in allem, was du tun wirst."],
  [5, 31, 8, 0, "trust", "Der HERR aber, der selber vor euch hergeht, der wird mit dir sein und wird die Hand nicht abtun und dich nicht verlassen. Fürchte dich nicht und erschrick nicht!"],
  [16, 8, 10, 0, "strength", "Die Freude am HERRN ist eure Stärke."],
  [36, 3, 17, 0, "love", "Der HERR, dein Gott, ist bei dir, ein starker Heiland."],
  [33, 7, 8, 0, "renewal", "Wenn ich auch daniederliege, so werde ich wieder aufstehen; und wenn ich auch im Finstern sitze, so ist doch der HERR mein Licht."],
  [35, 3, 19, 0, "strength", "Denn der HERR ist meine Kraft."],
  [1, 28, 15, 0, "trust", "Und siehe, ich bin mit dir und will dich behüten, wo du hinziehst."],
  [1, 50, 20, 0, "hope", "Ihr gedachtet es böse mit mir zu machen, aber Gott gedachte es gut zu machen."],
  [2, 14, 14, 0, "peace", "Der HERR wird für euch streiten, und ihr werdet stille sein."],
  [4, 6, 24, 26, "peace", "Der HERR segne dich und behüte dich; der HERR lasse sein Angesicht leuchten über dir und sei dir gnädig; der HERR hebe sein Angesicht über dich und gebe dir Frieden."],
  [9, 16, 7, 0, "love", "Ein Mensch sieht, was vor Augen ist; der HERR aber sieht das Herz an."],
  [18, 19, 25, 0, "hope", "Aber ich weiß, dass mein Erlöser lebt."],
  [40, 5, 4, 0, "comfort", "Selig sind, die da Leid tragen; denn sie sollen getröstet werden."],
  [40, 6, 34, 0, "peace", "Darum sorgt nicht für morgen, denn der morgige Tag wird für das Seine sorgen. Es ist genug, dass jeder Tag seine eigene Plage hat."],
  [40, 7, 7, 0, "trust", "Bittet, so wird euch gegeben; suchet, so werdet ihr finden; klopfet an, so wird euch aufgetan."],
  [40, 11, 28, 0, "comfort", "Kommt her zu mir, alle, die ihr mühselig und beladen seid; ich will euch erquicken."],
  [40, 19, 26, 0, "hope", "Bei den Menschen ist's unmöglich; aber bei Gott sind alle Dinge möglich."],
  [40, 26, 41, 0, "temptation", "Wachet und betet, dass ihr nicht in Anfechtung fallt! Der Geist ist willig; aber das Fleisch ist schwach."],
  [40, 28, 20, 0, "trust", "Und siehe, ich bin bei euch alle Tage bis an der Welt Ende."],
  [41, 9, 24, 0, "trust", "Ich glaube; hilf meinem Unglauben!"],
  [42, 1, 37, 0, "hope", "Denn bei Gott ist kein Ding unmöglich."],
  [42, 15, 20, 0, "forgiveness", "Als er aber noch weit entfernt war, sah ihn sein Vater, und es jammerte ihn; er lief und fiel ihm um den Hals und küsste ihn."],
  [42, 15, 7, 0, "forgiveness", "So wird auch Freude im Himmel sein über einen Sünder, der Buße tut, mehr als über neunundneunzig Gerechte, die der Buße nicht bedürfen."],
  [42, 19, 10, 0, "love", "Denn der Menschensohn ist gekommen, zu suchen und selig zu machen, was verloren ist."],
  [43, 3, 16, 0, "love", "Denn also hat Gott die Welt geliebt, dass er seinen eingeborenen Sohn gab, damit alle, die an ihn glauben, nicht verloren werden, sondern das ewige Leben haben."],
  [43, 8, 11, 0, "forgiveness", "So verdamme ich dich auch nicht; geh hin und sündige hinfort nicht mehr."],
  [43, 8, 32, 0, "renewal", "Und ihr werdet die Wahrheit erkennen, und die Wahrheit wird euch frei machen."],
  [43, 8, 36, 0, "renewal", "Wen nun der Sohn frei macht, der ist recht frei."],
  [43, 14, 27, 0, "peace", "Den Frieden lasse ich euch, meinen Frieden gebe ich euch. Euer Herz erschrecke nicht und fürchte sich nicht."],
  [43, 16, 33, 0, "strength", "In der Welt habt ihr Angst; aber seid getrost, ich habe die Welt überwunden."],
  [43, 10, 10, 0, "hope", "Ich bin gekommen, damit sie das Leben und volle Genüge haben."],
  [43, 6, 37, 0, "love", "Wer zu mir kommt, den werde ich nicht hinausstoßen."],
  [45, 5, 3, 4, "patience", "Wir wissen, dass Bedrängnis Geduld bringt, Geduld aber Bewährung, Bewährung aber Hoffnung."],
  [45, 8, 28, 0, "trust", "Wir wissen aber, dass denen, die Gott lieben, alle Dinge zum Besten dienen."],
  [45, 8, 31, 0, "strength", "Ist Gott für uns, wer kann wider uns sein?"],
  [45, 8, 38, 39, "love", "Denn ich bin gewiss, dass weder Tod noch Leben … noch irgendeine andere Kreatur uns scheiden kann von der Liebe Gottes."],
  [45, 12, 2, 0, "renewal", "Und stellt euch nicht dieser Welt gleich, sondern ändert euch durch Erneuerung eures Sinnes."],
  [45, 12, 12, 0, "patience", "Seid fröhlich in Hoffnung, geduldig in Trübsal, beharrlich im Gebet."],
  [45, 12, 21, 0, "temptation", "Lass dich nicht vom Bösen überwinden, sondern überwinde das Böse mit Gutem."],
  [45, 15, 13, 0, "hope", "Der Gott der Hoffnung aber erfülle euch mit aller Freude und Frieden im Glauben."],
  [46, 10, 13, 0, "temptation", "Gott ist treu, der euch nicht versuchen lässt über eure Kraft, sondern macht, dass die Versuchung so ein Ende nimmt, dass ihr's ertragen könnt."],
  [46, 13, 7, 0, "love", "Sie erträgt alles, sie glaubt alles, sie hofft alles, sie duldet alles."],
  [46, 13, 13, 0, "love", "Nun aber bleiben Glaube, Hoffnung, Liebe, diese drei; aber die Liebe ist die größte unter ihnen."],
  [46, 6, 19, 0, "temptation", "Oder wisst ihr nicht, dass euer Leib ein Tempel des Heiligen Geistes ist, der in euch ist?"],
  [46, 16, 14, 0, "love", "Alle eure Dinge lasst in der Liebe geschehen."],
  [47, 5, 17, 0, "renewal", "Ist jemand in Christus, so ist er eine neue Kreatur; das Alte ist vergangen, siehe, Neues ist geworden."],
  [47, 12, 9, 0, "strength", "Lass dir an meiner Gnade genügen; denn meine Kraft ist in den Schwachen mächtig."],
  [47, 4, 8, 0, "strength", "Wir sind von allen Seiten bedrängt, aber wir ängstigen uns nicht. Uns ist bange, aber wir verzagen nicht."],
  [48, 5, 1, 0, "renewal", "Zur Freiheit hat uns Christus befreit! So steht nun fest und lasst euch nicht wieder das Joch der Knechtschaft auflegen!"],
  [48, 5, 22, 23, "patience", "Die Frucht aber des Geistes ist Liebe, Freude, Friede, Geduld, Freundlichkeit, Güte, Treue, Sanftmut, Selbstbeherrschung."],
  [48, 6, 9, 0, "patience", "Lasst uns aber Gutes tun und nicht müde werden; denn zu seiner Zeit werden wir auch ernten, wenn wir nicht nachlassen."],
  [49, 2, 8, 0, "forgiveness", "Denn aus Gnade seid ihr gerettet durch Glauben, und das nicht aus euch: Gottes Gabe ist es."],
  [49, 6, 10, 0, "strength", "Seid stark in dem Herrn und in der Macht seiner Stärke."],
  [50, 4, 6, 7, "peace", "Sorgt euch um nichts, sondern in allen Dingen lasst eure Bitten in Gebet und Flehen mit Danksagung vor Gott kundwerden! Und der Friede Gottes, der höher ist als alle Vernunft, bewahre eure Herzen und Sinne in Christus Jesus."],
  [50, 4, 13, 0, "strength", "Ich vermag alles durch den, der mich mächtig macht."],
  [50, 1, 6, 0, "hope", "Ich bin darin guter Zuversicht, dass der in euch angefangen hat das gute Werk, der wird's auch vollenden."],
  [50, 3, 13, 0, "renewal", "Ich vergesse, was dahinten ist, und strecke mich aus nach dem, was da vorne ist."],
  [55, 1, 7, 0, "strength", "Denn Gott hat uns nicht gegeben den Geist der Furcht, sondern der Kraft und der Liebe und der Besonnenheit."],
  [58, 4, 16, 0, "forgiveness", "Darum lasst uns hinzutreten mit Zuversicht zu dem Thron der Gnade, damit wir Barmherzigkeit empfangen und Gnade finden zu der Zeit, wenn wir Hilfe nötig haben."],
  [58, 12, 1, 0, "patience", "Lasst uns ablegen alles, was uns beschwert, und die Sünde, die uns ständig umstrickt, und lasst uns laufen mit Geduld in dem Kampf, der uns bestimmt ist."],
  [58, 13, 5, 0, "trust", "Ich will dich nicht verlassen und nicht von dir weichen."],
  [59, 1, 12, 0, "temptation", "Selig ist der Mensch, der die Anfechtung erduldet; denn nachdem er bewährt ist, wird er die Krone des Lebens empfangen."],
  [59, 4, 7, 0, "temptation", "So seid nun Gott untertan. Widersteht dem Teufel, so flieht er von euch."],
  [59, 4, 8, 0, "love", "Naht euch zu Gott, so naht er sich zu euch."],
  [59, 5, 16, 0, "forgiveness", "Bekennt einander eure Sünden und betet füreinander, dass ihr gesund werdet."],
  [60, 5, 7, 0, "peace", "Alle eure Sorge werft auf ihn; denn er sorgt für euch."],
  [60, 5, 8, 0, "temptation", "Seid nüchtern und wacht; denn euer Widersacher, der Teufel, geht umher wie ein brüllender Löwe und sucht, wen er verschlinge."],
  [62, 1, 9, 0, "forgiveness", "Wenn wir aber unsre Sünden bekennen, so ist er treu und gerecht, dass er uns die Sünden vergibt und reinigt uns von aller Ungerechtigkeit."],
  [62, 4, 18, 0, "love", "Furcht ist nicht in der Liebe, sondern die vollkommene Liebe treibt die Furcht aus."],
  [62, 4, 16, 0, "love", "Gott ist Liebe; und wer in der Liebe bleibt, der bleibt in Gott und Gott in ihm."],
  [66, 21, 4, 0, "hope", "Und Gott wird abwischen alle Tränen von ihren Augen, und der Tod wird nicht mehr sein, noch Leid noch Geschrei noch Schmerz wird mehr sein."],
  [66, 21, 5, 0, "renewal", "Siehe, ich mache alles neu!"],
];

// ---- Quran -------------------------------------------------------------------------------
export const SURAHS = ["Al-Fātiḥa", "Al-Baqara", "Āl ʿImrān", "An-Nisāʾ", "Al-Māʾida", "Al-Anʿām", "Al-Aʿrāf", "Al-Anfāl", "At-Tauba", "Yūnus",
  "Hūd", "Yūsuf", "Ar-Raʿd", "Ibrāhīm", "Al-Ḥidschr", "An-Naḥl", "Al-Isrāʾ", "Al-Kahf", "Maryam", "Ṭā Hā", "Al-Anbiyāʾ", "Al-Ḥadsch",
  "Al-Muʾminūn", "An-Nūr", "Al-Furqān", "Asch-Schuʿarāʾ", "An-Naml", "Al-Qaṣaṣ", "Al-ʿAnkabūt", "Ar-Rūm", "Luqmān", "As-Sadschda",
  "Al-Aḥzāb", "Sabaʾ", "Fāṭir", "Yā Sīn", "Aṣ-Ṣāffāt", "Ṣād", "Az-Zumar", "Ghāfir", "Fuṣṣilat", "Asch-Schūrā", "Az-Zuchruf",
  "Ad-Duchān", "Al-Dschāthiya", "Al-Aḥqāf", "Muḥammad", "Al-Fatḥ", "Al-Ḥudschurāt", "Qāf", "Adh-Dhāriyāt", "Aṭ-Ṭūr", "An-Nadschm",
  "Al-Qamar", "Ar-Raḥmān", "Al-Wāqiʿa", "Al-Ḥadīd", "Al-Mudschādala", "Al-Ḥaschr", "Al-Mumtaḥana", "Aṣ-Ṣaff", "Al-Dschumuʿa",
  "Al-Munāfiqūn", "At-Taghābun", "Aṭ-Ṭalāq", "At-Taḥrīm", "Al-Mulk", "Al-Qalam", "Al-Ḥāqqa", "Al-Maʿāridsch", "Nūḥ", "Al-Dschinn",
  "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyāma", "Al-Insān", "Al-Mursalāt", "An-Nabaʾ", "An-Nāziʿāt", "ʿAbasa", "At-Takwīr",
  "Al-Infiṭār", "Al-Muṭaffifīn", "Al-Inschiqāq", "Al-Burūdsch", "Aṭ-Ṭāriq", "Al-Aʿlā", "Al-Ghāschiya", "Al-Fadschr", "Al-Balad",
  "Asch-Schams", "Al-Lail", "Aḍ-Ḍuḥā", "Asch-Scharḥ", "At-Tīn", "Al-ʿAlaq", "Al-Qadr", "Al-Bayyina", "Az-Zalzala", "Al-ʿĀdiyāt",
  "Al-Qāriʿa", "At-Takāthur", "Al-ʿAṣr", "Al-Humaza", "Al-Fīl", "Quraisch", "Al-Māʿūn", "Al-Kauthar", "Al-Kāfirūn", "An-Naṣr",
  "Al-Masad", "Al-Ichlāṣ", "Al-Falaq", "An-Nās"];
export const SURAH_AYAHS = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69,
  60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
  44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6];

// [surah, ayah, to, theme, text] – German rendering of the meaning
const Q = [
  [1, 5, 6, "trust", "Dir allein dienen wir, und Dich allein bitten wir um Hilfe. Führe uns den geraden Weg."],
  [2, 152, 0, "gratitude", "So gedenkt Meiner, dann gedenke Ich eurer. Seid Mir dankbar und seid nicht undankbar."],
  [2, 153, 0, "patience", "O ihr, die ihr glaubt, sucht Hilfe in der Geduld und im Gebet. Gewiss, Allah ist mit den Geduldigen."],
  [2, 155, 0, "patience", "Wir werden euch gewiss mit etwas Furcht, Hunger und Verlust an Besitz, Leben und Früchten prüfen. Doch verkünde den Geduldigen frohe Botschaft."],
  [2, 156, 0, "comfort", "Die, wenn sie ein Unglück trifft, sagen: „Wir gehören Allah, und zu Ihm kehren wir zurück.“"],
  [2, 186, 0, "comfort", "Und wenn Meine Diener dich nach Mir fragen, so bin Ich nahe. Ich erhöre den Ruf des Bittenden, wenn er Mich anruft."],
  [2, 216, 0, "trust", "Vielleicht ist euch etwas zuwider, das gut für euch ist, und vielleicht liebt ihr etwas, das schlecht für euch ist. Allah weiß, ihr aber wisst nicht."],
  [2, 222, 0, "forgiveness", "Gewiss, Allah liebt die sich reuig Zuwendenden, und Er liebt die sich Reinigenden."],
  [2, 255, 0, "trust", "Allah – es gibt keinen Gott außer Ihm, dem Lebendigen, dem Beständigen. Ihn überkommt weder Schlummer noch Schlaf. Ihm gehört, was in den Himmeln und was auf der Erde ist."],
  [2, 286, 0, "strength", "Allah erlegt keiner Seele mehr auf, als sie zu tragen vermag."],
  [2, 45, 0, "patience", "Und sucht Hilfe in der Geduld und im Gebet."],
  [2, 201, 0, "hope", "Unser Herr, gib uns im Diesseits Gutes und im Jenseits Gutes."],
  [2, 250, 0, "strength", "Unser Herr, gieße Geduld über uns aus und festige unsere Füße."],
  [2, 257, 0, "hope", "Allah ist der Schutzherr derer, die glauben. Er führt sie aus den Finsternissen hinaus ins Licht."],
  [2, 268, 0, "temptation", "Der Satan droht euch mit Armut und befiehlt euch Schändliches; Allah aber verspricht euch Vergebung von Ihm und Huld."],
  [2, 208, 0, "temptation", "O ihr, die ihr glaubt, tretet allesamt in den Frieden ein und folgt nicht den Fußstapfen des Satans. Gewiss, er ist euch ein deutlicher Feind."],
  [3, 8, 0, "trust", "Unser Herr, lass unsere Herzen nicht abschweifen, nachdem Du uns rechtgeleitet hast, und schenke uns Barmherzigkeit von Dir."],
  [3, 139, 0, "strength", "Werdet nicht schwach und seid nicht traurig, denn ihr werdet die Oberhand haben, wenn ihr gläubig seid."],
  [3, 159, 0, "trust", "Und wenn du dich entschlossen hast, dann verlasse dich auf Allah. Gewiss, Allah liebt die sich auf Ihn Verlassenden."],
  [3, 173, 0, "trust", "Allah genügt uns, und welch vortrefflicher Sachwalter ist Er!"],
  [3, 135, 0, "forgiveness", "Und diejenigen, die, wenn sie etwas Schändliches getan oder sich selbst Unrecht zugefügt haben, Allahs gedenken und um Vergebung für ihre Sünden bitten – und wer vergibt die Sünden außer Allah?"],
  [3, 200, 0, "patience", "O ihr, die ihr glaubt, seid geduldig, übertrefft einander an Geduld und seid standhaft."],
  [3, 31, 0, "love", "Sag: Wenn ihr Allah liebt, dann folgt mir, so liebt euch Allah und vergibt euch eure Sünden."],
  [4, 28, 0, "comfort", "Allah will euch Erleichterung verschaffen, denn der Mensch wurde schwach erschaffen."],
  [4, 110, 0, "forgiveness", "Wer Böses tut oder sich selbst Unrecht zufügt und dann Allah um Vergebung bittet, wird Allah allvergebend und barmherzig finden."],
  [5, 90, 0, "temptation", "O ihr, die ihr glaubt, berauschender Trank, Glücksspiel, Opfersteine und Lospfeile sind ein Gräuel vom Werk des Satans. So meidet es, auf dass es euch wohl ergehe."],
  [5, 91, 0, "temptation", "Der Satan will durch berauschenden Trank und Glücksspiel nur Feindschaft und Hass zwischen euch säen und euch vom Gedenken Allahs und vom Gebet abhalten."],
  [6, 162, 0, "trust", "Sag: Mein Gebet und meine Opferung, mein Leben und mein Sterben gehören Allah, dem Herrn der Welten."],
  [6, 54, 0, "forgiveness", "Euer Herr hat Sich Selbst Barmherzigkeit vorgeschrieben: Wer von euch in Unwissenheit Böses tut, danach aber bereut und sich bessert, so ist Er allvergebend und barmherzig."],
  [7, 23, 0, "forgiveness", "Unser Herr, wir haben uns selbst Unrecht getan. Wenn Du uns nicht vergibst und Dich unser nicht erbarmst, werden wir gewiss zu den Verlierern gehören."],
  [7, 56, 0, "hope", "Gewiss, Allahs Barmherzigkeit ist denen nahe, die Gutes tun."],
  [7, 156, 0, "love", "Meine Barmherzigkeit umfasst alle Dinge."],
  [7, 201, 0, "temptation", "Diejenigen, die gottesfürchtig sind – wenn sie eine Einflüsterung vom Satan berührt, gedenken sie Allahs, und schon sehen sie wieder klar."],
  [8, 46, 0, "patience", "Und seid geduldig. Gewiss, Allah ist mit den Geduldigen."],
  [9, 40, 0, "comfort", "Sei nicht traurig, Allah ist mit uns."],
  [9, 51, 0, "trust", "Sag: Uns trifft nur, was Allah für uns bestimmt hat. Er ist unser Schutzherr. Und auf Allah sollen sich die Gläubigen verlassen."],
  [10, 57, 0, "comfort", "O ihr Menschen, zu euch ist eine Ermahnung von eurem Herrn gekommen und eine Heilung für das, was in den Herzen ist."],
  [11, 88, 0, "trust", "Mein Gelingen ist nur durch Allah. Auf Ihn verlasse ich mich, und Ihm wende ich mich zu."],
  [11, 114, 0, "renewal", "Gewiss, die guten Taten lassen die bösen Taten vergehen."],
  [11, 115, 0, "patience", "Und sei geduldig, denn Allah lässt den Lohn derer, die Gutes tun, nicht verloren gehen."],
  [12, 87, 0, "hope", "Gebt die Hoffnung auf Allahs Erbarmen nicht auf."],
  [12, 86, 0, "comfort", "Ich klage meinen Kummer und meine Trauer allein Allah."],
  [12, 53, 0, "temptation", "Die Seele gebietet nachdrücklich das Böse, außer wenn mein Herr Sich erbarmt. Mein Herr ist allvergebend und barmherzig."],
  [13, 11, 0, "renewal", "Allah ändert die Lage eines Volkes nicht, bis sie das ändern, was in ihnen selbst ist."],
  [13, 28, 0, "peace", "Wahrlich, im Gedenken Allahs finden die Herzen Ruhe."],
  [14, 7, 0, "gratitude", "Wenn ihr dankbar seid, werde Ich euch gewiss noch mehr geben."],
  [14, 40, 0, "trust", "Mein Herr, lass mich und meine Nachkommen das Gebet verrichten. Unser Herr, nimm mein Bittgebet an."],
  [15, 49, 0, "forgiveness", "Tu Meinen Dienern kund, dass Ich der Allvergebende, der Barmherzige bin."],
  [16, 97, 0, "hope", "Wer rechtschaffen handelt, ob Mann oder Frau, und dabei gläubig ist, dem werden Wir ganz gewiss ein gutes Leben gewähren."],
  [16, 127, 0, "patience", "Sei geduldig – deine Geduld ist nur durch Allah möglich."],
  [16, 128, 0, "trust", "Gewiss, Allah ist mit denen, die gottesfürchtig sind, und denen, die Gutes tun."],
  [16, 18, 0, "gratitude", "Und wenn ihr die Gnaden Allahs aufzählen wolltet, könntet ihr sie nicht erfassen."],
  [17, 32, 0, "temptation", "Und nähert euch nicht der Unzucht. Gewiss, sie ist etwas Schändliches – und wie übel ist dieser Weg!"],
  [17, 24, 0, "love", "Mein Herr, erbarme Dich ihrer, so wie sie mich aufgezogen haben, als ich klein war."],
  [17, 82, 0, "comfort", "Und Wir senden vom Koran hinab, was Heilung und Barmherzigkeit ist für die Gläubigen."],
  [18, 10, 0, "hope", "Unser Herr, gib uns Barmherzigkeit von Dir und bereite uns in unserer Angelegenheit einen besonnenen Ausweg."],
  [20, 25, 26, "strength", "Mein Herr, weite mir meine Brust und erleichtere mir meine Angelegenheit."],
  [20, 46, 0, "comfort", "Fürchtet euch nicht, Ich bin mit euch; Ich höre und sehe."],
  [20, 114, 0, "trust", "Mein Herr, mehre mich an Wissen."],
  [20, 82, 0, "forgiveness", "Und Ich bin wahrlich allvergebend gegenüber dem, der bereut, glaubt, rechtschaffen handelt und sich dann rechtleiten lässt."],
  [21, 83, 0, "comfort", "Mich hat Unheil getroffen, und Du bist der Barmherzigste der Barmherzigen."],
  [21, 87, 0, "forgiveness", "Es gibt keinen Gott außer Dir. Preis sei Dir! Ich gehörte wahrlich zu denen, die Unrecht tun."],
  [21, 88, 0, "hope", "Da erhörten Wir ihn und erretteten ihn aus dem Kummer. So retten Wir die Gläubigen."],
  [23, 118, 0, "forgiveness", "Mein Herr, vergib und erbarme Dich, denn Du bist der Beste der Barmherzigen."],
  [24, 22, 0, "forgiveness", "Sie sollen verzeihen und nachsichtig sein. Liebt ihr es nicht, dass Allah euch vergibt?"],
  [24, 30, 0, "temptation", "Sag zu den gläubigen Männern, sie sollen ihre Blicke senken und ihre Keuschheit wahren. Das ist lauterer für sie."],
  [24, 31, 0, "temptation", "Und sag zu den gläubigen Frauen, sie sollen ihre Blicke senken und ihre Keuschheit wahren."],
  [24, 35, 0, "hope", "Allah ist das Licht der Himmel und der Erde."],
  [25, 70, 0, "renewal", "Außer wer bereut, glaubt und rechtschaffen handelt; diesen wird Allah ihre bösen Taten gegen gute eintauschen. Allah ist allvergebend und barmherzig."],
  [25, 63, 0, "peace", "Die Diener des Allerbarmers sind diejenigen, die demütig auf der Erde gehen und, wenn die Unwissenden sie ansprechen, „Frieden“ sagen."],
  [25, 74, 0, "love", "Unser Herr, schenke uns an unseren Ehepartnern und Nachkommen Freude der Augen."],
  [26, 80, 0, "comfort", "Und wenn ich krank bin, ist Er es, der mich heilt."],
  [28, 24, 0, "trust", "Mein Herr, ich bin auf das Gute angewiesen, das Du mir herabsendest."],
  [29, 2, 0, "patience", "Meinen die Menschen, dass sie in Ruhe gelassen werden, wenn sie sagen: „Wir glauben“, ohne geprüft zu werden?"],
  [29, 45, 0, "temptation", "Gewiss, das Gebet hält ab von Schändlichem und Verwerflichem. Und das Gedenken Allahs ist wahrlich größer."],
  [29, 69, 0, "strength", "Und diejenigen, die sich um Unseretwillen bemühen, werden Wir ganz gewiss Unsere Wege leiten."],
  [31, 17, 0, "patience", "Und ertrage geduldig, was dich trifft."],
  [33, 41, 0, "peace", "O ihr, die ihr glaubt, gedenkt Allahs in häufigem Gedenken."],
  [39, 10, 0, "patience", "Gewiss, den Geduldigen wird ihr Lohn ohne Maß zuteil."],
  [39, 53, 0, "forgiveness", "Sag: O Meine Diener, die ihr gegen euch selbst maßlos gewesen seid, verliert nicht die Hoffnung auf Allahs Barmherzigkeit. Gewiss, Allah vergibt alle Sünden."],
  [40, 60, 0, "trust", "Euer Herr sagt: Ruft Mich an, so erhöre Ich euch."],
  [41, 30, 0, "comfort", "Fürchtet euch nicht und seid nicht traurig, sondern freut euch über den Paradiesgarten, der euch versprochen wurde."],
  [41, 36, 0, "temptation", "Und wenn dich vom Satan eine Eingebung aufstachelt, so suche Zuflucht bei Allah. Er ist der Allhörende, der Allwissende."],
  [42, 25, 0, "forgiveness", "Er ist es, der die Reue Seiner Diener annimmt und die bösen Taten verzeiht."],
  [47, 7, 0, "strength", "O ihr, die ihr glaubt, wenn ihr Allah helft, hilft Er euch und festigt eure Füße."],
  [48, 4, 0, "peace", "Er ist es, der die innere Ruhe in die Herzen der Gläubigen herabgesandt hat, damit sie ihrem Glauben noch Glauben hinzufügen."],
  [50, 16, 0, "love", "Und Wir sind ihm näher als seine Halsschlagader."],
  [55, 13, 0, "gratitude", "Welche der Wohltaten eures Herrn wollt ihr denn leugnen?"],
  [57, 4, 0, "comfort", "Und Er ist mit euch, wo immer ihr seid."],
  [57, 16, 0, "renewal", "Ist es nicht an der Zeit für die Gläubigen, dass ihre Herzen demütig werden beim Gedenken Allahs?"],
  [59, 18, 0, "renewal", "Und jede Seele soll schauen, was sie für morgen vorausschickt."],
  [64, 11, 0, "trust", "Kein Unglück trifft ein außer mit Allahs Erlaubnis. Und wer an Allah glaubt, dessen Herz leitet Er recht."],
  [65, 2, 3, "hope", "Wer Allah fürchtet, dem schafft Er einen Ausweg und versorgt ihn, von wo er es nicht erwartet. Und wer sich auf Allah verlässt, dem ist Er genug."],
  [65, 7, 0, "hope", "Allah wird nach Schwierigkeit Erleichterung schaffen."],
  [66, 8, 0, "renewal", "O ihr, die ihr glaubt, kehrt in aufrichtiger Reue zu Allah um."],
  [67, 2, 0, "patience", "Der den Tod und das Leben erschaffen hat, um euch zu prüfen, wer von euch die besten Taten begeht."],
  [79, 40, 41, "temptation", "Wer aber den Stand seines Herrn gefürchtet und seine Seele von der Begierde abgehalten hat, dessen Zufluchtsort ist der Paradiesgarten."],
  [89, 27, 28, "peace", "O du Seele, die du Ruhe gefunden hast, kehre zu deinem Herrn zurück, zufrieden und mit Wohlgefallen."],
  [93, 3, 0, "comfort", "Dein Herr hat dich weder verlassen noch verabscheut."],
  [93, 4, 0, "hope", "Wahrlich, das Spätere ist besser für dich als das Frühere."],
  [93, 5, 0, "hope", "Und dein Herr wird dir gewiss geben, und dann wirst du zufrieden sein."],
  [94, 5, 6, "hope", "Gewiss, mit der Schwierigkeit kommt Erleichterung. Gewiss, mit der Schwierigkeit kommt Erleichterung."],
  [94, 8, 0, "trust", "Und zu deinem Herrn richte dein Begehren."],
  [103, 1, 3, "patience", "Bei der Zeit! Der Mensch ist wahrlich im Verlust, außer denen, die glauben, Gutes tun, einander die Wahrheit ans Herz legen und einander die Geduld ans Herz legen."],
  [112, 1, 4, "trust", "Sag: Er ist Allah, ein Einziger, Allah, der Beständige. Er zeugt nicht und ist nicht gezeugt worden, und niemand ist Ihm gleich."],
  [113, 1, 2, "temptation", "Sag: Ich nehme Zuflucht beim Herrn des Tagesanbruchs vor dem Übel dessen, was Er erschaffen hat."],
  [114, 1, 4, "temptation", "Sag: Ich nehme Zuflucht beim Herrn der Menschen, dem König der Menschen, dem Gott der Menschen, vor dem Übel des Einflüsterers, der sich zurückzieht."],
];

// The Bible API counts Psalms like English Bibles: the superscription is not verse 1 there,
// so German references are shifted by one (Psalm 51 by two).
const PSALM_SHIFT = { 4: 1, 18: 1, 30: 1, 31: 1, 34: 1, 40: 1, 42: 1, 46: 1, 51: 2, 55: 1, 62: 1 };
export function apiVerse(verse) {
  const shift = verse.book === 19 ? PSALM_SHIFT[verse.chapter] || 0 : 0;
  return { from: verse.verse - shift, to: (verse.to || verse.verse) - shift };
}

export const VERSES = [
  ...B.map(([book, chapter, verse, to, theme, text]) => ({
    religion: "christian", book, chapter, verse, to, theme, text,
    ref: `${BIBLE_BOOKS[book - 1]} ${chapter},${verse}${to ? `–${to}` : ""}`,
  })),
  ...Q.map(([surah, ayah, to, theme, text]) => ({
    religion: "islam", surah, ayah, to, theme, text, meaning: true,
    ref: `Sure ${SURAHS[surah - 1]} ${surah}:${ayah}${to ? `–${to}` : ""}`,
  })),
];

// ---- prayers and supplications -------------------------------------------------------------
// moment: morning, evening, craving, relapse, anxiety, gratitude, sleep, blessing, daily
export const PRAYERS = [
  // Christian
  { id: "vaterunser", religion: "christian", moment: "daily", title: "Vaterunser", text: "Vater unser im Himmel,\ngeheiligt werde dein Name.\nDein Reich komme.\nDein Wille geschehe,\nwie im Himmel, so auf Erden.\nUnser tägliches Brot gib uns heute.\nUnd vergib uns unsere Schuld,\nwie auch wir vergeben unsern Schuldigern.\nUnd führe uns nicht in Versuchung,\nsondern erlöse uns von dem Bösen.\nDenn dein ist das Reich und die Kraft\nund die Herrlichkeit in Ewigkeit.\nAmen.", source: "Matthäus 6,9–13" },
  { id: "gelassenheit", religion: "christian", moment: "craving", title: "Gelassenheitsgebet", text: "Gott, gib mir die Gelassenheit,\nDinge hinzunehmen, die ich nicht ändern kann,\nden Mut, Dinge zu ändern, die ich ändern kann,\nund die Weisheit, das eine vom anderen zu unterscheiden.", source: "nach Reinhold Niebuhr – gebetet in vielen Selbsthilfegruppen" },
  { id: "ave", religion: "christian", traditions: ["catholic"], moment: "daily", title: "Ave Maria", text: "Gegrüßet seist du, Maria, voll der Gnade,\nder Herr ist mit dir.\nDu bist gebenedeit unter den Frauen,\nund gebenedeit ist die Frucht deines Leibes, Jesus.\nHeilige Maria, Mutter Gottes,\nbitte für uns Sünder\njetzt und in der Stunde unseres Todes.\nAmen.", source: "Lukas 1,28.42" },
  { id: "jesusgebet", religion: "christian", traditions: ["orthodox", "catholic"], moment: "craving", title: "Jesusgebet (Herzensgebet)", text: "Herr Jesus Christus, Sohn Gottes,\nerbarme dich meiner.", source: "Ostkirchliche Tradition – im Rhythmus des Atems gebetet" },
  { id: "morgensegen", religion: "christian", traditions: ["protestant", "free"], moment: "morning", title: "Luthers Morgensegen", text: "Ich danke dir, mein himmlischer Vater,\ndurch Jesus Christus, deinen lieben Sohn,\ndass du mich diese Nacht vor allem Schaden und Gefahr behütet hast,\nund bitte dich,\ndu wollest mich diesen Tag auch behüten vor Sünden und allem Übel,\ndass dir all mein Tun und Leben gefalle.\nDenn ich befehle mich, meinen Leib und Seele und alles in deine Hände.\nDein heiliger Engel sei mit mir,\ndass der böse Feind keine Macht an mir finde.\nAmen.", source: "Martin Luther, Kleiner Katechismus (1529)" },
  { id: "abendsegen", religion: "christian", traditions: ["protestant", "free"], moment: "evening", title: "Luthers Abendsegen", text: "Ich danke dir, mein himmlischer Vater,\ndurch Jesus Christus, deinen lieben Sohn,\ndass du mich diesen Tag gnädiglich behütet hast,\nund bitte dich,\ndu wollest mir vergeben alle meine Sünde, wo ich Unrecht getan habe,\nund mich diese Nacht auch gnädiglich behüten.\nDenn ich befehle mich, meinen Leib und Seele und alles in deine Hände.\nDein heiliger Engel sei mit mir,\ndass der böse Feind keine Macht an mir finde.\nAmen.", source: "Martin Luther, Kleiner Katechismus (1529)" },
  { id: "morgen-c", religion: "christian", moment: "morning", title: "Gebet am Morgen", text: "Guter Gott,\ndieser Tag ist ein Geschenk von dir.\nGib mir Kraft für das, was heute kommt,\nKlarheit, wenn ich schwanke,\nund ein waches Herz für die Menschen um mich.\nIch lege diesen Tag in deine Hände.\nAmen." },
  { id: "abend-c", religion: "christian", moment: "evening", title: "Gebet am Abend", text: "Herr, der Tag geht zu Ende.\nDanke für alles, was gelungen ist.\nWas misslungen ist, lege ich dir hin.\nVergib mir, wo ich schuldig geworden bin,\nund schenke mir eine ruhige Nacht.\nIn deine Hände lege ich mich.\nAmen." },
  { id: "versuchung-c", religion: "christian", moment: "craving", title: "Gebet in der Versuchung", text: "Jesus, gerade ist das Verlangen stark.\nIch schaffe es nicht allein – darum bitte ich dich:\nSei jetzt bei mir.\nGib mir die Kraft, Nein zu sagen,\nund zeig mir den nächsten guten Schritt.\nDu bist stärker als das, was mich zieht.\nAmen." },
  { id: "rueckfall-c", religion: "christian", moment: "relapse", title: "Gebet nach einem Rückfall", text: "Vater, ich bin gefallen.\nIch schäme mich – und komme trotzdem zu dir,\nwie der verlorene Sohn nach Hause kam.\nDanke, dass deine Barmherzigkeit jeden Morgen neu ist.\nHilf mir, wieder aufzustehen\nund heute neu anzufangen.\nAmen." },
  { id: "angst-c", religion: "christian", moment: "anxiety", title: "Gebet bei Angst und Unruhe", text: "Herr, mein Herz ist unruhig.\nDu hast gesagt: Fürchte dich nicht, ich bin bei dir.\nNimm mir die Angst ab, die ich nicht tragen kann.\nLass mich atmen, still werden und dir vertrauen.\nAmen." },
  { id: "dank-c", religion: "christian", moment: "gratitude", title: "Dankgebet", text: "Danke, Gott, für diesen Tag,\nfür jeden Moment, in dem ich stark geblieben bin,\nfür die Menschen, die mich tragen,\nund für deine Liebe, die nie aufhört.\nAmen." },
  { id: "segen", religion: "christian", moment: "blessing", title: "Aaronitischer Segen", text: "Der HERR segne dich und behüte dich;\nder HERR lasse sein Angesicht leuchten über dir und sei dir gnädig;\nder HERR hebe sein Angesicht über dich und gebe dir Frieden.", source: "4. Mose 6,24–26" },
  { id: "gloria", religion: "christian", traditions: ["catholic", "orthodox", "protestant"], moment: "daily", title: "Ehre sei dem Vater", text: "Ehre sei dem Vater und dem Sohn\nund dem Heiligen Geist,\nwie im Anfang, so auch jetzt und alle Zeit\nund in Ewigkeit.\nAmen." },
  { id: "nacht-c", religion: "christian", moment: "sleep", title: "Kurzes Nachtgebet", text: "Müde bin ich, geh zur Ruh,\nschließe beide Äuglein zu;\nVater, lass die Augen dein\nüber meinem Bette sein.", source: "Luise Hensel (1817)" },

  // Islam
  { id: "fatiha", religion: "islam", moment: "daily", title: "Al-Fātiḥa – Die Eröffnende", translit: "Bismillāhi r-raḥmāni r-raḥīm. Al-ḥamdu lillāhi rabbi l-ʿālamīn. Ar-raḥmāni r-raḥīm. Māliki yaumi d-dīn. Iyyāka naʿbudu wa iyyāka nastaʿīn. Ihdinā ṣ-ṣirāṭa l-mustaqīm. Ṣirāṭa lladhīna anʿamta ʿalaihim, ghairi l-maghḍūbi ʿalaihim wa la ḍ-ḍāllīn.", text: "Im Namen Allahs, des Allerbarmers, des Barmherzigen.\nAlles Lob gehört Allah, dem Herrn der Welten,\ndem Allerbarmer, dem Barmherzigen,\ndem Herrscher am Tag des Gerichts.\nDir allein dienen wir, und Dich allein bitten wir um Hilfe.\nFühre uns den geraden Weg,\nden Weg derer, denen Du Gnade erwiesen hast,\nnicht derer, die Deinen Zorn erregt haben, und nicht der Irregehenden.", source: "Koran 1:1–7", quran: [1, 1] },
  { id: "kursi", religion: "islam", moment: "sleep", title: "Āyat al-Kursī – Thronvers", text: "Allah – es gibt keinen Gott außer Ihm, dem Lebendigen, dem Beständigen. Ihn überkommt weder Schlummer noch Schlaf. Ihm gehört, was in den Himmeln und was auf der Erde ist … Sein Thron umfasst die Himmel und die Erde, und es fällt Ihm nicht schwer, sie zu bewahren. Er ist der Erhabene, der Allgewaltige.", source: "Koran 2:255 – vor dem Schlafen und nach dem Gebet", quran: [2, 255] },
  { id: "taawwudh", religion: "islam", moment: "craving", title: "Zuflucht suchen (Taʿawwudh)", translit: "Aʿūdhu billāhi mina sch-schaiṭāni r-radschīm.", text: "Ich suche Zuflucht bei Allah vor dem verfluchten Satan.", source: "vgl. Koran 16:98 und 41:36 – wenn die Versuchung kommt" },
  { id: "yunus", religion: "islam", moment: "anxiety", title: "Bittgebet des Propheten Yūnus", translit: "Lā ilāha illā anta, subḥānaka, innī kuntu mina ẓ-ẓālimīn.", text: "Es gibt keinen Gott außer Dir. Preis sei Dir! Ich gehörte wahrlich zu denen, die Unrecht tun.", source: "Koran 21:87 – gebetet im Bauch des Wals, aus der tiefsten Dunkelheit", quran: [21, 87] },
  { id: "hasbuna", religion: "islam", moment: "anxiety", title: "Allah genügt mir", translit: "Ḥasbunallāhu wa niʿma l-wakīl.", text: "Allah genügt uns, und welch vortrefflicher Sachwalter ist Er!", source: "Koran 3:173", quran: [3, 173] },
  { id: "istighfar", religion: "islam", moment: "relapse", title: "Um Vergebung bitten (Istighfār)", translit: "Astaghfirullāha wa atūbu ilaih.", text: "Ich bitte Allah um Vergebung und wende mich Ihm reuig zu.", source: "Überliefert in Buchārī und Muslim – der Prophet ﷺ sprach es viele Male am Tag" },
  { id: "musa", religion: "islam", moment: "craving", title: "Bittgebet des Propheten Mūsā", translit: "Rabbi schraḥ lī ṣadrī wa yassir lī amrī.", text: "Mein Herr, weite mir meine Brust und erleichtere mir meine Angelegenheit.", source: "Koran 20:25–26", quran: [20, 25] },
  { id: "hamm", religion: "islam", moment: "anxiety", title: "Bittgebet gegen Sorge und Kummer", translit: "Allāhumma innī aʿūdhu bika mina l-hammi wa l-ḥazan, wa l-ʿadschzi wa l-kasal, wa l-buchli wa l-dschubn, wa ḍalaʿi d-daini wa ghalabati r-ridschāl.", text: "O Allah, ich suche Zuflucht bei Dir vor Sorge und Kummer, vor Schwäche und Trägheit, vor Geiz und Feigheit, vor der Last der Schulden und davor, von Menschen überwältigt zu werden.", source: "Überliefert in Buchārī" },
  { id: "qayyum", religion: "islam", moment: "craving", title: "Hilferuf an den Lebendigen", translit: "Yā Ḥayyu yā Qayyūm, bi-raḥmatika astaghīth.", text: "O Lebendiger, o Beständiger, bei Deiner Barmherzigkeit suche ich Hilfe.", source: "Überliefert in Tirmidhī" },
  { id: "adam", religion: "islam", moment: "relapse", title: "Bittgebet Adams", translit: "Rabbanā ẓalamnā anfusanā wa in lam taghfir lanā wa tarḥamnā la-nakūnanna mina l-chāsirīn.", text: "Unser Herr, wir haben uns selbst Unrecht getan. Wenn Du uns nicht vergibst und Dich unser nicht erbarmst, werden wir gewiss zu den Verlierern gehören.", source: "Koran 7:23", quran: [7, 23] },
  { id: "bismillah-morgen", religion: "islam", moment: "morning", title: "Schutz am Morgen und Abend", translit: "Bismillāhi lladhī lā yaḍurru maʿa smihī schaiʾun fi l-arḍi wa lā fi s-samāʾ, wa huwa s-samīʿu l-ʿalīm.", text: "Im Namen Allahs, mit dessen Namen nichts auf der Erde und nichts im Himmel schaden kann. Er ist der Allhörende, der Allwissende. (Dreimal sprechen.)", source: "Überliefert in Abū Dāwūd und Tirmidhī" },
  { id: "morgen-i", religion: "islam", moment: "morning", title: "Beim Aufwachen", translit: "Al-ḥamdu lillāhi lladhī aḥyānā baʿda mā amātanā wa ilaihi n-nuschūr.", text: "Alles Lob gehört Allah, der uns wieder lebendig gemacht hat, nachdem Er uns hat sterben lassen, und zu Ihm ist die Auferstehung.", source: "Überliefert in Buchārī" },
  { id: "schlaf-i", religion: "islam", moment: "sleep", title: "Vor dem Schlafen", translit: "Bismika llāhumma amūtu wa aḥyā.", text: "In Deinem Namen, o Allah, sterbe ich und lebe ich.", source: "Überliefert in Buchārī" },
  { id: "salawat", religion: "islam", moment: "daily", title: "Segenswunsch für den Propheten (Ṣalawāt)", translit: "Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad.", text: "O Allah, segne Muḥammad und die Familie Muḥammads.", source: "Gebetet in sunnitischer und schiitischer Tradition" },
  { id: "dunya", religion: "islam", moment: "daily", title: "Gutes im Diesseits und Jenseits", translit: "Rabbanā ātinā fi d-dunyā ḥasanatan wa fi l-āchirati ḥasanatan wa qinā ʿadhāba n-nār.", text: "Unser Herr, gib uns im Diesseits Gutes und im Jenseits Gutes und bewahre uns vor der Strafe des Feuers.", source: "Koran 2:201", quran: [2, 201] },
  { id: "dank-i", religion: "islam", moment: "gratitude", title: "Dank (Schukr)", translit: "Al-ḥamdu lillāh.", text: "Alles Lob gehört Allah – für diesen Tag, für jede Stunde, in der ich standhaft geblieben bin, und für Seine Barmherzigkeit, die nie aufhört." },
  { id: "rueckfall-i", religion: "islam", moment: "relapse", title: "Gebet nach einem Rückfall", text: "O Allah, ich bin gefallen und ich schäme mich.\nDoch Du hast gesagt: Verliert nicht die Hoffnung auf Meine Barmherzigkeit.\nIch kehre zu Dir zurück. Vergib mir,\ngib mir Kraft, wieder aufzustehen,\nund mach mich heute stärker als gestern.\nĀmīn.", source: "Persönliches Bittgebet (Duʿāʾ) – in eigenen Worten" },
  { id: "versuchung-i", religion: "islam", moment: "craving", title: "Duʿāʾ in der Versuchung", text: "O Allah, das Verlangen ist gerade stark,\nund ich bin schwach erschaffen.\nSchütze mich vor dem Einflüsterer,\nweite mir meine Brust\nund gib mir die Kraft, Nein zu sagen – für Dich und für mich.\nĀmīn.", source: "Persönliches Bittgebet (Duʿāʾ) – in eigenen Worten" },
];

export const MOMENTS = {
  craving: "Bei Verlangen", relapse: "Nach einem Rückfall", anxiety: "Angst & Sorge", morning: "Morgens", evening: "Abends",
  sleep: "Vor dem Schlafen", gratitude: "Dankbarkeit", daily: "Täglich", blessing: "Segen",
};

// Counters for dhikr / prayer beads – same tool for both.
export const COUNTERS = {
  islam: [
    { id: "tasbih", label: "Tasbīḥ nach dem Gebet", steps: [["Subḥānallāh", "Preis sei Allah", 33], ["Al-ḥamdu lillāh", "Alles Lob gehört Allah", 33], ["Allāhu akbar", "Allah ist größer", 34]] },
    { id: "istighfar", label: "Istighfār", steps: [["Astaghfirullāh", "Ich bitte Allah um Vergebung", 100]] },
    { id: "salawat", label: "Ṣalawāt", steps: [["Allāhumma ṣalli ʿalā Muḥammad", "O Allah, segne Muḥammad", 100]] },
    { id: "tahlil", label: "Tahlīl", steps: [["Lā ilāha illallāh", "Es gibt keinen Gott außer Allah", 100]] },
  ],
  christian: [
    { id: "jesus", label: "Jesusgebet (Gebetsschnur)", steps: [["Herr Jesus Christus, erbarme dich meiner", "", 100]] },
    { id: "rosary", label: "Rosenkranz-Gesätz", traditions: ["catholic"], steps: [["Vaterunser", "", 1], ["Gegrüßet seist du, Maria", "", 10], ["Ehre sei dem Vater", "", 1]] },
    { id: "kyrie", label: "Kyrie eleison", steps: [["Kyrie eleison", "Herr, erbarme dich", 40]] },
    { id: "dank", label: "Dank-Gebet", steps: [["Danke, Herr", "für …", 10]] },
  ],
};

// Tracker items per religion (shown when the tracker is enabled).
export const TRACKER = {
  islam: [
    { id: "fajr", label: "Fadschr" }, { id: "dhuhr", label: "Dhuhr" }, { id: "asr", label: "Asr" }, { id: "maghrib", label: "Maghrib" }, { id: "isha", label: "Ischa" },
  ],
  christian: [
    { id: "morning", label: "Morgengebet" }, { id: "bible", label: "Bibel gelesen" }, { id: "evening", label: "Abendgebet" },
    { id: "rosary", label: "Rosenkranz", traditions: ["catholic"] }, { id: "jesus", label: "Jesusgebet", traditions: ["orthodox"] },
  ],
};

// Reflection prompts for the faith journal.
export const JOURNAL_KINDS = {
  gratitude: { label: "Dankbarkeit", icon: "🙏", prompt: { christian: "Wofür danke ich Gott heute?", islam: "Wofür sage ich heute Alḥamdulillāh?" } },
  repentance: { label: "Umkehr & Neuanfang", icon: "🌱", prompt: { christian: "Was möchte ich Gott hinlegen – und was mache ich ab heute anders?", islam: "Wofür bitte ich um Vergebung (Tauba) – und was mache ich ab heute anders?" } },
  intention: { label: "Vorsatz", icon: "🎯", prompt: { christian: "Mein Vorsatz für heute:", islam: "Meine Absicht (Niyya) für heute:" } },
  request: { label: "Gebetsanliegen", icon: "🕯️", prompt: { christian: "Worum bitte ich Gott?", islam: "Worum bitte ich Allah in meinem Duʿāʾ?" } },
  reflection: { label: "Gedanken", icon: "✍️", prompt: { christian: "Was hat Gottes Wort heute in mir bewegt?", islam: "Was hat der Koran heute in mir bewegt?" } },
};

// ---- readers ---------------------------------------------------------------------------------
export const QURAN_EDITIONS = [
  ["de.bubenheim", "Deutsch – Bubenheim & Elyas"], ["de.aburida", "Deutsch – Abu Rida"], ["de.khoury", "Deutsch – Khoury"], ["de.zaidan", "Deutsch – Zaidan"],
  ["en.sahih", "English – Saheeh International"], ["en.yusufali", "English – Yusuf Ali"], ["tr.diyanet", "Türkçe – Diyanet İşleri"], ["tr.vakfi", "Türkçe – Diyanet Vakfı"],
  ["bs.korkut", "Bosanski – Korkut"], ["sq.ahmeti", "Shqip – Ahmeti"], ["ar.muyassar", "العربية – التفسير الميسر"], ["fr.hamidullah", "Français – Hamidullah"],
  ["ru.kuliev", "Русский – Кулиев"], ["es.cortes", "Español – Cortés"], ["it.piccardo", "Italiano – Piccardo"], ["nl.siregar", "Nederlands – Siregar"],
  ["pl.bielawskiego", "Polski – Bielawski"], ["fa.makarem", "فارسی – مکارم شیرازی"], ["ur.jalandhry", "اردو – جالندہری"], ["id.indonesian", "Bahasa Indonesia"],
  ["ku.asan", "Kurdî – Asan"], ["az.musayev", "Azərbaycan – Musayev"], ["en.transliteration", "Umschrift (lateinisch)"],
];
export const RECITERS = [
  ["ar.alafasy", "Mishary Alafasy"], ["ar.husary", "Mahmoud Khalil Al-Husary"], ["ar.minshawi", "Mohamed Siddiq Al-Minshawi"],
  ["ar.abdulbasitmurattal", "Abdul Basit (Murattal)"], ["ar.abdurrahmaansudais", "Abdurrahmaan As-Sudais"],
];
export const BIBLE_TRANSLATIONS = [
  ["elberfelder1905", "Deutsch – Elberfelder (1905)"], ["schlachter", "Deutsch – Schlachter (1951)"], ["luther1545", "Deutsch – Luther (1545)"], ["elberfelder", "Deutsch – Elberfelder (1871)"],
  ["kjv", "English – King James"], ["web", "English – World English Bible"], ["douayrheims", "English – Douay-Rheims (katholisch)"],
  ["turkish", "Türkçe"], ["arabicsv", "العربية – Smith & Van Dyke"], ["synodal", "Русский – Синодальный"], ["ukrogienko", "Українська – Огієнко"],
  ["polugdanska", "Polski – Gdańska"], ["cornilescu", "Română – Cornilescu"], ["croatia", "Hrvatski"], ["srkdekavski", "Srpski – Daničić-Karadžić"],
  ["alb", "Shqip"], ["moderngreek", "Ελληνικά"], ["ls1910", "Français – Louis Segond"], ["valera", "Español – Reina Valera"],
  ["riveduta", "Italiano – Riveduta"], ["almeida", "Português – Almeida"], ["statenvertaling", "Nederlands – Statenvertaling"],
];

// ---- backgrounds -------------------------------------------------------------------------------
export const SCENES = {
  night: { label: "Sternennacht", css: "radial-gradient(ellipse at 70% 10%, #2c3e7a 0%, #0d1330 45%, #04060f 100%)", stars: true, dark: true },
  dawn: { label: "Morgenröte", css: "linear-gradient(180deg, #2d1b4e 0%, #b0577a 45%, #f3a86b 75%, #fde3b0 100%)", dark: true },
  desert: { label: "Wüste im Abendlicht", css: "linear-gradient(180deg, #1f2650 0%, #a8556b 40%, #e8955b 62%, #c97a3d 63%, #8e4f25 100%)", dark: true },
  mountains: { label: "Berge im Nebel", css: "linear-gradient(180deg, #dfe8ef 0%, #b7c8d6 40%, #7f97ab 41%, #5c7387 70%, #3e5163 100%)" },
  sea: { label: "Stilles Meer", css: "linear-gradient(180deg, #cfe7f5 0%, #8ec5e0 45%, #3f8db6 46%, #1f5f86 100%)" },
  forest: { label: "Wald am Morgen", css: "linear-gradient(180deg, #e7f1dc 0%, #a9c98f 40%, #4f7d4a 75%, #2c4a2f 100%)" },
  candle: { label: "Kerzenlicht", css: "radial-gradient(circle at 50% 70%, #ffcf7a 0%, #b5651d 18%, #3a1f0f 45%, #120904 100%)", dark: true },
  geometry: { label: "Ornament (islamische Kunst)", css: "#0f3b3a", pattern: "geometry", dark: true },
  glass: { label: "Kirchenfenster (christliche Kunst)", css: "#1a1f4a", pattern: "glass", dark: true },
  paper: { label: "Pergament – schlicht", css: "linear-gradient(180deg, #faf5e9 0%, #f1e6cf 100%)" },
};

// ---- helpers ---------------------------------------------------------------------------------
// Same verse for the whole day; alternates fairly between religions when both are on.
export function verseOfDay(religions, date = new Date(), theme = "") {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const pool = VERSES.filter((verse) => religions.includes(verse.religion) && (!theme || verse.theme === theme));
  if (!pool.length) return null;
  if (religions.length > 1 && !theme) {
    const religion = religions[day % religions.length];
    const own = pool.filter((verse) => verse.religion === religion);
    return own[Math.floor(day / religions.length) % own.length];
  }
  return pool[day % pool.length];
}

export function randomVerse(religions, theme = "") {
  const pool = VERSES.filter((verse) => religions.includes(verse.religion) && (!theme || verse.theme === theme));
  return pool[Math.floor(Math.random() * pool.length)] || null;
}
