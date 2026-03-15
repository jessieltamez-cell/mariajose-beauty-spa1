/* ============================================
   Hero Cinematic — Maria José Beauty & Spa
   Parallax suave de la flor 3D con el mouse.
   ============================================ */
(function () {
  'use strict';

  const stage = document.querySelector('.hc__flower-stage');
  const flower = document.querySelector('.hc__flower');
  if (!stage || !flower) return;

  // Solo en desktop con mouse
  if (!window.matchMedia('(pointer: fine)').matches || window.innerWidth < 768) return;

  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  function lerp(a, b, t) { return a + (b - a) * t; }

  document.addEventListener('mousemove', (e) => {
    // Normalizar -1 a 1
    const nx = (e.clientX / window.innerWidth  - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    targetX = nx * 22;  // px de desplazamiento máximo horizontal
    targetY = ny * 16;  // px vertical
  }, { passive: true });

  function tick() {
    currentX = lerp(currentX, targetX, 0.06);
    currentY = lerp(currentY, targetY, 0.06);
    stage.style.transform = `translate(${currentX}px, ${currentY}px)`;
    requestAnimationFrame(tick);
  }

  tick();
})();
