// Krisen-Chat: find a trusted person, talk for 5 anonymous minutes, both decide whether to
// go on, then the person who asked rates the conversation. No names, no profiles, no codes.
import { escapeHtml } from "../api.js";
import { prefs } from "../prefs.js";
import { confirmSheet, chime } from "../ui.js";
import { socialProfile, timeline } from "../help.js";

const STORE_KEY = "reso:crisis";
let current = readId();
let autoStart = false;

function readId() {
  try {
    return Number(localStorage.getItem(STORE_KEY)) || 0;
  } catch {
    return 0;
  }
}
function remember(id) {
  current = id || 0;
  try {
    if (current) localStorage.setItem(STORE_KEY, String(current));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    // storage unavailable – the id lives in memory only
  }
}

// Called before the community page opens the crisis tab.
export function setPendingCrisis(detail = {}) {
  if (detail.id) remember(detail.id);
  if (detail.start) autoStart = true;
}

const clock = (seconds) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
const REASONS = [["harassment", "😠 Beleidigend"], ["dealing", "💊 Konsum-Werbung"], ["danger", "🆘 Gefährlich"], ["spam", "📢 Spam"], ["other", "❓ Anderes"]];

export function renderCrisis(container, { api, showToast, social }) {
  let help = null;
  let messages = [];
  let lastId = 0;
  let alive = true;
  let timer;
  let ticker;
  let screen = "";
  let feedbackDone = false;

  const call = (body) => api("/api/community/social/help", { method: "POST", body: { ...body, ...socialProfile() } });

  async function poll() {
    clearTimeout(timer);
    if (!alive) return;
    try {
      if (!current) {
        // resume a chat that is already running (e.g. after a restart or an accepted offer)
        const open = (social()?.help || []).find((item) => item.status !== "offered" || item.role === "seeker");
        if (open) remember(open.id);
      }
      if (current) {
        help = (await call({ action: "status", id: current })).help;
        if (help.room) {
          const result = await api("/api/community/social/sync", { method: "POST", body: { room: help.room, after: lastId, ...socialProfile() } });
          const fresh = (result.messages || []).filter((message) => message.id > lastId);
          if (fresh.length) {
            if (lastId && fresh.some((message) => !message.mine) && prefs.chatSound) chime("message");
            messages = messages.concat(fresh);
            lastId = fresh.at(-1).id;
          }
        }
      } else {
        help = null;
      }
    } catch (error) {
      if (/gibt es nicht mehr/.test(error.message)) {
        remember(0);
        help = null;
      }
    }
    if (!alive) return;
    draw();
    timer = setTimeout(poll, help && ["accepted", "deciding", "searching", "offered"].includes(help.status) ? 2000 : 8000);
  }

  function screenFor() {
    if (!help || ["cancelled", "expired"].includes(help.status)) return "idle";
    if (help.status === "searching" || help.status === "offered") return "search";
    if (help.status === "ended") return help.role === "seeker" && !help.feedback_given && !feedbackDone ? "feedback" : "done";
    return "chat"; // accepted or deciding
  }

  function draw() {
    const next = screenFor();
    if (next !== screen) {
      screen = next;
      ({ idle: drawIdle, search: drawSearch, chat: drawChat, feedback: drawFeedback, done: drawDone })[screen]();
    } else if (screen === "search") {
      container.querySelector("#crisis-timeline").innerHTML = timeline(help);
    } else if (screen === "chat") {
      updateChat();
    } else if (screen === "idle") {
      const online = container.querySelector("#helpers-online");
      if (online) online.textContent = helpersText();
    }
  }

  const helpersText = () => {
    const count = social()?.helpers_online || 0;
    return count ? `${count} ${count === 1 ? "Vertrauensperson ist" : "Vertrauenspersonen sind"} gerade erreichbar` : "Wir suchen jemanden für dich";
  };

  function drawIdle() {
    const me = social()?.me;
    const expired = help?.status === "expired";
    container.innerHTML = `
      <section class="crisis-hero">
        <div class="help-radar"><span></span><span></span><b>🤝</b></div>
        <span class="eyebrow">Krisen-Chat</span>
        <h2>Du musst da nicht allein durch.</h2>
        <p>Wir verbinden dich mit einer Vertrauensperson aus der Community. Ihr habt 5 Minuten – danach entscheidet ihr beide, ob ihr weiterredet.</p>
        <ul class="crisis-promises">
          <li>🔒 <span><strong>Komplett anonym</strong> Niemand sieht deinen Namen, Code oder dein Profil – auch nicht deine Freunde.</span></li>
          <li>⏱️ <span><strong>5 Minuten</strong> Kurz, ehrlich, ohne Verpflichtung.</span></li>
          <li>💙 <span><strong>Du bestimmst</strong> Du kannst jederzeit beenden, melden oder blockieren.</span></li>
        </ul>
        ${expired ? '<p class="crisis-alert">Gerade war leider niemand frei. Bitte ruf die TelefonSeelsorge an: <strong>0800 111 0 111</strong> (kostenlos, 24/7) – oder versuche es gleich noch einmal.</p>' : ""}
        <textarea id="crisis-note" maxlength="300" rows="2" placeholder="Optional: Was ist gerade los? (nur die Vertrauensperson sieht das)"></textarea>
        <button class="button button-primary button-large" id="crisis-start" type="button">Vertrauensperson finden</button>
        <small id="helpers-online" class="muted">${escapeHtml(helpersText())}</small>
        <p class="fine-print">Bei akuter Gefahr: <strong>112</strong> · TelefonSeelsorge <strong>0800 111 0 111</strong></p>
      </section>
      <section class="card crisis-profile">
        <span class="eyebrow">Dein Profil als Vertrauensperson</span>
        ${me?.helper_enabled || me?.helpful || me?.unhelpful ? `
          <div class="rating-row">
            <div><b>👍 ${me?.helpful || 0}</b><small>hilfreich</small></div>
            <div><b>👎 ${me?.unhelpful || 0}</b><small>nicht hilfreich</small></div>
          </div>
          <p class="muted small">${me?.helper_enabled ? "Du bist als Vertrauensperson erreichbar. Danke! 💙" : "Du bist gerade nicht als Vertrauensperson erreichbar."}</p>`
          : '<p class="muted small">Du kannst anderen helfen: Aktiviere in den Einstellungen unter „Vertrauensperson“, dass du angefragt werden darfst.</p>'}
      </section>`;
    const start = container.querySelector("#crisis-start");
    start.addEventListener("click", async () => {
      start.disabled = true;
      try {
        const result = await call({ action: "request", note: container.querySelector("#crisis-note").value.trim() });
        remember(result.help.id);
        help = result.help;
        messages = [];
        lastId = 0;
        feedbackDone = false;
        draw();
        poll();
      } catch (error) {
        start.disabled = false;
        showToast(error.message, true);
      }
    });
    if (autoStart) {
      autoStart = false;
      start.click();
    }
  }

  function drawSearch() {
    container.innerHTML = `
      <section class="crisis-hero">
        <div class="help-radar"><span></span><span></span><b>🤝</b></div>
        <h2>Wir suchen eine Vertrauensperson …</h2>
        <p class="muted">Bleib hier – das dauert meistens nur einen Moment. Atme ruhig ein und aus.</p>
        <ol class="help-timeline" id="crisis-timeline">${timeline(help)}</ol>
        <button class="button button-secondary" id="crisis-cancel" type="button">Anfrage abbrechen</button>
        <p class="fine-print">Niemand meldet sich? TelefonSeelsorge <strong>0800 111 0 111</strong> – kostenlos, rund um die Uhr.</p>
      </section>`;
    container.querySelector("#crisis-cancel").addEventListener("click", async () => {
      await call({ action: "cancel", id: help.id }).catch((error) => showToast(error.message, true));
      remember(0);
      help = null;
      draw();
    });
  }

  function drawChat() {
    const partner = help.role === "seeker" ? "Vertrauensperson" : "Hilfesuchende Person";
    container.innerHTML = `
      <div class="card crisis-chat">
        <header class="crisis-head">
          <span class="crisis-mask">🤝</span>
          <div><strong>${partner}</strong><span>Anonym · ${help.role === "seeker" ? "jemand aus der Community hört dir zu" : `Thema: ${escapeHtml(help.topic)}`}</span></div>
          <div class="crisis-clock" id="crisis-clock"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15"/><circle id="crisis-ring" cx="18" cy="18" r="15" pathLength="100"/></svg><b id="crisis-left"></b></div>
          <button class="button button-secondary small" id="crisis-end" type="button">Beenden</button>
        </header>
        ${help.role === "helper" && help.note ? `<blockquote class="offer-note crisis-note">„${escapeHtml(help.note)}“</blockquote>` : ""}
        <div class="messages crisis-messages" id="crisis-messages" aria-live="polite"></div>
        <div id="crisis-decide"></div>
        <form class="composer" id="crisis-composer">
          <textarea id="crisis-input" rows="1" maxlength="1000" placeholder="Schreib, was dich bewegt …" aria-label="Nachricht"></textarea>
          <button class="send-button" type="submit" aria-label="Senden" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button>
        </form>
        <p class="composer-hint">Teile keine Namen, Nummern oder Adressen – so bleibt ihr beide anonym. Notfall: 112.</p>
      </div>`;
    const form = container.querySelector("#crisis-composer");
    const input = container.querySelector("#crisis-input");
    const send = form.querySelector(".send-button");
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = `${Math.min(140, input.scrollHeight)}px`;
      send.disabled = !input.value.trim();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text || help.status !== "accepted") return;
      send.disabled = true;
      try {
        await api("/api/community/social/messages", { method: "POST", body: { room: help.room, text, ...socialProfile() } });
        input.value = "";
        input.style.height = "auto";
        poll();
      } catch (error) {
        showToast(error.message, true);
        send.disabled = false;
      }
    });
    container.querySelector("#crisis-end").addEventListener("click", async () => {
      const ok = await confirmSheet({ title: "Krisen-Chat beenden?", text: "Ihr könnt danach nicht mehr in diesem Chat schreiben.", confirmLabel: "Beenden" });
      if (!ok) return;
      help = (await call({ action: "end", id: help.id }).catch((error) => showToast(error.message, true)))?.help || help;
      draw();
    });
    container.querySelector("#crisis-messages").dataset.count = "0";
    updateChat();
  }

  // Updates countdown, messages and the "continue?" panel without rebuilding the composer.
  function updateChat() {
    const box = container.querySelector("#crisis-messages");
    if (!box) return;
    if (Number(box.dataset.count) !== messages.length) {
      box.innerHTML = messages.length ? messages.map((message) => `
        <div class="message ${message.mine ? "is-mine" : ""}">
          ${message.mine ? "" : '<span class="avatar small crisis-avatar">💙</span>'}
          <div class="bubble-wrap">
            ${message.mine ? "" : `<span class="sender">${escapeHtml(message.sender_name)}</span>`}
            ${message.text ? `<div class="bubble">${escapeHtml(message.text)}</div>` : ""}
          </div>
        </div>`).join("") : `<div class="chat-empty"><div class="empty-icon">💬</div><strong>Ihr seid verbunden.</strong><p>${help.role === "seeker" ? "Schreib einfach los – so wie es dir gerade geht." : "Begrüße die Person freundlich. Zuhören ist wichtiger als Lösungen."}</p></div>`;
      box.dataset.count = String(messages.length);
      box.scrollTop = box.scrollHeight;
    }
    const deciding = help.status === "deciding";
    container.querySelector("#crisis-composer").hidden = deciding;
    const panel = container.querySelector("#crisis-decide");
    const signature = `${help.status}|${help.my_vote}|${help.other_voted}`;
    if (panel.dataset.signature !== signature) {
      panel.dataset.signature = signature;
      panel.innerHTML = deciding ? `
        <div class="crisis-vote">
          <strong>Die 5 Minuten sind um.</strong>
          <p>${help.my_vote === true ? `Du möchtest weiterreden. ${help.other_voted ? "" : "Wir warten auf die andere Person …"}` : "Möchtest du weiterreden? Ihr müsst beide zustimmen – sonst endet der Chat."}</p>
          ${help.my_vote === true ? "" : `<div class="button-row">
            <button class="button button-primary" data-vote="continue" type="button">Weiterreden</button>
            <button class="button button-secondary" data-vote="stop" type="button">Chat beenden</button>
          </div>`}
          <small class="muted">Entscheidung offen: <b id="crisis-decide-left"></b></small>
        </div>` : "";
      panel.querySelectorAll("[data-vote]").forEach((button) => button.addEventListener("click", async () => {
        panel.querySelectorAll("button").forEach((item) => { item.disabled = true; });
        try {
          help = (await call({ action: "vote", id: help.id, decision: button.dataset.vote })).help;
          if (help.status === "accepted") showToast("Ihr redet weiter – 5 neue Minuten. 💙");
          draw();
        } catch (error) {
          showToast(error.message, true);
        }
      }));
      if (deciding) chime("message");
    }
    tickClock();
  }

  // Local one-second countdown between server polls.
  let shownAt = 0;
  let base = { session: 0, decide: 0, id: "" };
  function tickClock() {
    if (!help || screen !== "chat") return;
    const key = `${help.status}|${help.session_left}|${help.decide_left}`;
    if (key !== base.id) {
      base = { session: help.session_left || 0, decide: help.decide_left || 0, id: key };
      shownAt = Date.now();
    }
    const passed = Math.floor((Date.now() - shownAt) / 1000);
    const left = container.querySelector("#crisis-left");
    const ring = container.querySelector("#crisis-ring");
    if (help.status === "accepted" && left) {
      const seconds = Math.max(0, base.session - passed);
      left.textContent = clock(seconds);
      ring.style.strokeDasharray = `${(seconds / 300) * 100} 100`;
      container.querySelector("#crisis-clock").classList.toggle("is-low", seconds <= 60);
    } else if (left) {
      left.textContent = "0:00";
      ring.style.strokeDasharray = "0 100";
    }
    const decideLeft = container.querySelector("#crisis-decide-left");
    if (decideLeft) decideLeft.textContent = clock(Math.max(0, base.decide - passed));
  }

  function drawFeedback() {
    let rating = "";
    let reason = "";
    container.innerHTML = `
      <section class="card crisis-feedback">
        <span class="crisis-mask big">💙</span>
        <h2>Danke, dass du dir Hilfe geholt hast.</h2>
        <p class="muted">Das braucht Mut. War das Gespräch hilfreich für dich? Deine Antwort bleibt anonym und erscheint nur als Zahl im Profil der Vertrauensperson.</p>
        <div class="rating-choice">
          <button type="button" data-rating="helpful"><span>👍</span>Hilfreich</button>
          <button type="button" data-rating="not_helpful"><span>👎</span>Nicht hilfreich</button>
        </div>
        <details class="crisis-report">
          <summary>Etwas war nicht in Ordnung?</summary>
          <div class="choice-grid">${REASONS.map(([id, label]) => `<button type="button" class="choice" data-reason="${id}">${label}</button>`).join("")}</div>
          <label class="check-row"><input type="checkbox" id="crisis-block"> Diese Person nie wieder mit mir verbinden</label>
        </details>
        <div class="button-row">
          <button class="button button-primary" id="crisis-send" type="button" disabled>Rückmeldung senden</button>
          <button class="button button-plain" id="crisis-skip" type="button">Überspringen</button>
        </div>
      </section>`;
    const send = container.querySelector("#crisis-send");
    container.querySelectorAll("[data-rating]").forEach((button) => button.addEventListener("click", () => {
      rating = button.dataset.rating;
      container.querySelectorAll("[data-rating]").forEach((item) => item.classList.toggle("is-selected", item === button));
      send.disabled = false;
    }));
    container.querySelectorAll("[data-reason]").forEach((button) => button.addEventListener("click", () => {
      reason = reason === button.dataset.reason ? "" : button.dataset.reason;
      container.querySelectorAll("[data-reason]").forEach((item) => item.classList.toggle("is-selected", item.dataset.reason === reason));
    }));
    send.addEventListener("click", async () => {
      send.disabled = true;
      try {
        help = (await call({ action: "feedback", id: help.id, decision: rating, report: reason, block: container.querySelector("#crisis-block").checked })).help;
        showToast(reason ? "Danke. Deine Meldung ist bei uns angekommen." : "Danke für deine Rückmeldung. 💙");
        draw();
      } catch (error) {
        send.disabled = false;
        showToast(error.message, true);
      }
    });
    container.querySelector("#crisis-skip").addEventListener("click", () => {
      feedbackDone = true;
      draw();
    });
  }

  function drawDone() {
    container.innerHTML = `
      <section class="crisis-hero">
        <span class="crisis-mask big">🌱</span>
        <h2>${help.role === "helper" ? "Danke, dass du da warst." : "Pass gut auf dich auf."}</h2>
        <p class="muted">${help.role === "helper" ? "Du hast heute jemandem zugehört. Das kann viel verändern." : "Wenn das Verlangen zurückkommt: Du kannst jederzeit wieder jemanden finden."}</p>
        <button class="button button-primary" id="crisis-again" type="button">Fertig</button>
      </section>`;
    container.querySelector("#crisis-again").addEventListener("click", () => {
      remember(0);
      help = null;
      messages = [];
      lastId = 0;
      draw();
    });
  }

  container.innerHTML = '<div class="card loading-state"><span class="spinner"></span>Einen Moment …</div>';
  ticker = setInterval(tickClock, 1000);
  poll();
  return () => {
    alive = false;
    clearTimeout(timer);
    clearInterval(ticker);
  };
}
