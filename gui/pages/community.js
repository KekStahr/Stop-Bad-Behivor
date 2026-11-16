import { escapeHtml } from "../api.js";
import { prefs, formatTime } from "../prefs.js";
import { confirmSheet, chime, openSheet } from "../ui.js";
import { ADDICTIONS } from "../recovery.js";
import { socialProfile } from "../help.js";
import { renderCrisis, setPendingCrisis } from "./crisis.js";

// Remembered between page switches.
let view = "chats";
let room = "";
let listScroll = 0;

// Lets other parts of the app open a specific chat.
export function setPendingRoom(nextRoom) {
  room = nextRoom;
  view = "chats";
}

// Opens the anonymous crisis chat (new request or an accepted one).
export function openCrisisTab(detail) {
  setPendingCrisis(detail);
  view = "crisis";
}

const EMOJIS = ["😊", "😂", "🥲", "😍", "🤗", "😢", "😭", "😤", "😴", "🤔", "🙏", "💪", "❤️", "💙", "💚", "🫂", "🔥", "✨", "🌱", "🌊",
  "☀️", "🌙", "🎉", "🏆", "👏", "👍", "🙌", "🤝", "✅", "💯", "🍀", "🌈", "🕊️", "⭐", "💤", "☕", "🍵", "🏃", "🧘", "🎧"];
const REACTIONS = ["💪", "❤️", "🙏", "🔥", "🫂"];
const URL_SPLIT = /((?:https?:\/\/|www\.)[^\s]+)/gi;
const MAX_IMAGE = 500 * 1024;

// Escapes text and turns links into buttons that ask before opening.
function richText(text) {
  return String(text || "").split(URL_SPLIT).map((part, index) => (index % 2
    ? `<button type="button" class="link-chip" data-link="${escapeHtml(part)}">🔗 ${escapeHtml(part.length > 48 ? `${part.slice(0, 45)}…` : part)}</button>`
    : escapeHtml(part))).join("");
}

