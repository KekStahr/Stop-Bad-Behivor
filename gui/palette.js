import { escapeHtml } from "./api.js";
import { openSheet } from "./ui.js";

// Ctrl/Cmd + K: reach every page and action by typing.
export function openPalette(commands) {
  const { dialog, close } = openSheet({
    title: "Was möchtest du tun?",
    body: `
      <label class="search-field palette-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="palette-input" type="search" placeholder="Suchen … z. B. „Atem“, „Check-in“, „Freunde“" autocomplete="off">
      </label>
      <div class="palette-list" id="palette-list" role="listbox"></div>
      <p class="composer-hint">↑ ↓ wählen · Enter ausführen · Esc schließen</p>`,
  });
  dialog.classList.add("palette");
  const input = dialog.querySelector("#palette-input");
  const list = dialog.querySelector("#palette-list");
  let active = 0;
  let visible = commands;

  const render = () => {
    const query = input.value.trim().toLowerCase();
    visible = commands.filter((command) => `${command.label} ${command.keywords || ""}`.toLowerCase().includes(query));
    active = Math.min(active, Math.max(0, visible.length - 1));
    list.innerHTML = visible.map((command, index) => `
      <button type="button" class="palette-item ${index === active ? "is-active" : ""}" data-index="${index}" role="option" aria-selected="${index === active}">
        <span class="palette-icon">${command.icon}</span>
        <span>${escapeHtml(command.label)}</span>
        ${command.hint ? `<kbd>${escapeHtml(command.hint)}</kbd>` : ""}
      </button>`).join("") || '<p class="empty">Nichts gefunden.</p>';
  };
  const run = (command) => {
    if (!command) return;
    close();
    setTimeout(command.run, 120);
  };
  input.addEventListener("input", () => { active = 0; render(); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") active = Math.min(visible.length - 1, active + 1);
    else if (event.key === "ArrowUp") active = Math.max(0, active - 1);
    else if (event.key === "Enter") return run(visible[active]);
    else return undefined;
    event.preventDefault();
    render();
    list.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
    return undefined;
  });
  list.addEventListener("click", (event) => {
    const item = event.target.closest("[data-index]");
    if (item) run(visible[Number(item.dataset.index)]);
  });
  render();
  input.focus();
}
