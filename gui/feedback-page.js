// The small feedback window (desktop): same look, same language as the app.
import { api } from "./api.js";
import { loadPrefs, applyPrefs } from "./prefs.js";
import { initI18n } from "./i18n.js";
import { feedbackForm } from "./feedback.js";

applyPrefs();
await loadPrefs(api);
await initI18n();
feedbackForm(document.querySelector("#feedback-root"), { onDone: () => window.close() });