const LAST_READ_KEY = "reso:lastRead";
function readLastRead() {
  try {
    return JSON.parse(localStorage.getItem(LAST_READ_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeLastRead(map) {
  try {
    localStorage.setItem(LAST_READ_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

const formatCode = (code) => `${code.slice(0, 5)}-${code.slice(5)}`;
function hue(code) {
  let value = 0;
  for (const character of code) value = (value * 31 + character.charCodeAt(0)) % 360;
  return value;
}
const avatar = (name, code, extra = "") =>
  `<span class="avatar ${extra}" style="--hue:${hue(code || name)}">${escapeHtml((name || "?").trim()[0]?.toUpperCase() || "?")}</span>`;

export async function render(root, { api, showToast, goTo }) {
  if (!room) {
    const preferred = prefs.defaultChannel === "auto"
      ? (ADDICTIONS[prefs.addiction] || ADDICTIONS.general).channel
      : prefs.defaultChannel;
    room = `c:${preferred || "general"}`;
  }
  let social = null;
  let socialError = "";
  let messages = [];
  let lastId = 0;
  let pollTimer;
  let alive = true;
  let syncing = false;
  let pendingSync = false;
  let filter = "";
  let crisisCleanup;
  const lastRead = readLastRead();

  root.innerHTML = `
    <header class="page-header reveal">
      <div>
        <span class="eyebrow">Gemeinsam stärker</span>
        <h1>Community</h1>
        <p class="subtitle">Menschen, die verstehen, was du durchmachst. Anonym, respektvoll, füreinander da.</p>
      </div>
      <div class="segmented" role="tablist" id="community-tabs">
        <span class="segmented-thumb" aria-hidden="true"></span>
        <button role="tab" data-view="chats" type="button">Chats</button>
        <button role="tab" data-view="crisis" type="button">🤝 Krisen-Chat</button>
        <button role="tab" data-view="friends" type="button">Freunde <i class="count-badge" id="request-badge" hidden></i></button>
        <button role="tab" data-view="challenges" type="button">Challenges</button>
        <button role="tab" data-view="overview" type="button">Übersicht</button>
      </div>
    </header>
    <div id="community-view" class="reveal"></div>`;

  const container = root.querySelector("#community-view");
  const tabs = root.querySelector("#community-tabs");

  function moveThumb() {
    const active = tabs.querySelector(`[data-view="${view}"]`);
    const thumb = tabs.querySelector(".segmented-thumb");
    tabs.querySelectorAll("[data-view]").forEach((tab) => tab.setAttribute("aria-selected", String(tab === active)));
    if (!active.offsetWidth) {
      if (alive) requestAnimationFrame(moveThumb);
      return;
    }
    thumb.style.width = `${active.offsetWidth}px`;
    thumb.style.transform = `translateX(${active.offsetLeft - 3}px)`;
  }

  tabs.querySelectorAll("[data-view]").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (view === tab.dataset.view) return;
      view = tab.dataset.view;
      moveThumb();
      renderView();
    });
  });

  // ---- data ---------------------------------------------------------------
  async function sync({ reset = false } = {}) {
    if (!alive) return;
    if (reset) {
      messages = [];
      lastId = 0;
    }
    if (syncing) {
      pendingSync = true; // run again once the in-flight request is done
      return;
    }
    syncing = true;
    const requestedRoom = room;
    try {
      const result = await api("/api/community/social/sync", {
        method: "POST",
        body: { room: view === "chats" ? requestedRoom : "", after: lastId, ...socialProfile() },
      });
      if (!alive) return;
      const hadError = Boolean(socialError) || !social;
      social = result;
      socialError = "";
      if (requestedRoom === room && result.room) {
        const fresh = result.messages.filter((message) => message.id > lastId);
        if (fresh.length) {
          const incoming = lastId > 0 && fresh.some((message) => !message.mine);
          messages = messages.concat(fresh);
          lastId = fresh.at(-1).id;
          if (incoming && prefs.chatSound) chime("message");
        }
        if (room.startsWith("d:")) {
          lastRead[room.slice(2)] = lastId;
          writeLastRead(lastRead);
        }
      }
      if (view === "crisis") updateRequestBadge(); // the crisis tab polls on its own
      else if (hadError) renderView();
      else updateView();
    } catch (error) {
      if (!alive) return;
      if ((error.message.includes("nur unter Freunden") && room.startsWith("d:")) || (room.startsWith("f:") && error.message.includes("Glaube"))) {
        room = `c:${prefs.defaultChannel === "auto" ? "general" : prefs.defaultChannel || "general"}`;
        showToast("Diese Unterhaltung ist nicht mehr verfügbar.", true);
        messages = [];
        lastId = 0;
        pendingSync = true;
        renderView();
        return;
      }
      const changed = socialError !== error.message;
      socialError = error.message;
      if (changed && view !== "crisis") renderView();
    } finally {
      syncing = false;
      if (pendingSync && alive) {
        pendingSync = false;
        sync();
      }
    }
  }

  function schedule() {
    clearTimeout(pollTimer);
    if (!alive) return;
    const seconds = Math.min(30, Math.max(2, Number(prefs.pollSeconds) || 4));
    pollTimer = setTimeout(async () => {
      if (!document.hidden && (view === "chats" || view === "friends")) await sync();
      schedule();
    }, seconds * 1000);
  }

  async function friendAction(action, code, success) {
    try {
      const result = await api("/api/community/social/friends", { method: "POST", body: { action, code } });
      showToast(success(result.status));
      await sync();
      return true;
    } catch (error) {
      showToast(error.message, true);
      return false;
    }
  }

  function openRoom(nextRoom) {
    if (nextRoom === room && view === "chats") return;
    room = nextRoom;
    view = "chats";
    messages = [];
    lastId = 0;
    moveThumb();
    renderView();
    sync();
  }

  // ---- rendering ----------------------------------------------------------
  function unreadFor(friend) {
    return friend.last_message_id > (lastRead[friend.code] || 0) && room !== `d:${friend.code}`;
  }

  function errorState() {
    return `
      <div class="card empty-state">
        <div class="empty-icon">☁︎</div>
        <h3>Community gerade nicht erreichbar</h3>
        <p class="muted">${escapeHtml(socialError)}</p>
        <button class="button button-primary" id="retry-social" type="button">Erneut versuchen</button>
      </div>`;
  }

  function bindError() {
    container.querySelector("#retry-social")?.addEventListener("click", () => sync({ reset: true }));
  }

  function renderView() {
    crisisCleanup?.();
    crisisCleanup = undefined;
    if (view === "crisis") {
      crisisCleanup = renderCrisis(container, { api, showToast, social: () => social });
      return undefined;
    }
    if (view === "overview") return renderOverview();
    if (view === "challenges") return renderChallenges();
    if (!social && !socialError) {
      container.innerHTML = '<div class="card loading-state"><span class="spinner"></span>Verbinde mit der Community …</div>';
      return undefined;
    }
    if (socialError && !social) {
      container.innerHTML = errorState();
      bindError();
      return undefined;
    }
    updateRequestBadge();
    return view === "friends" ? renderFriends() : renderChats();
  }

  function updateView() {
    updateRequestBadge();
    if (view === "chats") {
      renderRoomList();
      renderHeader();
      renderMessages();
    } else if (view === "friends") {
      renderFriendLists();
    }
  }

  function updateRequestBadge() {
    const badge = root.querySelector("#request-badge");
    const count = social?.incoming?.length || 0;
    badge.hidden = !count;
    badge.textContent = String(count);
    requestAnimationFrame(moveThumb);
  }

  function currentTitle() {
    if (room.startsWith("f:")) {
      const channel = social?.faith_channels?.find((item) => `f:${item.id}` === room);
      return { emoji: channel?.emoji || "🕊️", name: channel?.name || "Glaubensraum", sub: "Geschützter Raum · nur für Menschen mit aktiviertem Bereich Glaube" };
    }
    if (room.startsWith("c:")) {
      const channel = social?.channels.find((item) => `c:${item.id}` === room);
      const online = social?.online_by_channel?.[channel?.id] || 0;
      return { emoji: channel?.emoji || "💬", name: channel?.name || "Gruppe", sub: `Gruppenchat · ${online ? `${online} aus dieser Gruppe online · ` : ""}${social?.online || 0} insgesamt online` };
    }
    const friend = social?.friends.find((item) => `d:${item.code}` === room);
    return { friend, name: friend?.name || "Direktnachricht", sub: friend?.online ? "Online" : "Privat · nur ihr beide" };
  }

  function renderChats() {
    container.innerHTML = `
      <div class="card chat-layout">
        <aside class="chat-sidebar">
          <label class="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input id="room-filter" type="search" placeholder="Suchen" value="${escapeHtml(filter)}">
          </label>
          <div class="room-list" id="room-list"></div>
        </aside>
        <section class="conversation">
          <header class="conversation-header" id="conversation-header"></header>
          <div class="safety-strip">
            <span>Bei akuter Gefahr: <strong>112</strong> · TelefonSeelsorge <strong>0800 111 0 111</strong> (kostenlos, 24/7)</span>
            <button class="link-button" id="open-sos" type="button">Hilfe öffnen</button>
          </div>
          <div class="messages ${prefs.chatCompact ? "is-compact" : ""}" id="messages" aria-live="polite"></div>
          <div class="attachment" id="attachment" hidden><img id="attachment-preview" alt="Anhang"><button class="icon-button" id="attachment-remove" type="button" aria-label="Anhang entfernen">×</button></div>
          <div class="emoji-panel" id="emoji-panel" hidden>${EMOJIS.map((emoji) => `<button type="button" data-emoji="${emoji}">${emoji}</button>`).join("")}</div>
          <p class="link-hint" id="link-hint" hidden>⚠️ Links werden anderen mit Warnhinweis angezeigt. Teile keine persönlichen Daten.</p>
          <form class="composer" id="composer">
            <button class="composer-tool" id="emoji-toggle" type="button" aria-label="Emoji einfügen" title="Emoji">😊</button>
            <label class="composer-tool" title="Bild oder GIF senden" aria-label="Bild oder GIF senden">🖼️<input id="image-input" type="file" accept="image/png,image/jpeg,image/gif" hidden></label>
            <textarea id="composer-input" rows="1" maxlength="1000" placeholder="Nachricht schreiben …" aria-label="Nachricht"></textarea>
            <button class="send-button" type="submit" aria-label="Senden" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>
            </button>
          </form>
          <p class="composer-hint">${prefs.chatEnterSend ? "Enter sendet · Shift + Enter für neue Zeile" : "Strg + Enter sendet"} · Sei freundlich. Teile keine persönlichen Daten.</p>
        </section>
      </div>`;
    renderRoomList();
    renderHeader();
    renderMessages(true);

    container.querySelector("#room-filter").addEventListener("input", (event) => {
      filter = event.target.value;
      renderRoomList();
    });
    container.querySelector("#open-sos").addEventListener("click", () => window.dispatchEvent(new Event("reso:sos")));

    const form = container.querySelector("#composer");
    const input = container.querySelector("#composer-input");
    const send = form.querySelector(".send-button");
    const attachmentBox = container.querySelector("#attachment");
    const emojiPanel = container.querySelector("#emoji-panel");
    let attachment = null;
    const grow = () => {
      input.style.height = "auto";
      input.style.height = `${Math.min(160, input.scrollHeight)}px`;
      send.disabled = !input.value.trim() && !attachment;
      container.querySelector("#link-hint").hidden = !/(https?:\/\/|www\.)\S+/i.test(input.value);
    };
    container.querySelector("#emoji-toggle").addEventListener("click", () => { emojiPanel.hidden = !emojiPanel.hidden; });
    emojiPanel.addEventListener("click", (event) => {
      const emoji = event.target.closest("[data-emoji]")?.dataset.emoji;
      if (!emoji) return;
      const at = input.selectionStart ?? input.value.length;
      input.value = `${input.value.slice(0, at)}${emoji}${input.value.slice(at)}`;
      input.focus();
      input.setSelectionRange(at + emoji.length, at + emoji.length);
      grow();
    });
    container.querySelector("#image-input").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/gif"].includes(file.type)) return showToast("Nur PNG, JPEG oder GIF.", true);
      if (file.size > MAX_IMAGE) return showToast("Das Bild ist zu groß (höchstens 500 KB).", true);
      const reader = new FileReader();
      reader.onload = () => {
        attachment = { media_type: file.type, media_data: String(reader.result).split(",")[1] };
        container.querySelector("#attachment-preview").src = reader.result;
        attachmentBox.hidden = false;
        grow();
      };
      reader.readAsDataURL(file);
      return undefined;
    });
    container.querySelector("#attachment-remove").addEventListener("click", () => {
      attachment = null;
      attachmentBox.hidden = true;
      grow();
    });
    bindMessageActions(container.querySelector("#messages"));
    input.addEventListener("input", grow);
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const wantsSend = prefs.chatEnterSend ? !event.shiftKey : event.ctrlKey || event.metaKey;
      if (wantsSend) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text && !attachment) return;
      send.disabled = true;
      try {
        await api("/api/community/social/messages", { method: "POST", body: { room, text, ...(attachment || {}), ...socialProfile() } });
        attachment = null;
        attachmentBox.hidden = true;
        emojiPanel.hidden = true;
        try {
          localStorage.setItem("reso:lastMessageDay", new Date().toLocaleDateString("sv-SE")); // daily quest
        } catch {
          // storage unavailable
        }
        input.value = "";
        grow();
        await sync();
      } catch (error) {
        showToast(error.message, true);
        send.disabled = false;
      }
      input.focus();
    });
  }

  // Online in a group, without counting yourself (it looked like an unread badge).
  function othersOnline(channelId) {
    const count = social?.online_by_channel?.[channelId] || 0;
    return Math.max(0, count - (socialProfile().addiction === channelId ? 1 : 0));
  }

  function renderRoomList() {
    const list = container.querySelector("#room-list");
    if (!list || !social) return;
    if (!list.dataset.bound) {
      list.dataset.bound = "1";
      list.addEventListener("scroll", () => { listScroll = list.scrollTop; }, { passive: true });
    }
    const signature = JSON.stringify([filter, room, social.channels, social.faith_channels, social.friends, lastRead, social.help, social.helpers_online]);
    if (list.dataset.signature === signature) return;
    list.dataset.signature = signature;
    const query = filter.trim().toLowerCase();
    const matches = (name) => !query || name.toLowerCase().includes(query);
    const channels = social.channels.filter((channel) => matches(channel.name));
    const faithRooms = (social.faith_channels || []).filter((channel) => matches(channel.name));
    const friends = social.friends.filter((friend) => matches(friend.name));
    list.innerHTML = `
      <button class="help-cta" id="help-cta" type="button"><span>🤝</span><span><strong>Mit einer Vertrauensperson sprechen</strong><small>${social.helpers_online ? `${social.helpers_online} gerade erreichbar` : "Wir suchen jemanden für dich"}</small></span></button>
      ${faithRooms.length ? `<div class="list-label">🕊️ Glaube</div>${faithRooms.map((channel) => `
        <button class="room faith-room ${room === `f:${channel.id}` ? "is-active" : ""}" data-room="f:${channel.id}" type="button">
          <span class="room-emoji">${channel.emoji}</span><span class="room-name">${escapeHtml(channel.name)}</span>
        </button>`).join("")}` : ""}
      <div class="list-label">Gruppen</div>
      ${channels.map((channel) => `
        <button class="room ${room === `c:${channel.id}` ? "is-active" : ""}" data-room="c:${channel.id}" type="button">
          <span class="room-emoji">${channel.emoji}</span>
          <span class="room-name">${escapeHtml(channel.name)}</span>
          ${othersOnline(channel.id) ? `<small class="room-online" title="${othersOnline(channel.id)} andere gerade online"><i></i>${othersOnline(channel.id)}</small>` : ""}
        </button>`).join("") || '<p class="list-empty">Keine Treffer</p>'}
      <div class="list-label">Direktnachrichten</div>
      ${friends.map((friend) => `
        <button class="room ${room === `d:${friend.code}` ? "is-active" : ""}" data-room="d:${friend.code}" type="button">
          ${avatar(friend.name, friend.code, friend.online ? "is-online" : "")}
          <span class="room-name">${escapeHtml(friend.name)}</span>
          ${unreadFor(friend) ? '<i class="unread-dot" aria-label="Ungelesen"></i>' : ""}
        </button>`).join("") || `<p class="list-empty">Noch keine Freunde. <button class="link-button" data-view-link="friends" type="button">Freunde hinzufügen</button></p>`}`;
    list.scrollTop = listScroll; // stay where the user scrolled to
    list.querySelectorAll("[data-room]").forEach((button) => button.addEventListener("click", () => openRoom(button.dataset.room)));
    list.querySelector("#help-cta").addEventListener("click", () => {
      view = "crisis";
      moveThumb();
      renderView();
    });
    list.querySelector("[data-view-link]")?.addEventListener("click", () => {
      view = "friends";
      moveThumb();
      renderView();
    });
  }

  function renderHeader() {
    const header = container.querySelector("#conversation-header");
    if (!header) return;
    const title = currentTitle();
    header.innerHTML = `
      ${title.friend ? avatar(title.friend.name, title.friend.code, title.friend.online ? "is-online" : "") : `<span class="room-emoji large">${title.emoji}</span>`}
      <div><strong>${escapeHtml(title.name)}</strong><span>${escapeHtml(title.sub)}</span></div>`;
  }

  function renderMessages(force = false) {
    const box = container.querySelector("#messages");
    if (!box) return;
    const rendered = Number(box.dataset.count || 0);
    if (!force && rendered === messages.length && box.dataset.room === room) return;
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    if (socialError) {
      box.innerHTML = `<div class="chat-empty"><p>${escapeHtml(socialError)}</p></div>`;
      return;
    }
    if (!messages.length) {
      const isDm = room.startsWith("d:");
      box.innerHTML = `
        <div class="chat-empty">
          <div class="empty-icon">${isDm ? "👋" : "🌤️"}</div>
          <strong>${isDm ? "Sag Hallo!" : "Noch ist es ruhig hier"}</strong>
          <p>${isDm ? "Eine kleine Nachricht kann jemandem den Tag retten." : "Erzähl, wie es dir heute geht – du bist bestimmt nicht allein damit."}</p>
        </div>`;
    } else {
      const start = force || box.dataset.room !== room || rendered > messages.length ? 0 : rendered;
      if (start === 0) box.innerHTML = "";
      const html = messages.slice(start).map((message, offset) => {
        const index = start + offset;
        const previous = messages[index - 1];
        const grouped = previous && previous.sender_code === message.sender_code && message.created_at - previous.created_at < 300;
        const date = new Date(message.created_at * 1000);
        const newDay = !previous || new Date(previous.created_at * 1000).toDateString() !== date.toDateString();
        return `
          ${newDay ? `<div class="day-divider"><span>${new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(date)}</span></div>` : ""}
          <div class="message ${message.mine ? "is-mine" : ""} ${grouped && !newDay ? "is-grouped" : ""} ${start > 0 ? "is-new" : ""}" data-message="${message.id}">
            ${!message.mine ? (grouped && !newDay ? '<span class="avatar-spacer"></span>' : avatar(message.sender_name, message.sender_code, "small")) : ""}
            <div class="bubble-wrap">
              ${!message.mine && !(grouped && !newDay) && /^[cf]:/.test(room) ? `<span class="sender">${escapeHtml(message.sender_name)}</span>` : ""}
              ${message.has_link && !message.mine ? '<div class="link-warning">⚠️ Enthält einen Link. Öffne ihn nur, wenn du der Person vertraust – gib niemals Passwörter oder persönliche Daten ein.</div>' : ""}
              ${message.media_data ? `<img class="chat-image" src="data:${escapeHtml(message.media_type)};base64,${message.media_data}" alt="Bild von ${escapeHtml(message.sender_name)}" loading="lazy">` : ""}
              ${message.text ? `<div class="bubble">${richText(message.text)}</div>` : ""}
              <div class="message-meta">
                ${prefs.chatTimestamps ? `<time>${formatTime(date)}</time>` : ""}
                <span class="reactions" data-reactions="${message.id}">${reactionChips(message)}</span>
                <span class="message-actions">
                  <button type="button" class="message-action" data-react-open="${message.id}" title="Reagieren" aria-label="Reagieren">＋</button>
                  ${message.mine ? "" : `<button type="button" class="message-action" data-report="${message.id}" data-code="${message.sender_code}" data-name="${escapeHtml(message.sender_name)}" title="Melden oder blockieren" aria-label="Melden oder blockieren">⋯</button>`}
                </span>
              </div>
            </div>
          </div>`;
      }).join("");
      box.insertAdjacentHTML("beforeend", html);
    }
    box.dataset.count = String(messages.length);
    box.dataset.room = room;
    if (force || nearBottom || messages.at(-1)?.mine) box.scrollTop = box.scrollHeight;
  }

  function reactionChips(message) {
    return Object.entries(message.reactions || {}).map(([emoji, count]) =>
      `<button type="button" class="reaction ${message.my_reactions?.includes(emoji) ? "is-mine" : ""}" data-react="${message.id}" data-emoji="${emoji}">${emoji} ${count}</button>`).join("");
  }

  async function react(messageId, emoji) {
    try {
      const { message } = await api("/api/community/social/react", { method: "POST", body: { message_id: Number(messageId), emoji, ...socialProfile() } });
      const index = messages.findIndex((item) => item.id === message.id);
      if (index >= 0) messages[index] = { ...messages[index], reactions: message.reactions, my_reactions: message.my_reactions };
      const slot = container.querySelector(`[data-reactions="${message.id}"]`);
      if (slot) slot.innerHTML = reactionChips(messages[index] || message);
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function reportOrBlock(button) {
    const { dialog, close } = openSheet({
      title: `${button.dataset.name} melden oder blockieren`,
      body: `
        <p class="sheet-text">Danke, dass du hinschaust. Meldungen sind anonym und helfen, die Community sicher zu halten.</p>
        <div class="choice-grid">
          ${[["harassment", "😠 Beleidigung oder Belästigung"], ["dealing", "💊 Verkauf oder Konsum-Werbung"], ["danger", "🆘 Person ist in Gefahr"], ["spam", "📢 Spam oder Werbung"], ["other", "❓ Etwas anderes"]]
            .map(([id, label]) => `<button type="button" class="choice" data-reason="${id}">${label}</button>`).join("")}
        </div>
        <div class="sheet-actions">
          <button class="button button-danger-plain" id="do-block" type="button">Blockieren</button>
          <button class="button button-primary" id="do-report" type="button" disabled>Melden</button>
        </div>
        <p class="muted small">Blockierte Personen können dir nicht mehr schreiben und ihre Nachrichten verschwinden für dich. Bei akuter Gefahr: 112.</p>`,
    });
    let reason = "";
    dialog.querySelectorAll("[data-reason]").forEach((choice) => choice.addEventListener("click", () => {
      reason = choice.dataset.reason;
      dialog.querySelectorAll("[data-reason]").forEach((item) => item.classList.toggle("is-selected", item === choice));
      dialog.querySelector("#do-report").disabled = false;
    }));
    dialog.querySelector("#do-report").addEventListener("click", async () => {
      try {
        await api("/api/community/social/report", { method: "POST", body: { code: button.dataset.code, reason, message_id: Number(button.dataset.report), ...socialProfile() } });
        close();
        showToast("Danke für deine Meldung. Wir kümmern uns darum.");
      } catch (error) {
        showToast(error.message, true);
      }
    });
    dialog.querySelector("#do-block").addEventListener("click", async () => {
      try {
        await api("/api/community/social/block", { method: "POST", body: { action: "block", code: button.dataset.code, ...socialProfile() } });
        close();
        showToast(`${button.dataset.name} ist blockiert.`);
        messages = messages.filter((item) => item.sender_code !== button.dataset.code);
        renderMessages(true);
        sync();
      } catch (error) {
        showToast(error.message, true);
      }
    });
  }

  function bindMessageActions(box) {
    box.addEventListener("click", async (event) => {
      const link = event.target.closest("[data-link]");
      if (link) {
        const url = /^https?:/i.test(link.dataset.link) ? link.dataset.link : `https://${link.dataset.link}`;
        const ok = await confirmSheet({
          title: "Link wirklich öffnen?",
          text: `<strong>${escapeHtml(url)}</strong><br><br>Dieser Link kommt von einem anderen Mitglied. Öffne ihn nur, wenn du der Person vertraust. Gib niemals Passwörter, Bankdaten oder deine Adresse ein.`,
          confirmLabel: "Im Browser öffnen",
          danger: true,
        });
        if (ok) api("/api/app/open-external", { method: "POST", body: { url } }).catch((error) => showToast(error.message, true));
        return;
      }
      const chip = event.target.closest("[data-react]");
      if (chip) return react(chip.dataset.react, chip.dataset.emoji);
      const opener = event.target.closest("[data-react-open]");
      if (opener) {
        box.querySelectorAll(".reaction-picker").forEach((picker) => picker.remove());
        opener.insertAdjacentHTML("afterend", `<span class="reaction-picker">${REACTIONS.map((emoji) => `<button type="button" data-pick="${opener.dataset.reactOpen}" data-emoji="${emoji}">${emoji}</button>`).join("")}</span>`);
        return undefined;
      }
      const pick = event.target.closest("[data-pick]");
      if (pick) {
        pick.parentElement.remove();
        return react(pick.dataset.pick, pick.dataset.emoji);
      }
      const report = event.target.closest("[data-report]");
      if (report) reportOrBlock(report);
      return undefined;
    });
  }

  async function renderChallenges() {
    container.innerHTML = '<div class="card loading-state"><span class="spinner"></span>Lade Challenges …</div>';
    let data;
    try {
      data = await api("/api/community/social/challenges", { method: "POST", body: { action: "list", ...socialProfile() } });
    } catch (error) {
      if (!alive || view !== "challenges") return;
      socialError = error.message;
      container.innerHTML = errorState();
      container.querySelector("#retry-social").addEventListener("click", () => renderChallenges());
      return;
    }
    if (!alive || view !== "challenges") return;
    const ui = { category: "all", query: "", sort: "popular", limit: 24 };
    const card = (challenge, extra = "") => `
      <article class="card challenge ${challenge.joined ? "is-joined" : ""} ${extra}">
        <div class="challenge-head"><span class="challenge-emoji">${challenge.emoji}</span>
          <div><strong>${escapeHtml(challenge.title)}</strong><small>${challenge.days} ${challenge.days === 1 ? "Tag" : "Tage"} · ${challenge.participants} dabei · ${challenge.done_today_total} heute geschafft</small></div></div>
        <p class="muted small">${escapeHtml(challenge.text)}</p>
        ${challenge.joined ? `
          <div class="challenge-dots ${challenge.days > 60 ? "is-long" : ""}">${challenge.days > 60
            ? `<span class="challenge-bar"><i style="--w:${Math.min(100, (challenge.my_days / challenge.days) * 100)}%"></i></span><small>${challenge.my_days} / ${challenge.days}</small>`
            : Array.from({ length: challenge.days }, (_, index) => `<i class="${index < challenge.my_days ? "is-done" : ""}"></i>`).join("")}</div>
          <div class="button-row">
            <button class="button ${challenge.done_today ? "button-secondary" : "button-primary"} small" data-challenge="checkin" data-id="${challenge.id}" type="button" ${challenge.done_today ? "disabled" : ""}>${challenge.done_today ? "✓ Heute geschafft" : "Heute geschafft"}</button>
            <button class="button button-plain small" data-challenge="leave" data-id="${challenge.id}" type="button">Verlassen</button>
          </div>` : `<button class="button button-tinted small" data-challenge="join" data-id="${challenge.id}" type="button">Mitmachen</button>`}
      </article>`;
    const draw = () => {
      const day = Math.floor(Date.now() / 86400000);
      const daily = data.challenges[(day * 37) % data.challenges.length];
      const mine = data.challenges.filter((challenge) => challenge.joined);
      const query = ui.query.trim().toLowerCase();
      let list = data.challenges.filter((challenge) => !challenge.joined
        && (ui.category === "all" || challenge.category === ui.category)
        && (!query || `${challenge.title} ${challenge.text}`.toLowerCase().includes(query)));
      // ties are shuffled once per day so the list feels fresh
      const mix = (text) => [...`${text}${day}`].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 100003, 7);
      list = list.slice().sort(ui.sort === "short" ? (a, b) => a.days - b.days : ui.sort === "long" ? (a, b) => b.days - a.days : (a, b) => b.participants - a.participants || mix(a.id) - mix(b.id));
      const categories = data.categories || [];
      container.innerHTML = `
        <section class="challenge-hero">
          <div><span class="eyebrow">Gemeinsam schaffen</span><h2>Challenges</h2>
            <p>${data.challenges.length} Challenges in ${categories.length} Bereichen. Mach mit, hake jeden Tag ab und sieh, wer heute mit dir durchhält.</p></div>
          <div class="challenge-total"><strong>${data.challenges.reduce((sum, item) => sum + item.participants, 0)}</strong><small>machen mit</small></div>
        </section>
        ${!daily.joined ? `<section class="challenge-daily"><span class="eyebrow">⭐ Challenge des Tages</span>${card(daily, "is-daily")}</section>` : ""}
        ${mine.length ? `<h3 class="challenge-section">Deine Challenges (${mine.length})</h3><div class="challenge-grid">${mine.map((challenge) => card(challenge)).join("")}</div>` : ""}
        <h3 class="challenge-section">Entdecken</h3>
        <div class="challenge-tools">
          <label class="search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="challenge-search" type="search" placeholder="Challenge suchen" value="${escapeHtml(ui.query)}"></label>
          <select id="challenge-sort" aria-label="Sortieren"><option value="popular" ${ui.sort === "popular" ? "selected" : ""}>Empfohlen</option><option value="short" ${ui.sort === "short" ? "selected" : ""}>Kürzeste zuerst</option><option value="long" ${ui.sort === "long" ? "selected" : ""}>Längste zuerst</option></select>
        </div>
        <div class="chip-row challenge-cats">
          <button type="button" class="chip ${ui.category === "all" ? "is-selected" : ""}" data-cat="all">Alle</button>
          ${categories.map((category) => `<button type="button" class="chip ${ui.category === category.id ? "is-selected" : ""}" data-cat="${category.id}">${category.emoji} ${escapeHtml(category.name)}</button>`).join("")}
        </div>
        <div class="challenge-grid">${list.slice(0, ui.limit).map((challenge) => card(challenge)).join("") || '<p class="muted">Keine Challenge gefunden.</p>'}</div>
        ${list.length > ui.limit ? `<div class="button-row centered"><button class="button button-secondary" id="challenge-more" type="button">Mehr anzeigen (${list.length - ui.limit} weitere)</button></div>` : ""}
        <section class="card">
          <div class="card-header"><div><span class="eyebrow">Live</span><h3>Wer gerade durchhält</h3></div></div>
          <div class="challenge-feed">${data.feed.map((item) => `
            <div class="feed-row"><span>${item.emoji}</span><span><strong>${escapeHtml(item.mine ? "Du" : item.name)}</strong> ${item.mine ? "hast" : "hat"} Tag ${item.day} von „${escapeHtml(item.challenge)}“ geschafft</span>
              <time>${new Date(item.at * 1000).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</time></div>`).join("") || '<p class="muted small">Sei die erste Person heute. 🌱</p>'}</div>
        </section>`;
      const search = container.querySelector("#challenge-search");
      search.addEventListener("input", () => {
        ui.query = search.value;
        ui.limit = 24;
        const at = search.selectionStart;
        draw();
        const next = container.querySelector("#challenge-search");
        next.focus();
        next.setSelectionRange(at, at);
      });
      container.querySelector("#challenge-sort").addEventListener("change", (event) => { ui.sort = event.target.value; draw(); });
      container.querySelectorAll("[data-cat]").forEach((button) => button.addEventListener("click", () => { ui.category = button.dataset.cat; ui.limit = 24; draw(); }));
      container.querySelector("#challenge-more")?.addEventListener("click", () => { ui.limit += 48; draw(); });
      container.querySelectorAll("[data-challenge]").forEach((button) => button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const fresh = await api("/api/community/social/challenges", { method: "POST", body: { action: button.dataset.challenge, id: button.dataset.id, ...socialProfile() } });
          data = { ...fresh, categories: fresh.categories || data.categories };
          if (button.dataset.challenge === "checkin") {
            const { confetti } = await import("../flows.js");
            confetti();
            showToast("Abgehakt! Die anderen sehen, dass du dabei bist. 💪");
          } else if (button.dataset.challenge === "join") showToast("Du bist dabei! Viel Kraft. 🌱");
          const scroll = document.querySelector("#main").scrollTop;
          draw();
          document.querySelector("#main").scrollTop = scroll;
        } catch (error) {
          button.disabled = false;
          showToast(error.message, true);
        }
      }));
    };
    draw();
  }

  function renderFriends() {
    const me = social.me;
    const defaultName = /^Gast-[0-9a-f]{6}$/.test(me.name);
    container.innerHTML = `
      <div class="friends-grid">
        <section class="card code-card">
          <span class="eyebrow">Dein Freundescode</span>
          <div class="friend-code" id="my-code">${formatCode(me.code)}</div>
          <p class="muted small">Gib diesen Code an Menschen weiter, denen du vertraust. Sie können dir damit eine Anfrage schicken.</p>
          <div class="button-row">
            <button class="button button-secondary" id="copy-code" type="button">Code kopieren</button>
          </div>
          ${me.helpful || me.unhelpful || me.helper_enabled ? `<p class="helper-score" title="Rückmeldungen aus Krisen-Chats">🤝 Als Vertrauensperson: <b>👍 ${me.helpful || 0}</b> hilfreich · <b>👎 ${me.unhelpful || 0}</b> nicht hilfreich</p>` : ""}
          <p class="muted small">Du erscheinst als <strong>${escapeHtml(me.name)}</strong>.
            ${defaultName ? '<button class="link-button" id="set-name" type="button">Anzeigenamen festlegen</button>' : ""}</p>
        </section>

        <section class="card">
          <span class="eyebrow">Freund hinzufügen</span>
          <h3>Per Code verbinden</h3>
          <form class="add-friend" id="add-friend">
            <input id="friend-code" maxlength="11" placeholder="XXXXX-XXXXX" autocomplete="off" spellcheck="false" aria-label="Freundescode">
            <button class="button button-primary" type="submit">Anfrage senden</button>
          </form>
          <p class="muted small">Direktnachrichten sind erst möglich, wenn beide Seiten zugestimmt haben.</p>
        </section>
      </div>
      <div id="friend-lists"></div>`;

    container.querySelector("#copy-code").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(formatCode(me.code));
        showToast("Code kopiert.");
      } catch {
        showToast("Kopieren nicht möglich – bitte markieren und kopieren.", true);
      }
    });
    container.querySelector("#set-name")?.addEventListener("click", () => goTo("settings"));
    const input = container.querySelector("#friend-code");
    input.addEventListener("input", () => {
      const raw = input.value.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 10);
      input.value = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
    });
    container.querySelector("#add-friend").addEventListener("submit", async (event) => {
      event.preventDefault();
      const code = input.value.replace(/-/g, "");
      if (code.length !== 10) {
        showToast("Ein Freundescode hat 10 Zeichen.", true);
        return;
      }
      const ok = await friendAction("request", code, (status) => status === "accepted" ? "Ihr seid jetzt Freunde! 🎉" : "Anfrage gesendet.");
      if (ok) input.value = "";
    });
    renderFriendLists();
  }

  function renderFriendLists() {
    const lists = container.querySelector("#friend-lists");
    if (!lists || !social) return;
    const signature = JSON.stringify([social.incoming, social.friends, social.outgoing, social.blocked]);
    if (lists.dataset.signature === signature) return;
    lists.dataset.signature = signature;
    const row = (person, actions) => `
      <div class="person-row">
        ${avatar(person.name, person.code, person.online ? "is-online" : "")}
        <div class="person-copy"><strong>${escapeHtml(person.name)}</strong><span>${person.online === undefined ? formatCode(person.code) : person.online ? "Online" : formatCode(person.code)}${person.helpful || person.unhelpful ? ` · 🤝 👍 ${person.helpful || 0} · 👎 ${person.unhelpful || 0}` : ""}</span></div>
        <div class="person-actions">${actions}</div>
      </div>`;
    lists.innerHTML = `
      ${social.incoming.length ? `
        <section class="card list-card">
          <h3>Anfragen <span class="count-badge">${social.incoming.length}</span></h3>
          ${social.incoming.map((person) => row(person, `
            <button class="button button-primary small" data-accept="${person.code}" type="button">Annehmen</button>
            <button class="button button-secondary small" data-decline="${person.code}" type="button">Ablehnen</button>`)).join("")}
        </section>` : ""}
      <section class="card list-card">
        <h3>Freunde <span class="muted">${social.friends.length}</span></h3>
        ${social.friends.map((person) => row(person, `
          <button class="button button-tinted small" data-message="${person.code}" type="button">Nachricht</button>
          <button class="icon-button danger" data-remove="${person.code}" data-name="${escapeHtml(person.name)}" type="button" aria-label="${escapeHtml(person.name)} entfernen" title="Entfernen">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
          </button>`)).join("") || '<p class="muted">Noch keine Freunde. Teile deinen Code oder füge jemanden hinzu.</p>'}
      </section>
      ${social.outgoing.length ? `
        <section class="card list-card">
          <h3>Gesendete Anfragen</h3>
          ${social.outgoing.map((person) => row(person, `<button class="button button-secondary small" data-cancel="${person.code}" type="button">Zurückziehen</button>`)).join("")}
        </section>` : ""}
      ${social.blocked?.length ? `
        <section class="card list-card">
          <h3>Blockiert</h3>
          ${social.blocked.map((person) => row(person, `<button class="button button-secondary small" data-unblock="${person.code}" type="button">Freigeben</button>`)).join("")}
        </section>` : ""}`;
    lists.querySelectorAll("[data-unblock]").forEach((button) => button.addEventListener("click", async () => {
      await api("/api/community/social/block", { method: "POST", body: { action: "unblock", code: button.dataset.unblock, ...socialProfile() } }).catch((error) => showToast(error.message, true));
      showToast("Freigegeben.");
      sync();
    }));

    lists.querySelectorAll("[data-accept]").forEach((button) => button.addEventListener("click", () =>
      friendAction("accept", button.dataset.accept, () => "Anfrage angenommen. Ihr könnt jetzt schreiben.")));
    lists.querySelectorAll("[data-decline]").forEach((button) => button.addEventListener("click", () =>
      friendAction("remove", button.dataset.decline, () => "Anfrage abgelehnt.")));
    lists.querySelectorAll("[data-cancel]").forEach((button) => button.addEventListener("click", () =>
      friendAction("remove", button.dataset.cancel, () => "Anfrage zurückgezogen.")));
    lists.querySelectorAll("[data-message]").forEach((button) => button.addEventListener("click", () => openRoom(`d:${button.dataset.message}`)));
    lists.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", async () => {
      const ok = await confirmSheet({
        title: "Freund entfernen?",
        text: `<strong>${escapeHtml(button.dataset.name)}</strong> wird aus deiner Liste entfernt. Ihr könnt euch danach keine Direktnachrichten mehr schreiben.`,
        confirmLabel: "Entfernen",
        danger: true,
      });
      if (ok) friendAction("remove", button.dataset.remove, () => "Freund entfernt.");
    }));
  }

  async function renderOverview() {
    container.innerHTML = '<div class="card loading-state"><span class="spinner"></span>Lade Community-Statistiken …</div>';
    let result;
    try {
      result = await api("/api/community");
    } catch (error) {
      result = { stats: null, leaderboard: [], error: error.message };
    }
    if (!alive || view !== "overview") return;
    const stats = result.stats;
    const leaderboard = Array.isArray(result.leaderboard) ? result.leaderboard : [];
    const number = (value) => (stats ? new Intl.NumberFormat("de-DE").format(Number(value) || 0) : "—");
    const podium = [leaderboard[1], leaderboard[0], leaderboard[2]];
    container.innerHTML = `
      <section class="community-hero">
        <div class="community-hero-copy">
          <span class="eyebrow">Du bist nicht allein</span>
          <h2>Gemeinsam sind wir stärker.</h2>
          <p>Jeder hier kennt schwere Tage – und jeder hier hat sich entschieden weiterzugehen.</p>
          <div class="button-row">
            <button class="button button-light" data-view-link="chats" type="button">Zu den Chats</button>
            <button class="button button-glass" data-view-link="friends" type="button">Freunde finden</button>
          </div>
        </div>
        <div class="community-stats">
          <div><strong>${number(stats?.total_active_users)}</strong><small>Mitglieder</small></div>
          <div><strong><i class="live-dot"></i>${social ? number(social.online) : "—"}</strong><small>gerade online</small></div>
          <div><strong>${stats ? number(Math.round((Number(stats.total_community_focus_minutes) || 0) / 60)) : "—"}</strong><small>Fokus-Stunden</small></div>
          <div><strong>${number(stats?.total_habits_prevented)}</strong><small>bewusste Entscheidungen</small></div>
        </div>
      </section>

      <div class="split-grid">
        <section class="card">
          <div class="card-header"><div><span class="eyebrow">Inspiration</span><h3>Längste Wege</h3></div></div>
          ${leaderboard.length ? `
            <div class="podium">${podium.map((item, index) => item ? `
              <div class="podium-place place-${Number(item.rank) || index + 1}">
                <span class="podium-medal">${["🥇", "🥈", "🥉"][(Number(item.rank) || 1) - 1] || "🏅"}</span>
                <strong>${Number(item.streak) || 0}</strong><small>Tage</small>
                <div class="podium-block">${Number(item.rank) || ""}</div>
              </div>` : '<div class="podium-place is-empty"></div>').join("")}</div>
            ${leaderboard.slice(3, 10).map((item) => `
              <div class="leader-row"><span class="leader-rank">${Number(item.rank) || "—"}</span><strong>${escapeHtml(item.username || "Fokus-Krieger")}</strong><span>🔥 ${Number(item.streak) || 0} Tage</span></div>`).join("")}`
            : '<div class="empty-visual"><span>🏔️</span><p>Die Rangliste füllt sich gerade.</p></div>'}
          <p class="fine-print">Anonym. Jeder Weg ist anders – vergleiche dich vor allem mit dir von gestern.</p>
        </section>
        <section class="card">
          <div class="card-header"><div><span class="eyebrow">Gemeinsam sicher</span><h3>Unsere Regeln</h3></div></div>
          <div class="rule-grid">
            <div class="rule" style="--tone:var(--pink)"><span>💗</span><strong>Mitgefühl</strong><small>Niemand wird verurteilt. Rückfälle gehören für viele dazu.</small></div>
            <div class="rule" style="--tone:var(--orange)"><span>🚫</span><strong>Kein Konsum-Talk</strong><small>Keine Bezugsquellen, keine Verherrlichung.</small></div>
            <div class="rule" style="--tone:var(--indigo)"><span>🔒</span><strong>Privatsphäre</strong><small>Teile keine Adressen, Nummern oder Passwörter.</small></div>
            <div class="rule" style="--tone:var(--red)"><span>🛟</span><strong>Echte Hilfe</strong><small>Die Community ersetzt keine Profis. Notfall: 112.</small></div>
          </div>
        </section>
      </div>`;
    container.querySelectorAll("[data-view-link]").forEach((button) => button.addEventListener("click", () => {
      view = button.dataset.viewLink;
      moveThumb();
      renderView();
      sync({ reset: true });
    }));
  }

  moveThumb();
  renderView();
  sync({ reset: true });
  schedule();
  window.dispatchEvent(new Event("reso:layout"));
  return () => {
    alive = false;
    clearTimeout(pollTimer);
    crisisCleanup?.();
  };
}
