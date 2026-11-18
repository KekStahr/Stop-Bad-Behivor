// A gentle, honest ask for support on the overview – about twice a week, never on a fixed day,
// and 28 days of quiet after someone opened the donation page.
import { api } from "./api.js";
import { prefs, setPref } from "./prefs.js";
import { dayKey } from "./progress.js";

export const DONATE_URL = "https://streamelements.com/rehscho/tip";
const DAY = 86400000;
const nextGap = () => (2.5 + Math.random() * 2) * DAY; // 2.5–4.5 days → about two asks per week

export function openDonation() {
  setPref("donateSnoozeUntil", Date.now() + 28 * DAY);
  return api("/api/app/open-external", { method: "POST", body: { url: DONATE_URL } });
}

// true when the card belongs on the overview today
export function donationDue(now = Date.now()) {
  const today = dayKey(new Date(now));
  if (now < (Number(prefs.donateSnoozeUntil) || 0)) return false; // opened the donation page: 28 quiet days
  if (prefs.donateShownDay === today) return prefs.donateDismissedDay !== today; // stays for the day it was shown
  if (!prefs.donateNextAt) { setPref("donateNextAt", now + nextGap()); return false; } // not on the very first days
  if (now < prefs.donateNextAt) return false;
  setPref("donateShownDay", today);
  setPref("donateNextAt", now + nextGap());
  return true;
}

export const donationCard = () => `
  <section class="card donate-card reveal" id="donate-card">
    <div class="donate-heart" aria-hidden="true">💚</div>
    <div class="donate-copy">
      <span class="eyebrow">Eine persönliche Bitte</span>
      <strong>Hallo, ich bin Reşo. Ich habe Life allein entwickelt.</strong>
      <p>Eine App wie diese zu bauen war unglaublich viel Arbeit. Damit ich sie am Laufen halten und weiter verbessern kann (Server, neue Funktionen, Übersetzungen), freue ich mich über jede kleine Unterstützung. Life bleibt für alle kostenlos.</p>
    </div>
    <div class="donate-actions">
      <button class="button button-primary" data-donate type="button">💚 Unterstützen</button>
      <button class="button button-plain small" data-donate-later type="button">Später</button>
    </div>
  </section>`;

export function bindDonation(root, showToast) {
  const card = root.querySelector("#donate-card");
  if (!card) return;
  card.querySelector("[data-donate]").addEventListener("click", () => {
    openDonation().catch((error) => showToast(error.message, true));
    card.remove();
    showToast("Danke von Herzen! 💚");
  });
  card.querySelector("[data-donate-later]").addEventListener("click", () => {
    setPref("donateDismissedDay", dayKey(new Date()));
    card.classList.add("is-leaving");
    setTimeout(() => card.remove(), 300);
  });
}
