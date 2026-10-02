const canvas = document.getElementById('physicsCanvas');
const ctx = canvas.getContext('2d');

let mode = 'cannon'; // 'cannon' | 'pendulum'
let g = 9.8;
let angleDeg = 45;
let speed = 30;

// Cannon state
let projectiles = [];
let traces = [];

// Pendulum state
let pendulum = {
  originX: 300,
  originY: 50,
  length: 180,
  angle: Math.PI / 4,
  angleVel: 0,
  angleAcc: 0,
  damping: 0.998,
  dragging: false
};

// UI Elements
const rngAngle = document.getElementById('rngAngle');
const rngSpeed = document.getElementById('rngSpeed');
const lblAngle = document.getElementById('lblAngle');
const lblSpeed = document.getElementById('lblSpeed');
const btnFire = document.getElementById('btnFire');
const btnClearTraces = document.getElementById('btnClearTraces');
const valMaxH = document.getElementById('valMaxH');
const valDist = document.getElementById('valDist');
const valTime = document.getElementById('valTime');
const barEk = document.getElementById('barEk');
const barEp = document.getElementById('barEp');

rngAngle.addEventListener('input', (e) => {
  angleDeg = parseFloat(e.target.value);
  lblAngle.textContent = `${angleDeg}°`;
});

rngSpeed.addEventListener('input', (e) => {
  speed = parseFloat(e.target.value);
  lblSpeed.textContent = `${speed} m/s`;
});

document.querySelectorAll('.planet-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.planet-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    g = parseFloat(btn.dataset.g);
  });
});

btnFire.addEventListener('click', () => {
  const rad = (angleDeg * Math.PI) / 180;
  const vx = speed * Math.cos(rad);
  const vy = -speed * Math.sin(rad); // up is negative
  projectiles.push({
    x: 40,
    y: 300,
    vx: vx * 2.5, // pixel scale
    vy: vy * 2.5,
    pts: [{ x: 40, y: 300 }],
    maxH: 0,
    startTime: Date.now()
  });

  // Calculate theory
  const tFlight = (2 * speed * Math.sin(rad)) / g;
  const hMax = (Math.pow(speed * Math.sin(rad), 2)) / (2 * g);
  const dist = (Math.pow(speed, 2) * Math.sin(2 * rad)) / g;
  valMaxH.textContent = `${hMax.toFixed(1)} m`;
  valDist.textContent = `${dist.toFixed(1)} m`;
  valTime.textContent = `${tFlight.toFixed(1)} s`;
});

btnClearTraces.addEventListener('click', () => {
  traces = [];
  projectiles = [];
});

// Pendulum drag
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'pendulum') return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const bx = pendulum.originX + pendulum.length * Math.sin(pendulum.angle);
  const by = pendulum.originY + pendulum.length * Math.cos(pendulum.angle);
  const d = Math.hypot(mx - bx, my - by);
  if (d < 30) {
    pendulum.dragging = true;
  }
});

window.addEventListener('pointermove', (e) => {
  if (mode !== 'pendulum' || !pendulum.dragging) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const dx = mx - pendulum.originX;
  const dy = my - pendulum.originY;
  pendulum.angle = Math.atan2(dx, dy);
  pendulum.angleVel = 0;
});

window.addEventListener('pointerup', () => {
  if (pendulum.dragging) pendulum.dragging = false;
});

// Loop
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (mode === 'cannon') {
    // Draw ground
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 310); ctx.lineTo(canvas.width, 310); ctx.stroke();

    // Draw cannon
    ctx.save();
    ctx.translate(40, 300);
    const rad = (-angleDeg * Math.PI) / 180;
    ctx.rotate(rad);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, -6, 28, 12);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(40, 300, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#6b7280';
    ctx.fill();

    // Draw old traces
    traces.forEach(t => {
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      t.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });

    // Update active projectiles
    projectiles.forEach((p, idx) => {
      p.x += p.vx * dt;
      p.vy += (g * 10) * dt;
      p.y += p.vy * dt;
      p.pts.push({ x: p.x, y: p.y });

      // Trace
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.beginPath();
      p.pts.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Ball
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Velocity vector
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 0.15, p.y + p.vy * 0.15);
      ctx.stroke();

      if (p.y >= 305) {
        traces.push(p.pts);
        projectiles.splice(idx, 1);
      }
    });
  } else {
    // Pendulum physics
    if (!pendulum.dragging) {
      pendulum.angleAcc = (-1 * (g * 4) / pendulum.length) * Math.sin(pendulum.angle);
      pendulum.angleVel += pendulum.angleAcc;
      pendulum.angleVel *= pendulum.damping;
      pendulum.angle += pendulum.angleVel;
    }

    const bx = pendulum.originX + pendulum.length * Math.sin(pendulum.angle);
    const by = pendulum.originY + pendulum.length * Math.cos(pendulum.angle);

    // Rod
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pendulum.originX, pendulum.originY);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // Bob
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(bx, by, 16, 0, Math.PI * 2);
    ctx.fill();

    // Energy calculation
    const h = pendulum.length * (1 - Math.cos(pendulum.angle));
    const Ep = Math.max(0, g * h);
    const v = pendulum.length * pendulum.angleVel;
    const Ek = 0.5 * Math.pow(v, 2);
    const Et = Ek + Ep;

    if (Et > 0) {
      const pEk = (Ek / Et) * 100;
      const pEp = (Ep / Et) * 100;
      barEk.style.width = `${pEk}%`;
      barEp.style.width = `${pEp}%`;
    }
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Tabs
const tabCannon = document.getElementById('tabCannon');
const tabPendulum = document.getElementById('tabPendulum');
const ctrlCannon = document.getElementById('ctrlCannon');
const ctrlPendulum = document.getElementById('ctrlPendulum');

tabCannon.addEventListener('click', () => {
  mode = 'cannon';
  tabCannon.classList.add('active');
  tabPendulum.classList.remove('active');
  ctrlCannon.classList.remove('hidden');
  ctrlPendulum.classList.add('hidden');
});

tabPendulum.addEventListener('click', () => {
  mode = 'pendulum';
  tabPendulum.classList.add('active');
  tabCannon.classList.remove('active');
  ctrlPendulum.classList.remove('hidden');
  ctrlCannon.classList.add('hidden');
});
