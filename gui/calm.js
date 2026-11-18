import { openSheet } from "./ui.js";

// "Ablenken": an endless runner. Jump over obstacles, collect sparks and power-ups – it gets faster
// the longer you last. Short, absorbing rounds give the mind something else to do during a craving.
// Performance: delta-time physics, sprites pre-rendered once, nothing runs while hidden or closed.

const BUFFS = {
  shield: { icon: "🛡️", label: "Schild", color: "#40C8E0", seconds: 0 }, // lasts until the next hit
  double: { icon: "🪶", label: "Doppelsprung", color: "#BF5AF2", seconds: 10 },
  slow: { icon: "🐢", label: "Zeitlupe", color: "#30D158", seconds: 6 },
  magnet: { icon: "🧲", label: "Magnet", color: "#FF375F", seconds: 9 },
  double_points: { icon: "✨", label: "Punkte ×2", color: "#FFD60A", seconds: 10 },
};
const CALM = [
  "Verlangen kommt in Wellen – und jede Welle geht vorbei.",
  "Gut gemacht: ein paar Minuten gewonnen, ohne nachzugeben.",
  "Atme einmal tief aus. Du hast die Kontrolle.",
  "Jede Runde ist ein Moment, in dem du stärker warst.",
];
const BEST_KEY = "life:runnerBest";
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = (value) => { try { localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage unavailable */ } };

// draws an emoji once into a small canvas – drawing text every frame is slow
function sprite(emoji, size) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(2, devicePixelRatio || 1);
  canvas.width = canvas.height = Math.ceil(size * scale * 1.3);
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(emoji, size * 0.65, size * 0.7);
  return { canvas, size: size * 1.3 };
}

