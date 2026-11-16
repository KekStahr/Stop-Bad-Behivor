import { escapeHtml } from "./api.js";
import { motionLevel, formatMoney, prefs } from "./prefs.js";

const ease = (t) => 1 - Math.pow(1 - t, 3);

export function formatNumber(value, format) {
  if (format === "money") return formatMoney(value);
  if (format === "dec1") return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value);
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Math.round(value));
}

// Animates every [data-count] element from 0 to its target value.
export function animateCounts(root) {
  const nodes = root.querySelectorAll("[data-count]");
  const level = motionLevel();
  nodes.forEach((node) => {
    const target = Number(node.dataset.count) || 0;
    const format = node.dataset.format;
    if (level !== "full" || target === 0) {
      node.textContent = formatNumber(target, format);
      return;
    }
    const start = performance.now();
    const duration = 900;
    const frame = (now) => {
      const t = Math.min(1, (now - start) / duration);
      node.textContent = formatNumber(target * ease(t), format);
      if (t < 1 && node.isConnected) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

export function reveal(root) {
  root.querySelectorAll(".reveal").forEach((node, index) => node.style.setProperty("--i", Math.min(index, 12)));
  animateCounts(root);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-revealed")));
}

// ---- Sheets (modal dialogs) ---------------------------------------------
export function openSheet({ title, body, wide = false, onClose }) {
  const dialog = document.createElement("dialog");
  dialog.className = `sheet${wide ? " sheet-wide" : ""}`;
  dialog.innerHTML = `
    <div class="sheet-body">
      <header class="sheet-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="icon-button" data-close type="button" aria-label="Schließen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div class="sheet-content">${body}</div>
    </div>`;
  document.body.append(dialog);
  const close = () => {
    if (!dialog.open) return;
    dialog.classList.add("is-closing");
    const finish = () => {
      dialog.close();
      dialog.remove();
      onClose?.();
    };
    if (motionLevel() === "off") finish();
    else setTimeout(finish, 180);
  };
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-close]")) close();
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.showModal();
  return { dialog, close };
}

export function confirmSheet({ title, text, confirmLabel = "Bestätigen", danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const { dialog, close } = openSheet({
      title,
      body: `
        <p class="sheet-text">${text}</p>
        <div class="sheet-actions">
          <button class="button button-secondary" data-answer="no" type="button">Abbrechen</button>
          <button class="button ${danger ? "button-danger" : "button-primary"}" data-answer="yes" type="button">${escapeHtml(confirmLabel)}</button>
        </div>`,
      onClose: () => {
        if (!answered) resolve(false);
      },
    });
    dialog.querySelectorAll("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        answered = true;
        resolve(button.dataset.answer === "yes");
        close();
      });
    });
    dialog.querySelector("[data-answer='no']").focus();
  });
}

// ---- Sound ----------------------------------------------------------------
let audioContext;
export function chime(kind = "done") {
  try {
    audioContext ||= new AudioContext();
    const notes = kind === "message" ? [880] : [523.25, 659.25, 783.99];
    const volume = Math.min(1, Math.max(0, Number(prefs.timerVolume) || 0.5)) * 0.25;
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * 0.16;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 1);
    });
  } catch {
    // audio unavailable
  }
}

export function notify(title, body) {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") new Notification(title, { body, silent: true });
    else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") new Notification(title, { body, silent: true });
      });
    }
  } catch {
    // notifications unavailable
  }
}

// ---- SVG charts ------------------------------------------------------------
export function ring({ size = 120, stroke = 12, progress = 0, color = "var(--accent)", track = "var(--fill)", className = "" }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  return `
    <svg class="ring ${className}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
      <circle class="ring-value" cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}"
        stroke-width="${stroke}" stroke-linecap="round" transform="rotate(-90 ${size / 2} ${size / 2})"
        stroke-dasharray="${circumference}" style="--dash:${circumference};--offset:${circumference * (1 - clamped)}"
        stroke-dashoffset="${circumference * (1 - clamped)}"/>
    </svg>`;
}

export function setRing(svg, progress) {
  const value = svg?.querySelector(".ring-value");
  if (!value) return;
  const dash = Number(value.getAttribute("stroke-dasharray"));
  const offset = dash * (1 - Math.min(1, Math.max(0, progress)));
  value.style.setProperty("--offset", offset);
  value.setAttribute("stroke-dashoffset", offset);
}

