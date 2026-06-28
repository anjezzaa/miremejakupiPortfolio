/* ─── CURSOR + PENCIL TRAIL ──────────────────────────── */
const crosshair = document.getElementById('cursor-crosshair');
const dot       = document.getElementById('cursor-dot');
const canvas    = document.getElementById('trail-canvas');
const ctx       = canvas.getContext('2d');

let mx = -200, my = -200;

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
});

// Trail points — each is {x, y, age}
const trail = [];
const MAX_TRAIL = 28;

function animateCursor() {
  crosshair.style.left = mx + 'px';
  crosshair.style.top  = my + 'px';
  dot.style.left = mx + 'px';
  dot.style.top  = my + 'px';

  if (trail.length === 0 ||
      Math.hypot(mx - trail[trail.length-1].x, my - trail[trail.length-1].y) > 3) {
    trail.push({ x: mx, y: my, age: 0 });
  }

  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].age++;
    if (trail[i].age > MAX_TRAIL) trail.splice(i, 1);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 1; i < trail.length; i++) {
    const t   = trail[i];
    const t0  = trail[i - 1];
    const progress = 1 - t.age / MAX_TRAIL;
    const alpha = progress * 0.55;

    // Every other segment — dashed pencil feel
    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = `rgba(22, 53, 42, ${alpha})`;
      ctx.lineWidth = progress * 1.2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Tiny cross marks every 5th point — drafting ticks
    if (i % 5 === 0 && progress > 0.3) {
      const s = progress * 3;
      ctx.beginPath();
      ctx.moveTo(t.x - s, t.y);
      ctx.lineTo(t.x + s, t.y);
      ctx.moveTo(t.x, t.y - s);
      ctx.lineTo(t.x, t.y + s);
      ctx.strokeStyle = `rgba(22, 53, 42, ${alpha * 0.6})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  requestAnimationFrame(animateCursor);
}
animateCursor();

// Hover states
document.querySelectorAll('a, button, .project-strip, .toc-item').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('hov'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('hov'));
});

/* ─── THREE.JS WIREFRAME MASSING MODEL ───────────────── */
(function() {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  s.onload = initThree;
  document.head.appendChild(s);

  function initThree() {
    const canvas = document.getElementById('hero3d');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
    camera.position.set(6, 4, 9);
    camera.lookAt(0, 1, 0);

    const wireMat = new THREE.LineBasicMaterial({ color: 0xC0BCB4, transparent: true, opacity: 0.55 });
    const accentMat = new THREE.LineBasicMaterial({ color: 0x16352A, transparent: true, opacity: 0.35 });

    function wireBox(w, h, d, x, y, z, mat) {
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
      const mesh = new THREE.LineSegments(geo, mat || wireMat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    }

    // Massing: stepped contemporary building
    const podium  = wireBox(5.5, 0.6,  3.2,  0,    0.3,   0);
    const towerA  = wireBox(1.4, 4.2,  1.4, -1.6,  2.4,  -0.3);
    const towerB  = wireBox(1.8, 2.8,  1.2,  0.4,  1.7,   0.2);
    const slab    = wireBox(3.0, 0.18, 1.0, -0.6,  3.85, -0.05);
    const wingR   = wireBox(2.0, 1.2,  1.6,  2.0,  1.2,   0);
    const parapet = wireBox(5.5, 0.08, 3.2,  0,    0.64,  0);

    const datumGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(7, 4));
    const datum    = new THREE.LineSegments(datumGeo, accentMat);
    datum.rotation.x = -Math.PI / 2;
    datum.position.set(0, 3.85, 0);
    scene.add(datum);

    const sectionGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.01, 5));
    const section    = new THREE.LineSegments(sectionGeo, accentMat);
    section.position.set(0, 2, 0);
    scene.add(section);

    let targetRotY = 0, targetRotX = 0;
    let currentRotY = -0.3, currentRotX = 0.12;

    const heroEl = document.getElementById('hero');
    heroEl && heroEl.addEventListener('mousemove', e => {
      const r = heroEl.getBoundingClientRect();
      targetRotY = (e.clientX - r.left) / r.width  - 0.5;
      targetRotX = ((e.clientY - r.top)  / r.height - 0.5) * -0.2;
      targetRotY *= 0.5;
    });

    const group = new THREE.Group();
    group.add(podium, towerA, towerB, slab, wingR, parapet, datum, section);
    group.rotation.y = currentRotY;
    scene.add(group);

    function resize() {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    setTimeout(() => { canvas.style.opacity = '1'; }, 600);

    let autoRot = 0;
    function animate() {
      requestAnimationFrame(animate);
      autoRot += 0.0018;
      currentRotY += (targetRotY + autoRot - currentRotY) * 0.04;
      currentRotX += (targetRotX - currentRotX) * 0.04;
      group.rotation.y = currentRotY;
      group.rotation.x = currentRotX;
      renderer.render(scene, camera);
    }
    animate();
  }
})();

/* ─── ACTIVE NAV LINK ON SCROLL ──────────────────────── */
const sections = ['about', 'work', 'process', 'contact'].map(id => document.getElementById(id));
const links    = document.querySelectorAll('.sn-link');
window.addEventListener('scroll', () => {
  const sy = scrollY + 120;
  let current = '';
  sections.forEach(s => { if (s && s.offsetTop <= sy) current = s.id; });
  links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current));
});

/* ─── SCROLL REVEAL ──────────────────────────────────── */
const ro = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('on'); ro.unobserve(e.target); }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.sr, .sr-left, .sr-right').forEach(el => ro.observe(el));

/* ─── SVG DRAW ON SCROLL ─────────────────────────────── */
const drawObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.draw-on-scroll, .draw-short').forEach(el => el.classList.add('drawn'));
      drawObs.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.drawing-cell, .elevation-block').forEach(el => drawObs.observe(el));

/* ─── SKILL BARS ─────────────────────────────────────── */
const skillObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.skill-fill').forEach(b => {
        b.style.transform = `scaleX(${b.dataset.w})`;
      });
      skillObs.unobserve(e.target);
    }
  });
}, { threshold: 0.4 });
document.querySelectorAll('.skills').forEach(el => skillObs.observe(el));