export function openRunner() {
  let alive = true;
  const { dialog } = openSheet({
    title: "Kurz ablenken",
    wide: true,
    onClose: () => { alive = false; observer.disconnect(); },
    body: `
      <p class="sheet-text">Spring über die Hindernisse – <kbd>Leertaste</kbd>, <kbd>↑</kbd> oder Klick. Sammle Funken ✦ und Power-ups. Es wird immer schneller.</p>
      <div class="runner-stage" id="runner-stage" tabindex="0" aria-label="Spielfeld – Leertaste zum Springen">
        <canvas id="runner-canvas"></canvas>
        <div class="runner-hud"><b id="runner-score">0</b><small>Best <span id="runner-best">${readBest()}</span></small></div>
        <div class="runner-buffs" id="runner-buffs"></div>
        <div class="runner-overlay" id="runner-overlay">
          <strong>Bereit?</strong>
          <p>Leertaste oder Klick zum Starten</p>
          <div class="runner-legend">${Object.values(BUFFS).map((buff) => `<span style="--c:${buff.color}">${buff.icon} ${buff.label}</span>`).join("")}</div>
        </div>
      </div>`,
  });
  const stage = dialog.querySelector("#runner-stage");
  const canvas = dialog.querySelector("#runner-canvas");
  const overlay = dialog.querySelector("#runner-overlay");
  const scoreNode = dialog.querySelector("#runner-score");
  const buffNode = dialog.querySelector("#runner-buffs");
  const context = canvas.getContext("2d");
  const dark = matchMedia("(prefers-color-scheme: dark)").matches || document.documentElement.dataset.theme === "dark";

  const sprites = {
    rock: sprite("🪨", 34), cactus: sprite("🌵", 40), crate: sprite("📦", 32), bird: sprite("🦅", 34), spark: sprite("✨", 22),
    ...Object.fromEntries(Object.entries(BUFFS).map(([id, buff]) => [id, sprite(buff.icon, 26)])),
  };

  let width = 0;
  let height = 0;
  let ground = 0;
  const resize = () => {
    const scale = Math.min(2, devicePixelRatio || 1); // cap: 3× screens would quadruple the pixels for no visible gain
    width = stage.clientWidth;
    height = stage.clientHeight;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    ground = height - 56;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();

  // ---- state ----------------------------------------------------------------------------------
  let state = "ready"; // ready | run | over
  let player;
  let things;
  let particles;
  let speed;
  let distance;
  let score;
  let nextSpawn;
  let buffs;
  let time;
  let shake;
  const reset = () => {
    player = { x: 90, y: ground, vy: 0, jumps: 0, squash: 0 };
    things = [];
    particles = [];
    speed = 330; // px/s
    distance = 0;
    score = 0;
    nextSpawn = 1.2;
    buffs = {};
    time = 0;
    shake = 0;
  };
  reset();

  const GRAVITY = 2300;
  const JUMP = 820;
  const active = (id) => (id === "shield" ? buffs.shield : (buffs[id] || 0) > time);

  function jump() {
    if (state !== "run") return start();
    const maxJumps = active("double") ? 2 : 1;
    if (player.jumps >= maxJumps) return undefined;
    player.vy = -JUMP * (player.jumps ? 0.85 : 1);
    player.jumps += 1;
    burst(player.x, player.y, "#ffffff", 6);
    return undefined;
  }
  function start() {
    if (state === "run") return;
    reset();
    state = "run";
    overlay.hidden = true;
    stage.focus();
  }
  function end() {
    state = "over";
    const final = Math.floor(score);
    const best = Math.max(readBest(), final);
    const record = final > readBest() && final > 0;
    saveBest(best);
    dialog.querySelector("#runner-best").textContent = String(best);
    overlay.hidden = false;
    overlay.innerHTML = `<strong>${record ? "🏆 Neuer Rekord!" : "Runde vorbei"}</strong><b class="runner-final">${final}</b><p>${CALM[Math.floor(Math.random() * CALM.length)]}</p><p class="muted small">Leertaste oder Klick für die nächste Runde</p>`;
  }
  function burst(x, y, color, count = 12) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const power = 80 + Math.random() * 220;
      particles.push({ x, y, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power - 80, life: 0.6 + Math.random() * 0.4, color });
    }
  }

  // obstacles and pickups; harder patterns unlock with speed
  function spawn() {
    const level = (speed - 330) / 60;
    const roll = Math.random();
    if (roll < 0.14) {
      const ids = Object.keys(BUFFS);
      things.push({ kind: "buff", id: ids[Math.floor(Math.random() * ids.length)], x: width + 30, y: ground - 90 - Math.random() * 70, r: 16 });
    } else if (roll < 0.36) {
      const y = ground - 40 - Math.random() * 110;
      for (let i = 0; i < 4; i += 1) things.push({ kind: "spark", x: width + 30 + i * 34, y: y - Math.sin(i / 1.2) * 20, r: 12 });
    } else if (level > 2 && roll < 0.52) {
      things.push({ kind: "bird", x: width + 30, y: ground - 70 - Math.random() * 50, w: 34, h: 24, wobble: Math.random() * 6 });
    } else {
      const pick = ["rock", "cactus", "crate"][Math.floor(Math.random() * 3)];
      const size = { rock: [34, 28], cactus: [26, 42], crate: [30, 30] }[pick];
      things.push({ kind: "block", sprite: pick, x: width + 30, y: ground, w: size[0], h: size[1] });
      if (level > 4 && Math.random() < 0.35) things.push({ kind: "block", sprite: pick, x: width + 30 + size[0] + 4, y: ground, w: size[0], h: size[1] });
    }
    nextSpawn = Math.max(0.55, 1.35 - level * 0.07) + Math.random() * 0.6;
  }

  function collect(thing) {
    if (thing.kind === "spark") {
      score += active("double_points") ? 20 : 10;
      burst(thing.x, thing.y, "#FFD60A", 5);
    } else {
      const buff = BUFFS[thing.id];
      if (thing.id === "shield") buffs.shield = true;
      else buffs[thing.id] = time + buff.seconds;
      burst(thing.x, thing.y, buff.color, 18);
    }
  }

  // ---- loop -----------------------------------------------------------------------------------
  let last = performance.now();
  let buffHtml = "";
  function step(now) {
    if (!alive || !dialog.isConnected) return;
    requestAnimationFrame(step);
    const raw = Math.min(0.05, (now - last) / 1000); // long pauses (tab hidden) don't teleport the player
    last = now;
    if (document.hidden) return;
    const dt = state === "run" && active("slow") ? raw * 0.55 : raw;

    if (state === "run") {
      time += raw;
      speed += dt * 9; // steadily faster
      distance += speed * dt;
      score += dt * 10 * (active("double_points") ? 2 : 1);
      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.y >= ground) {
        if (player.vy > 400) player.squash = 1;
        player.y = ground;
        player.vy = 0;
        player.jumps = 0;
      }
      player.squash = Math.max(0, player.squash - dt * 6);
      nextSpawn -= dt;
      if (nextSpawn <= 0) spawn();
      for (let i = things.length - 1; i >= 0; i -= 1) {
        const thing = things[i];
        thing.x -= speed * dt * (thing.kind === "bird" ? 1.15 : 1);
        if (thing.kind === "bird") thing.wobble += dt * 6;
        if ((thing.kind === "spark" || thing.kind === "buff") && active("magnet")) {
          const dx = player.x - thing.x;
          const dy = player.y - 24 - thing.y;
          if (Math.hypot(dx, dy) < 220) { thing.x += dx * dt * 6; thing.y += dy * dt * 6; }
        }
        if (thing.x < -60) { things.splice(i, 1); continue; }
        // hit boxes are a bit smaller than the pictures – fair, not frustrating
        const px = player.x - 14;
        const py = player.y - 40;
        if (thing.kind === "block" || thing.kind === "bird") {
          const ty = thing.kind === "bird" ? thing.y + Math.sin(thing.wobble) * 8 - thing.h / 2 : thing.y - thing.h;
          if (px < thing.x + thing.w - 6 && px + 28 > thing.x + 6 && py < ty + thing.h - 4 && py + 40 > ty + 4) {
            things.splice(i, 1);
            if (buffs.shield) { buffs.shield = false; burst(thing.x, ty, "#40C8E0", 24); shake = 0.25; continue; }
            burst(player.x, player.y - 20, "#FF375F", 30);
            shake = 0.4;
            end();
          }
        } else if (Math.hypot(player.x - thing.x, player.y - 20 - thing.y) < thing.r + 22) {
          things.splice(i, 1);
          collect(thing);
        }
      }
      scoreNode.textContent = String(Math.floor(score));
      const html = Object.entries(BUFFS).filter(([id]) => active(id)).map(([id, buff]) => `<span style="--c:${buff.color}">${buff.icon}${id === "shield" ? "" : ` ${Math.ceil(buffs[id] - time)}s`}</span>`).join("");
      if (html !== buffHtml) { buffHtml = html; buffNode.innerHTML = html; }
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.vy += 600 * raw;
      particle.x += particle.vx * raw;
      particle.y += particle.vy * raw;
      particle.life -= raw;
      if (particle.life <= 0) particles.splice(i, 1);
    }
    shake = Math.max(0, shake - raw);
    draw();
  }

  function draw() {
    const night = Math.min(1, distance / 40000); // the sky slowly turns to dusk
    context.save();
    if (shake > 0) context.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 10 * shake);
    context.fillStyle = dark ? `rgb(${18 - night * 8},${22 - night * 8},${40 + night * 10})` : `rgb(${190 - night * 110},${225 - night * 120},${255 - night * 90})`;
    context.fillRect(-10, -10, width + 20, height + 20);
    // parallax hills: two sine layers, cheap to draw
    for (const [factor, color, amp, base] of [[0.15, dark ? "#1f2a44" : "#9fd3c7", 26, 90], [0.4, dark ? "#24364f" : "#6fbf9f", 18, 64]]) {
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(0, height);
      for (let x = 0; x <= width + 20; x += 20) context.lineTo(x, ground - base + Math.sin((x + distance * factor) / 90) * amp);
      context.lineTo(width, height);
      context.fill();
    }
    context.fillStyle = dark ? "#2d3b2f" : "#7a5c3e";
    context.fillRect(0, ground, width, height - ground);
    context.fillStyle = dark ? "#3c8f5a" : "#5cc06a";
    context.fillRect(0, ground, width, 6);
    context.fillStyle = dark ? "#26332a" : "#6b4f34";
    for (let x = -(distance % 48); x < width; x += 48) context.fillRect(x, ground + 18, 22, 4);

    for (const thing of things) {
      if (thing.kind === "block") context.drawImage(sprites[thing.sprite].canvas, thing.x - 4, thing.y - thing.h - 8, thing.w + 10, thing.h + 12);
      else if (thing.kind === "bird") context.drawImage(sprites.bird.canvas, thing.x - 4, thing.y + Math.sin(thing.wobble) * 8 - 22, 42, 42);
      else if (thing.kind === "spark") context.drawImage(sprites.spark.canvas, thing.x - 14, thing.y - 14, 28, 28);
      else {
        const bob = Math.sin(time * 5 + thing.x / 30) * 4;
        context.fillStyle = `${BUFFS[thing.id].color}44`;
        context.beginPath();
        context.arc(thing.x, thing.y + bob, 22, 0, Math.PI * 2);
        context.fill();
        context.drawImage(sprites[thing.id].canvas, thing.x - 17, thing.y + bob - 17, 34, 34);
      }
    }
    // the runner: a little glowing figure that squashes when landing
    const squash = 1 + player.squash * 0.25;
    const stretch = player.vy < 0 ? 1.1 : 1;
    context.save();
    context.translate(player.x, player.y);
    context.scale(squash / stretch, stretch / squash);
    if (buffs.shield) {
      context.strokeStyle = "rgba(64,200,224,0.8)";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, -22, 30, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = active("slow") ? "#30D158" : active("double_points") ? "#FFD60A" : "#0A84FF";
    context.beginPath();
    context.roundRect(-14, -40, 28, 40, 12);
    context.fill();
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(6, -28, 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#111";
    context.beginPath();
    context.arc(7.5, -28, 2.4, 0, Math.PI * 2);
    context.fill();
    // legs run with the distance
    if (state === "run" && player.y >= ground) {
      const phase = Math.sin(distance / 14);
      context.fillStyle = "#0a5fc2";
      context.fillRect(-9 + phase * 4, -4, 7, 6);
      context.fillRect(2 - phase * 4, -4, 7, 6);
    }
    context.restore();
    for (const particle of particles) {
      context.globalAlpha = Math.max(0, particle.life);
      context.fillStyle = particle.color;
      context.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    }
    context.globalAlpha = 1;
    context.restore();
  }

  stage.addEventListener("pointerdown", (event) => { event.preventDefault(); jump(); });
  stage.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "ArrowUp" || event.key === "w") { event.preventDefault(); jump(); }
  });
  stage.focus();
  requestAnimationFrame((now) => { last = now; step(now); });
}

// old name, still used by the help sheet and the intervention
export const openBubbles = openRunner;