// Line/area chart. series: [{ points: [{x, y}], color, dashed, area }]
export function lineChart({ series, width = 640, height = 220, xLabels = [], yFormat = (v) => v, id = "chart" }) {
  const pad = { top: 16, right: 16, bottom: 28, left: 56 };
  const all = series.flatMap((item) => item.points);
  if (!all.length) return '<p class="empty">Noch keine Daten.</p>';
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x), minX + 1);
  const maxY = Math.max(1, ...all.map((p) => p.y)) * 1.1;
  const sx = (x) => pad.left + ((x - minX) / (maxX - minX)) * (width - pad.left - pad.right);
  const sy = (y) => height - pad.bottom - (y / maxY) * (height - pad.top - pad.bottom);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const y = sy(maxY * fraction);
    return `<line x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}" class="grid"/>
      <text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" class="axis">${escapeHtml(yFormat(maxY * fraction))}</text>`;
  }).join("");
  const labels = xLabels.map(({ x, label }) => `<text x="${sx(x)}" y="${height - 8}" text-anchor="middle" class="axis">${escapeHtml(label)}</text>`).join("");
  const paths = series.map((item, index) => {
    if (!item.points.length) return "";
    const d = item.points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
    const area = item.area
      ? `<path d="${d} L${sx(item.points.at(-1).x).toFixed(1)},${sy(0)} L${sx(item.points[0].x).toFixed(1)},${sy(0)} Z" fill="url(#${id}-g${index})" class="area"/>`
      : "";
    return `
      <defs><linearGradient id="${id}-g${index}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${item.color}" stop-opacity=".28"/><stop offset="1" stop-color="${item.color}" stop-opacity="0"/>
      </linearGradient></defs>
      ${area}
      <path d="${d}" fill="none" stroke="${item.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
        class="line ${item.dashed ? "is-dashed" : "is-drawn"}" pathLength="1"/>`;
  }).join("");
  return `
    <div class="chart" data-chart="${id}">
      <svg viewBox="0 0 ${width} ${height}" role="img">${grid}${labels}${paths}
        <line class="crosshair" x1="0" x2="0" y1="${pad.top}" y2="${height - pad.bottom}" hidden/>
        <circle class="crosshair-dot" r="5" hidden/>
      </svg>
      <div class="chart-tip" hidden></div>
    </div>`;
}

// Adds a hover tooltip to a chart created by lineChart.
export function attachLineHover(root, id, points, { width = 640, height = 220, label }) {
  const chart = root.querySelector(`[data-chart="${id}"]`);
  if (!chart || !points.length) return;
  const svg = chart.querySelector("svg");
  const tip = chart.querySelector(".chart-tip");
  const line = chart.querySelector(".crosshair");
  const dot = chart.querySelector(".crosshair-dot");
  const pad = { top: 16, right: 16, bottom: 28, left: 56 };
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x), minX + 1);
  const maxY = Math.max(1, ...points.map((p) => p.y)) * 1.1;
  svg.addEventListener("mousemove", (event) => {
    const box = svg.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * width;
    const value = minX + ((x - pad.left) / (width - pad.left - pad.right)) * (maxX - minX);
    const nearest = points.reduce((best, p) => (Math.abs(p.x - value) < Math.abs(best.x - value) ? p : best), points[0]);
    const px = pad.left + ((nearest.x - minX) / (maxX - minX)) * (width - pad.left - pad.right);
    const py = height - pad.bottom - (nearest.y / maxY) * (height - pad.top - pad.bottom);
    line.setAttribute("x1", px);
    line.setAttribute("x2", px);
    dot.setAttribute("cx", px);
    dot.setAttribute("cy", py);
    // SVG elements have no .hidden property, so toggle the attribute
    [line, dot, tip].forEach((node) => node.removeAttribute("hidden"));
    tip.innerHTML = label(nearest);
    tip.style.left = `${(px / width) * 100}%`;
    tip.style.top = `${(py / height) * 100}%`;
  });
  svg.addEventListener("mouseleave", () => {
    [line, dot, tip].forEach((node) => node.setAttribute("hidden", ""));
  });
}

export function barChart(items, { format = (v) => v, color = "var(--accent)", highlightLast = true } = {}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return `
    <div class="bars">
      ${items.map((item, index) => `
        <div class="bar" title="${escapeHtml(item.title || `${item.label}: ${format(item.value)}`)}">
          <span class="bar-value">${item.value ? escapeHtml(format(item.value)) : ""}</span>
          <div class="bar-track">
            <span class="bar-fill${highlightLast && index === items.length - 1 ? " is-today" : ""}"
              style="--h:${Math.max(item.value ? 4 : 0, (item.value / max) * 100)}%;--i:${index};background:${color}"></span>
          </div>
          <small>${escapeHtml(item.label)}</small>
        </div>`).join("")}
    </div>`;
}

export function donut(segments, { size = 160, stroke = 22 } = {}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (!total) return '<p class="empty">Noch keine Daten.</p>';
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = segments.map((segment, index) => {
    const length = (segment.value / total) * circumference;
    const arc = `<circle class="donut-arc" cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${segment.color}"
      stroke-width="${stroke}" stroke-dasharray="${Math.max(0, length - 2)} ${circumference}" stroke-dashoffset="${-offset}"
      transform="rotate(-90 ${size / 2} ${size / 2})" style="--i:${index}"/>`;
    offset += length;
    return arc;
  }).join("");
  return `<svg class="donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${arcs}
    <text x="50%" y="48%" text-anchor="middle" class="donut-total">${total}</text>
    <text x="50%" y="62%" text-anchor="middle" class="donut-label">gesamt</text></svg>`;
}

export const PALETTE = ["var(--accent)", "var(--teal)", "var(--orange)", "var(--pink)", "var(--green)", "var(--indigo)"];

export const motionAllowed = () => motionLevel() === "full";
