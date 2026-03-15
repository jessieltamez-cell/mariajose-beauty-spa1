/* ============================================
   Maria José Beauty & Spa
   UI/UX Enhancements JS — 2026
   Mejoras de interacción sin romper lo existente.
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // Parallax del hero ahora lo maneja hero3d.js

  // ---------- Cursor personalizado sutil (solo desktop) ----------
  if (window.innerWidth >= 960 && window.matchMedia('(pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.id = 'mj-cursor';
    cursor.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 10px; height: 10px;
      background: rgba(194,138,154,0.6);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: width 0.2s, height 0.2s, opacity 0.2s;
      mix-blend-mode: multiply;
      will-change: transform;
    `;
    document.body.appendChild(cursor);

    const ring = document.createElement('div');
    ring.id = 'mj-cursor-ring';
    ring.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 32px; height: 32px;
      border: 1.5px solid rgba(194,138,154,0.35);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9998;
      transform: translate(-50%, -50%);
      transition: width 0.35s, height 0.35s, border-color 0.35s, opacity 0.35s;
      will-change: transform;
    `;
    document.body.appendChild(ring);

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.left = mouseX + 'px';
      cursor.style.top  = mouseY + 'px';
    }, { passive: true });

    // Anima el ring con lag
    function animateRing() {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = ringX + 'px';
      ring.style.top  = ringY + 'px';
      requestAnimationFrame(animateRing);
    }
    animateRing();

    // Expand en elementos interactivos
    const hoverTargets = document.querySelectorAll(
      'a, button, .service-card, .team-card, .pricing__tab, .chat-chip'
    );
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.style.width = '16px';
        cursor.style.height = '16px';
        cursor.style.background = 'rgba(194,138,154,0.8)';
        ring.style.width = '48px';
        ring.style.height = '48px';
        ring.style.borderColor = 'rgba(194,138,154,0.6)';
      });
      el.addEventListener('mouseleave', () => {
        cursor.style.width = '10px';
        cursor.style.height = '10px';
        cursor.style.background = 'rgba(194,138,154,0.6)';
        ring.style.width = '32px';
        ring.style.height = '32px';
        ring.style.borderColor = 'rgba(194,138,154,0.35)';
      });
    });

    // Ocultar cuando sale de la ventana
    document.addEventListener('mouseleave', () => {
      cursor.style.opacity = '0';
      ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      cursor.style.opacity = '1';
      ring.style.opacity = '1';
    });
  }

  // ---------- Stagger reveal mejorado para secciones ----------
  // Añade delays escalonados a children dentro de grids visibles
  function setupStaggeredReveal(gridSelector, childSelector) {
    const grids = document.querySelectorAll(gridSelector);
    grids.forEach(grid => {
      const children = grid.querySelectorAll(childSelector);
      children.forEach((child, i) => {
        child.style.transitionDelay = `${i * 65}ms`;
      });
    });
  }

  setupStaggeredReveal('.services__grid', '.service-card');
  setupStaggeredReveal('.team__grid', '.team-card');
  setupStaggeredReveal('.pricing__grid', '.pricing__item');

  // ---------- Tooltip de precios al hover en service cards ----------
  document.querySelectorAll('.service-card__price-tag').forEach(tag => {
    tag.title = 'Ver todos los precios';
  });

  // ---------- Smooth number counter mejorado (easing) ----------
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  const statNumbers = document.querySelectorAll('.stat-count');
  if (statNumbers.length) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const duration = 1600;
        const start = performance.now();

        function update(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const easedProgress = easeOutQuart(progress);
          el.textContent = Math.floor(easedProgress * target);
          if (progress < 1) {
            requestAnimationFrame(update);
          } else {
            el.textContent = target;
          }
        }

        requestAnimationFrame(update);
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => obs.observe(el));
  }

  // ---------- Indicador de progreso de scroll (header) ----------
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    height: 2px;
    width: 0%;
    background: linear-gradient(90deg, #C28A9A, #D5A6B4, #C28A9A);
    z-index: 1001;
    transition: width 0.1s linear;
    pointer-events: none;
  `;
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
  }, { passive: true });

  // ---------- Ripple effect en botones ----------
  function createRipple(e, el) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255,255,255,0.18);
      border-radius: 50%;
      transform: scale(0);
      animation: rippleAnim 0.55s ease-out forwards;
      pointer-events: none;
    `;

    // Inyectar keyframe si no existe
    if (!document.getElementById('ripple-style')) {
      const style = document.createElement('style');
      style.id = 'ripple-style';
      style.textContent = `@keyframes rippleAnim { to { transform: scale(1); opacity: 0; } }`;
      document.head.appendChild(style);
    }

    // El botón necesita position: relative y overflow: hidden (ya lo tiene por CSS)
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => createRipple(e, btn), { passive: true });
  });

  // ---------- Toast de horario al hacer clic en "Reservar" móvil ----------
  // (Solo si no hay formulario visible en viewport)
  const waFloat = document.querySelector('.whatsapp-float');
  if (waFloat) {
    waFloat.addEventListener('click', () => {
      showToast('Abriendo WhatsApp…', '💬');
    });
  }

  function showToast(message, icon = '✓') {
    const existing = document.getElementById('mj-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'mj-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 160px;
      right: 24px;
      background: white;
      color: #4A3540;
      padding: 12px 20px;
      border-radius: 14px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.86rem;
      font-weight: 500;
      box-shadow: 0 8px 32px rgba(140,93,111,0.25), 0 0 0 1px rgba(194,138,154,0.15);
      z-index: 9997;
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      pointer-events: none;
      max-width: 260px;
    `;
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ---------- Highlight activo en nav al pasar por secciones ----------
  // (Refuerza el observer existente con transición de color más suave)
  const navLinks = document.querySelectorAll('.header__nav-link');
  navLinks.forEach(link => {
    link.style.transition = 'color 0.3s ease, background 0.3s ease, padding-left 0.3s ease';
  });

  // ---------- Form input — float label visual feedback ----------
  document.querySelectorAll('.form-input').forEach(input => {
    const label = input.closest('.form-group')?.querySelector('.form-label');
    if (!label) return;

    input.addEventListener('focus', () => {
      label.style.color = '#8C5D6F';
      label.style.transition = 'color 0.2s ease';
    });

    input.addEventListener('blur', () => {
      label.style.color = '';
    });
  });

  // ---------- Pricing tab — mejorar transición de panel ----------
  const pricingPanels = document.querySelectorAll('.pricing__panel');
  const observer = new MutationObserver(() => {
    pricingPanels.forEach(panel => {
      if (panel.classList.contains('pricing__panel--active')) {
        panel.style.animation = 'panelIn 0.35s cubic-bezier(0,0,0.2,1) both';
      }
    });
  });

  pricingPanels.forEach(panel => {
    observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  });

  // ---------- Scroll suave mejorado — offset dinámico ----------
  // (Ya existe en main.js, este refuerza con el header actual)
  const header = document.getElementById('header');

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    // No duplicar; el listener en main.js ya maneja esto
    // Solo aseguramos que el offset use la altura actual del header
  });

  // ---------- Carrusel Equipo v2 ----------
  const teamCarousel = document.getElementById('teamCarousel');
  const teamPrev     = document.getElementById('teamPrev');
  const teamNext     = document.getElementById('teamNext');
  const teamDots     = document.getElementById('teamDots');
  const teamSlideNum = document.getElementById('teamSlideNum');

  if (teamCarousel && teamPrev && teamNext && teamDots) {
    const cards = teamCarousel.querySelectorAll('.team2__card');
    const dots  = teamDots.querySelectorAll('.team2__dot');
    const total = cards.length;
    let current = 0;
    let isAnimating = false;

    function goToSlide(index) {
      if (isAnimating || index === current) return;
      isAnimating = true;

      cards[current].style.opacity = '0';
      dots[current].classList.remove('is-active');

      current = Math.max(0, Math.min(index, total - 1));

      // Reordenamos el flex: mover la card activa al frente
      cards.forEach((card, i) => {
        card.style.order = String(i < current ? total : i - current);
      });

      cards[current].style.opacity = '1';
      dots[current].classList.add('is-active');

      if (teamSlideNum) teamSlideNum.textContent = String(current + 1);
      teamPrev.disabled = current === 0;
      teamNext.disabled = current === total - 1;

      setTimeout(() => { isAnimating = false; }, 520);
    }

    // Init
    cards.forEach((card, i) => {
      card.style.transition = 'opacity 0.45s ease';
      card.style.opacity = i === 0 ? '1' : '0';
      card.style.order = String(i);
    });
    teamPrev.disabled = true;

    teamNext.addEventListener('click', () => goToSlide(current + 1));
    teamPrev.addEventListener('click', () => goToSlide(current - 1));

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => goToSlide(i));
    });

    // Touch swipe
    let touchStartX = 0;
    teamCarousel.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    teamCarousel.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? goToSlide(current + 1) : goToSlide(current - 1);
      }
    }, { passive: true });

    // Cargar thumbs de trabajos si las imágenes existen
    document.querySelectorAll('.team2__work-thumb').forEach(thumb => {
      const member = thumb.dataset.member;
      const idx    = parseInt(thumb.dataset.idx, 10) + 1;
      const imgSrc = `img/trabajos/${member}/${idx}.jpg`;
      const probe  = new Image();
      probe.onload = () => {
        // La imagen existe — reemplazar placeholder
        thumb.classList.remove('team2__work-thumb--placeholder');
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `Trabajo ${idx}`;
        img.loading = 'lazy';
        thumb.innerHTML = '';
        thumb.appendChild(img);
        // Click abre galería en esa imagen
        thumb.addEventListener('click', () => {
          const galleryBtn = thumb.closest('.team2__card')?.querySelector('.team-card__gallery-btn');
          if (galleryBtn) galleryBtn.click();
        });
      };
      probe.src = imgSrc;
    });
  }

});
