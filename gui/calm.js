import { openSheet, motionAllowed } from "./ui.js";

// A calm distraction: pop slowly rising bubbles. Gives the hands and eyes a job for a few minutes.
export function openBubbles() {
  const { dialog } = openSheet({
    title: "Kurz ablenken",
    wide: true,
    onClose: () => { running = false; },
    body: `
      <p class="sheet-text">Lass die Blasen platzen. Atme dabei langsam aus. Es gibt kein Ziel und keinen Zeitdruck.</p>
      <div class="bubble-stage"><canvas id="bubble-canvas"></canvas><span class="bubble-count" id="bubble-count">0</span></div>`,
  });
  const canvas = dialog.querySelector("#bubble-canvas");
  const counter = dialog.querySelector("#bubble-count");
  const context = canvas.getContext("2d");
  const colors = ["#0A84FF", "#30D158", "#40C8E0", "#BF5AF2", "#FF9F0A", "#FF375F"];
  let running = true;
  let popped = 0;
  let width = 0;
  let height = 0;
  const bubbles = [];
  const sparks = [];

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  };
  const spawn = () => bubbles.push({
    x: 30 + Math.random() * Math.max(1, width - 60),
    y: height + 40,
    r: 16 + Math.random() * 26,
    speed: 0.35 + Math.random() * 0.7,
    drift: Math.random() * Math.PI * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
  });

  canvas.addEventListener("pointerdown", (event) => {
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const index = bubbles.findIndex((bubble) => Math.hypot(bubble.x - x, bubble.y - y) <= bubble.r + 6);
    if (index === -1) return;
    const [bubble] = bubbles.splice(index, 1);
    popped += 1;
    counter.textContent = String(popped);
    for (let spark = 0; spark < 10; spark += 1) {
      const angle = (spark / 10) * Math.PI * 2;
      sparks.push({ x: bubble.x, y: bubble.y, vx: Math.cos(angle) * 2.4, vy: Math.sin(angle) * 2.4, life: 1, color: bubble.color });
    }
  });

  let last = 0;
  const frame = (time) => {
    if (!running || !dialog.isConnected) return;
    if (!width) resize();
    if (time - last > 700 && bubbles.length < 14) {
      spawn();
      last = time;
    }
    context.clearRect(0, 0, width, height);
    for (let index = bubbles.length - 1; index >= 0; index -= 1) {
      const bubble = bubbles[index];
      bubble.y -= motionAllowed() ? bubble.speed : bubble.speed * 0.5;
      bubble.drift += 0.02;
      const x = bubble.x + Math.sin(bubble.drift) * 8;
      if (bubble.y < -bubble.r) {
        bubbles.splice(index, 1);
        continue;
      }
      bubble.x = Math.min(width - bubble.r, Math.max(bubble.r, bubble.x));
      const gradient = context.createRadialGradient(x - bubble.r / 3, bubble.y - bubble.r / 3, 2, x, bubble.y, bubble.r);
      gradient.addColorStop(0, "rgba(255,255,255,0.85)");
      gradient.addColorStop(0.35, `${bubble.color}88`);
      gradient.addColorStop(1, `${bubble.color}22`);
      context.beginPath();
      context.arc(x, bubble.y, bubble.r, 0, Math.PI * 2);
      context.fillStyle = gradient;
      context.fill();
      context.strokeStyle = `${bubble.color}aa`;
      context.lineWidth = 1.5;
      context.stroke();
    }
    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      const spark = sparks[index];
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.life -= 0.04;
      if (spark.life <= 0) {
        sparks.splice(index, 1);
        continue;
      }
      context.globalAlpha = spark.life;
      context.fillStyle = spark.color;
      context.beginPath();
      context.arc(spark.x, spark.y, 3, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
