/* ============================================
   Maria Jose Beauty & Spa - Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Mobile Navigation ----------
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.header__nav-link');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      navToggle.classList.toggle('active');
      navToggle.setAttribute('aria-expanded', isOpen);
      navToggle.setAttribute('aria-label', isOpen ? 'Cerrar men\u00fa' : 'Abrir men\u00fa');
      navMenu.setAttribute('aria-hidden', !isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir men\u00fa');
        navMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });
  }

  // ---------- Header Scroll Effect ----------
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('header--scrolled', window.scrollY > 60);
  }, { passive: true });

  // ---------- Scroll Reveal Animation ----------
  const revealElements = document.querySelectorAll(
    '.service-card, .gallery__item, .booking__wrapper, .section-header'
  );

  revealElements.forEach(el => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // ---------- Set minimum date to today ----------
  const dateInput = document.getElementById('appointmentDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }

  // ---------- Booking Form ----------
  const bookingForm = document.getElementById('bookingForm');

  if (bookingForm) {
    // ── Rate limiting: máximo 3 envíos por hora ──────────────────────
    function puedeEnviarCita() {
      const KEY = 'booking_attempts';
      const LIMIT = 3;
      const WINDOW_MS = 60 * 60 * 1000; // 1 hora
      const now = Date.now();
      let attempts;
      try { attempts = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { attempts = []; }
      attempts = attempts.filter(t => now - t < WINDOW_MS);
      if (attempts.length >= LIMIT) return false;
      attempts.push(now);
      try { localStorage.setItem(KEY, JSON.stringify(attempts)); } catch {}
      return true;
    }

    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!puedeEnviarCita()) {
        alert('Has enviado demasiadas solicitudes. Por favor espera un momento e intenta de nuevo.');
        return;
      }

      const name = document.getElementById('clientName').value.trim();
      const phone = document.getElementById('clientPhone').value.trim();
      const email = document.getElementById('clientEmail').value.trim();
      const service = document.getElementById('serviceType');
      const serviceText = service.options[service.selectedIndex].text;
      const date = document.getElementById('appointmentDate').value;
      const time = document.getElementById('appointmentTime');
      const timeText = time.options[time.selectedIndex].text;

      // Format date for display
      const dateObj = new Date(date + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Guardar en Supabase
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando...';

      const empleadaEl  = document.getElementById('empleadaSelect');
      const empleadaVal = empleadaEl ? (empleadaEl.value || null) : null;

      const resultado = await guardarCita({
        nombre:   name,
        telefono: phone,
        email:    email,
        servicio: serviceText,
        fecha:    date,
        hora:     timeText,
        empleada: empleadaVal,
      });

      if (!resultado.success) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar Cita';
        alert('Hubo un problema al guardar tu cita. Por favor intenta de nuevo.');
        return;
      }

      // Show success state
      bookingForm.innerHTML = `
        <div class="form-success">
          <div class="form-success__icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
          <h3>¡Cita registrada!</h3>
          <p>Tu cita de ${serviceText} ha sido agendada. Te contactaremos para confirmar.</p>
        </div>
      `;
    });
  }

  // ---------- Smooth scroll for anchor links ----------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ---------- Pricing Tabs ----------
  const pricingTabs = document.querySelectorAll('.pricing__tab');
  const pricingPanels = document.querySelectorAll('.pricing__panel');

  // ARIA setup
  pricingPanels.forEach(p => p.setAttribute('role', 'tabpanel'));
  pricingTabs.forEach(tab => {
    tab.setAttribute('aria-selected', tab.classList.contains('pricing__tab--active') ? 'true' : 'false');
    tab.setAttribute('aria-controls', `panel-${tab.dataset.tab}`);
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      pricingTabs.forEach(t => { t.classList.remove('pricing__tab--active'); t.setAttribute('aria-selected', 'false'); });
      pricingPanels.forEach(p => p.classList.remove('pricing__panel--active'));
      tab.classList.add('pricing__tab--active');
      tab.setAttribute('aria-selected', 'true');
      const panel = document.getElementById(`panel-${target}`);
      if (panel) panel.classList.add('pricing__panel--active');
    });
  });

  // Arrow key navigation between tabs
  const tabList = document.querySelector('[role="tablist"]');
  tabList?.addEventListener('keydown', (e) => {
    const tabs = [...pricingTabs];
    const idx = tabs.indexOf(document.activeElement);
    if (idx === -1) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); tabs[(idx + 1) % tabs.length].focus(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); tabs[(idx - 1 + tabs.length) % tabs.length].focus(); }
  });

  // Links de servicio que apuntan a un tab específico de precios
  document.querySelectorAll('a[data-goto-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      const tabName = link.dataset.gotoTab;
      const targetTab = document.querySelector(`.pricing__tab[data-tab="${tabName}"]`);
      if (targetTab) {
        pricingTabs.forEach(t => t.classList.remove('pricing__tab--active'));
        pricingPanels.forEach(p => p.classList.remove('pricing__panel--active'));
        targetTab.classList.add('pricing__tab--active');
        const panel = document.getElementById(`panel-${tabName}`);
        if (panel) panel.classList.add('pricing__panel--active');
      }
    });
  });

  // ---------- Chat Widget ----------
  const chatWidget   = document.getElementById('chatWidget');
  const chatToggle   = document.getElementById('chatToggle');
  const chatBox      = document.getElementById('chatBox');
  const chatClose    = document.getElementById('chatClose');
  const chatForm     = document.getElementById('chatForm');
  const chatInput    = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const chatBadge    = document.getElementById('chatBadge');

  if (!chatToggle || !chatBox) return;

  const WA_URL = 'https://wa.me/5218135727136?text=Hola%2C%20me%20gustar%C3%ADa%20recibir%20m%C3%A1s%20informaci%C3%B3n';

  const defaultChips = [
    { label: '📋 Ver precios',  action: 'precios'   },
    { label: '📅 Agendar cita', action: 'agendar'   },
    { label: '💅 Servicios',    action: 'servicios' },
    { label: '🕐 Horarios',     action: 'horario'   },
  ];

  // Show badge after 3s to draw attention
  setTimeout(() => chatBadge && chatBadge.classList.add('visible'), 3000);

  // Escape key — cierra menú móvil y chat
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (chatWidget?.classList.contains('is-open')) closeChat();
    if (navMenu?.classList.contains('open')) {
      navToggle?.classList.remove('active');
      navMenu.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
      navToggle?.setAttribute('aria-label', 'Abrir men\u00fa');
      navMenu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });

  function openChat() {
    chatWidget.classList.add('is-open');
    chatBox.setAttribute('aria-hidden', 'false');
    chatBadge && chatBadge.classList.remove('visible');
    if (chatMessages.childElementCount === 0) {
      typeMessage('¡Hola! 👋 Bienvenida a Maria José Beauty & Spa.\n¿En qué puedo ayudarte hoy?', defaultChips);
    }
    setTimeout(() => chatInput.focus(), 320);
  }

  function closeChat() {
    chatWidget.classList.remove('is-open');
    chatBox.setAttribute('aria-hidden', 'true');
  }

  chatToggle.addEventListener('click', () =>
    chatWidget.classList.contains('is-open') ? closeChat() : openChat()
  );
  chatClose.addEventListener('click', closeChat);

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function appendUserMsg(text) {
    const row = document.createElement('div');
    row.className = 'chat-msg user';
    row.innerHTML = `<div class="chat-msg__bubble">${escHtml(text)}</div>`;
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  const MAPS_URL = 'https://maps.app.goo.gl/XU87Tw2pjYCSmGUz7';

  function appendBotMsg(text, chips, waButton, mapsButton) {
    const row = document.createElement('div');
    row.className = 'chat-msg bot';
    row.innerHTML = `<div class="chat-msg__avatar" aria-hidden="true">MJ</div>
      <div class="chat-msg__bubble">${escHtml(text)}</div>`;
    chatMessages.appendChild(row);

    if (mapsButton) {
      const mp = document.createElement('div');
      mp.className = 'chat-chips';
      mp.innerHTML = `<a class="chat-maps-btn" href="${MAPS_URL}" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        Ver en Google Maps
      </a>`;
      chatMessages.appendChild(mp);
    }

    if (waButton) {
      const wa = document.createElement('div');
      wa.className = 'chat-chips';
      wa.innerHTML = `<a class="chat-wa-btn" href="${WA_URL}" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Chatear en WhatsApp
      </a>`;
      chatMessages.appendChild(wa);
    }

    if (chips && chips.length) {
      const chipsRow = document.createElement('div');
      chipsRow.className = 'chat-chips';
      chips.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'chat-chip';
        btn.textContent = c.label;
        btn.addEventListener('click', () => handleChip(c.action, c.label));
        chipsRow.appendChild(btn);
      });
      chatMessages.appendChild(chipsRow);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  let typingEl = null;
  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'chat-typing';
    typingEl.innerHTML = `<div class="chat-msg__avatar" aria-hidden="true">MJ</div>
      <div class="chat-typing__dots">
        <span class="chat-typing__dot"></span>
        <span class="chat-typing__dot"></span>
        <span class="chat-typing__dot"></span>
      </div>`;
    chatMessages.appendChild(typingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  function hideTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } }

  function typeMessage(text, chips, waButton, mapsButton) {
    showTyping();
    const delay = 700 + Math.min(text.length * 12, 800);
    setTimeout(() => { hideTyping(); appendBotMsg(text, chips, waButton, mapsButton); }, delay);
  }

  function getResponse(q) {
    const t = q.toLowerCase();
    if (t.match(/hola|hey|buenas|buenos|hi\b/))
      return { text: '¡Hola! 😊 ¿En qué puedo ayudarte?', chips: defaultChips };
    if (t.match(/gracias|thank/))
      return { text: '¡Con gusto! 💕 Si necesitas algo más, aquí estoy.', chips: defaultChips };
    if (t.match(/precio|costo|cuánto|cuanto|cobr|vale/))
      return { text: '¿Qué servicio te interesa?', chips: [
        { label: '💅 Manicura',   action: 'precio-manicura'   },
        { label: '🦶 Pedicura',   action: 'precio-pedicura'   },
        { label: '👁️ Pestañas',  action: 'precio-pestanas'   },
        { label: '💆 Masajes',    action: 'precio-masajes'    },
        { label: '💄 Maquillaje', action: 'precio-maquillaje' },
      ]};
    if (t.match(/manicur|uña|gel|rubber|acrilic/))
      return { text: '💅 Precios de Manicura:\n• Gel liso: $190\n• Gel diseño sencillo: $250\n• Rubber + gel liso: $420\n• Acrílico liso: $430\n• Acrílico diseño elaborado: $590–$740',
        chips: [{ label: '📋 Ver todos los precios', action: 'ver-precios' }, { label: '📅 Agendar', action: 'agendar' }] };
    if (t.match(/pedicur|del pie|spa de pies/))
      return { text: '🦶 Pedicura spa:\n• Gel liso: $410\n• Con French: $460\n• Acripie sencillo: $460\n• Acripie completo: $530\n• Reconstrucción ungueal: $650\n\n✨ Incluye sales, exfoliante, mascarilla, crema y masaje.',
        chips: [{ label: '📅 Agendar', action: 'agendar' }] };
    if (t.match(/pestaña|lash|extensi/))
      return { text: '👁️ Extensiones de Pestañas:\n• Clásico: $400\n• 3D / Efecto Rímel: $500\n• Hawaiano: $550\n• Volumen 5D: $600\n• Híbrido / Wispy / Foxy: $650\n• MegaVolumen: $850',
        chips: [{ label: '📅 Agendar con Yuliana', action: 'agendar' }] };
    if (t.match(/masaje|terapia|relajaci|fisioter|corporal|perla/))
      return { text: '💆 Masajes & Terapias:\n• Descontracturante (espalda/hombros): $400\n• Drenaje linfático: $300\n• Masaje sueco (cuerpo completo): $650\n• Gotas de lluvia: $300\n• Conoterapia: $250\n• Reflexología podal: $250\n• Relajante de piernas: $250',
        chips: [{ label: '📋 Ver precios', action: 'ver-precios' }, { label: '📅 Agendar', action: 'agendar' }] };
    if (t.match(/maquill|peinado|boda|quincea|graduaci|evento|dafne/))
      return { text: '💄 Maquillaje & Peinados:\n• Maquillaje social: $850\n• + Peinado sencillo: $900\n• + Peinado semirecogido: $1,000\n• + Peinado recogido: $1,100\n• Paquete novia: desde $2,500\n• Paquete XV años: desde $2,300',
        chips: [{ label: '📋 Ver todos los precios', action: 'ver-precios' }, { label: '📅 Agendar', action: 'agendar' }] };
    if (t.match(/facial|cosmetol|piel|limpieza|sofia/))
      return { text: '✨ Cosmetología & Faciales con Sofia Sustaita:\n• Limpieza facial profunda\n• Hidratación y tratamientos anti-edad\n• Egresada Universidad Kirei 2022', waButton: true };
    if (t.match(/horar|qué días|que dias|cuándo abren|cuando abren|abre|cierra/))
      return { text: '🕐 Nuestro horario:\n• Lunes a Viernes: 10:00 AM – 8:00 PM\n• Sábado: 9:30 AM – 6:00 PM\n• Domingo: Solo masajes con cita previa\n\n¿Quieres agendar?', chips: [{ label: '📅 Agendar ahora', action: 'agendar' }] };
    if (t.match(/reserv|cita|agendar|disponib/))
      return { text: '📅 Puedes agendar tu cita por WhatsApp o llenar el formulario en esta página. ¡Te respondemos rápido!', waButton: true };
    if (t.match(/ubicaci|donde|dirección|llegar|domicil/))
      return { text: '📍 Nos encontramos en:\nAv. Perimetral Sur #132\nCol. Lomas del Poniente\nSanta Catarina, N.L. 66369', mapsButton: true, waButton: true };
    if (t.match(/equipo|personal|especialista|quien|quién|chica/))
      return { text: 'Somos 6 especialistas certificadas 💕\n• Sofia — Cosmetología & Acrílico\n• Daniela — Manicura & Pedicura\n• Anette — Nail Art\n• Yuliana — Extensiones de Pestañas\n• Dafne — Maquillaje & Peinados\n• Perla — Masajes & Terapias',
        chips: [{ label: '👩 Ver equipo', action: 'ver-equipo' }] };
    if (t.match(/servicio|ofrecen|hacen/))
      return { text: 'Ofrecemos:\n💅 Manicura (Gel, Rubber, Acrílico)\n🦶 Pedicura spa\n👁️ Extensiones de Pestañas\n💄 Maquillaje & Peinados\n💆 Masajes & Terapias\n✨ Cosmetología & Faciales',
        chips: [{ label: '💰 Ver precios', action: 'precios' }, { label: '📅 Agendar', action: 'agendar' }] };
    return { text: 'Gracias por tu mensaje 😊 Para más información escríbenos directo.', chips: defaultChips, waButton: true };
  }

  function handleChip(action, label) {
    appendUserMsg(label);
    let resp;
    switch (action) {
      case 'precios':           resp = getResponse('precio'); break;
      case 'agendar':           resp = { text: '¡Perfecto! 📅 Escríbenos por WhatsApp o usa el formulario en esta página.', waButton: true }; break;
      case 'servicios':         resp = getResponse('servicios'); break;
      case 'horario':           resp = getResponse('horario'); break;
      case 'precio-manicura':   resp = getResponse('manicura'); break;
      case 'precio-pedicura':   resp = getResponse('pedicura'); break;
      case 'precio-pestanas':   resp = getResponse('pestañas'); break;
      case 'precio-masajes':    resp = getResponse('masajes'); break;
      case 'precio-maquillaje': resp = getResponse('maquillaje'); break;
      case 'ver-precios':
        document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' });
        closeChat(); return;
      case 'ver-equipo':
        document.getElementById('equipo')?.scrollIntoView({ behavior: 'smooth' });
        closeChat(); return;
      default: resp = { text: '¡Enseguida! 😊', chips: defaultChips };
    }
    typeMessage(resp.text, resp.chips, resp.waButton, resp.mapsButton);
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    appendUserMsg(text);
    chatInput.value = '';
    const resp = getResponse(text);
    typeMessage(resp.text, resp.chips, resp.waButton, resp.mapsButton);
  });

  // ---------- Gallery Modal ----------
  // Imágenes de trabajos por colaboradora (nombres reales de archivo)
  const galleryData = {
    daniela: {
      name: 'Daniela Loera — Trabajos',
      images: [
        'img/trabajos/daniela/DANIELA.jpg',
        'img/trabajos/daniela/DANIELA_1.jpg',
        'img/trabajos/daniela/DANIELA_2.jpg',
        'img/trabajos/daniela/DANIELA_3.jpg',
        'img/trabajos/daniela/DANIELA_4.jpg',
        'img/trabajos/daniela/DANIELA_gel_liso.jpeg',
        'img/trabajos/daniela/DANIELA_acrilico_liso.jpeg',
        'img/trabajos/daniela/DANIELA_gel_sencillo.jpeg',
        'img/trabajos/daniela/DANIELA_gel_pies.jpg',
        'img/trabajos/daniela/DANIELA_rubber_liso.jpeg',
        'img/trabajos/daniela/DANIELA_rubber_sencillo.jpeg'
      ]
    },
    anette: {
      name: 'Anette Constantino — Trabajos',
      images: [
        'img/trabajos/anette/ANETTE_0.jpeg',
        'img/trabajos/anette/ANETTE_1_acrilico_french.jpeg',
        'img/trabajos/anette/ANETTE_2_acrilico_elaborado.jpeg',
        'img/trabajos/anette/ANETTE_3_acrilico_sencillo.jpeg',
        'img/trabajos/anette/ANETTE_4_acripie.jpg',
        'img/trabajos/anette/ANETTE_5_gel_sencillo.jpeg',
        'img/trabajos/anette/ANETTE_6_rubber_sencillo.jpeg',
        'img/trabajos/anette/ANETTE_7_lashlifting.jpg'
      ]
    },
    yuliana: {
      name: 'Yuliana Pérez — Trabajos',
      images: [
        'img/trabajos/yuliana/YULY_clasico.jpg',
        'img/trabajos/yuliana/YULY_3d_rimel.jpg',
        'img/trabajos/yuliana/YULY_hawaiano.jpg',
        'img/trabajos/yuliana/YULY_mega_volumen.jpg',
        'img/trabajos/yuliana/YULY_volumen_5d.jpg',
        'img/trabajos/yuliana/YULY_wispy.jpg',
        'img/trabajos/yuliana/YULY_hibrido.jpg'
      ]
    },
    dafne: {
      name: 'Dafne Adame — Trabajos',
      images: [
        'img/trabajos/dafne/DAFNE.jpg',
        'img/trabajos/dafne/DAFNE_1.jpg',
        'img/trabajos/dafne/DAFNE_2.jpg',
        'img/trabajos/dafne/DAFNE_3.jpg',
        'img/trabajos/dafne/DAFNE_4.jpg'
      ]
    },
    perla: {
      name: 'Perla Tobías — Trabajos',
      images: [
        'img/trabajos/perla/PERLA_1.jpg',
        'img/trabajos/perla/PERLA_2.jpg',
        'img/trabajos/perla/PERLA_3.jpg',
        'img/trabajos/perla/PERLA_4.jpg',
        'img/trabajos/perla/PERLA_5.jpg',
        'img/trabajos/perla/PERLA_6.jpg',
        'img/trabajos/perla/PERLA_7.jpg',
        'img/trabajos/perla/PERLA_8.jpg',
        'img/trabajos/perla/PERLA_9.jpg',
        'img/trabajos/perla/PERLA_10.jpg'
      ]
    }
  };

  const galleryModal  = document.getElementById('galleryModal');
  const galleryImg    = document.getElementById('galleryImg');
  const galleryTitle  = document.getElementById('galleryTitle');
  const galleryCounter= document.getElementById('galleryCounter');
  const galleryDots   = document.getElementById('galleryDots');
  const galleryPrev   = document.getElementById('galleryPrev');
  const galleryNext   = document.getElementById('galleryNext');
  const galleryClose  = document.getElementById('galleryClose');

  let currentGallery = [];
  let currentIndex   = 0;

  function openGallery(member, startIndex) {
    const data = galleryData[member];
    if (!data) return;
    currentGallery = data.images;
    currentIndex   = startIndex || 0;
    galleryTitle.textContent = data.name;

    galleryDots.innerHTML = '';
    currentGallery.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'gallery-modal__dot' + (i === currentIndex ? ' is-active' : '');
      dot.setAttribute('aria-label', `Imagen ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      galleryDots.appendChild(dot);
    });

    showSlide(currentIndex);
    galleryModal.classList.add('is-open');
    galleryModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeGallery() {
    galleryModal.classList.remove('is-open');
    galleryModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showSlide(index) {
    currentIndex = index;
    galleryImg.classList.add('is-fading');
    setTimeout(() => {
      galleryImg.src = currentGallery[index];
      galleryImg.alt = `Trabajo ${index + 1}`;
      galleryImg.classList.remove('is-fading');
    }, 200);
    galleryCounter.textContent = `${index + 1} / ${currentGallery.length}`;
    galleryPrev.disabled = index === 0;
    galleryNext.disabled = index === currentGallery.length - 1;
    galleryDots.querySelectorAll('.gallery-modal__dot').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
    });
  }

  function goTo(index) {
    if (index < 0 || index >= currentGallery.length) return;
    showSlide(index);
  }

  galleryPrev.addEventListener('click', () => goTo(currentIndex - 1));
  galleryNext.addEventListener('click', () => goTo(currentIndex + 1));
  galleryClose.addEventListener('click', closeGallery);
  galleryModal.querySelector('.gallery-modal__backdrop').addEventListener('click', closeGallery);

  document.addEventListener('keydown', (e) => {
    if (!galleryModal.classList.contains('is-open')) return;
    if (e.key === 'Escape')      closeGallery();
    if (e.key === 'ArrowLeft')   goTo(currentIndex - 1);
    if (e.key === 'ArrowRight')  goTo(currentIndex + 1);
  });

  document.querySelectorAll('.team-card__gallery-btn').forEach(btn => {
    btn.addEventListener('click', () => openGallery(btn.dataset.member));
  });

  // Thumbs individuales abren galería en el índice correcto
  document.querySelectorAll('.team2__work-thumb[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const member = btn.dataset.member;
      const idx = parseInt(btn.dataset.idx, 10);
      openGallery(member, idx);
    });
  });

  // ---------- Active Nav Link on Scroll ----------
  const pageSections = document.querySelectorAll('section[id]');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  pageSections.forEach(s => sectionObserver.observe(s));

  // ---------- Disponibilidad: configuración ----------
  const EMPLEADAS_POR_SERVICIO = {
    'gel':        ['Daniela Loera', 'Anette Constantino'],
    'rubber':     ['Daniela Loera', 'Anette Constantino'],
    'acrilico':   ['Daniela Loera', 'Anette Constantino'],
    'pedi':       ['Daniela Loera', 'Anette Constantino'],
    'lash':       ['Yuliana Pérez'],
    'maquillaje': ['Dafne Adame'],
    'peinado':    ['Dafne Adame'],
    'masaje':     ['Perla Tobías'],
    'facial':     ['Perla Tobías'],
  };

  const TIME_SLOTS = {
    weekday:  ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'],
    saturday: ['09:30','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'],
    sunday:   ['10:00','11:00','12:00','13:00','14:00'],
  };

  const TIME_LABELS = {
    '09:30':'9:30 AM','10:00':'10:00 AM','11:00':'11:00 AM','12:00':'12:00 PM',
    '13:00':'1:00 PM','14:00':'2:00 PM','15:00':'3:00 PM','16:00':'4:00 PM',
    '17:00':'5:00 PM','18:00':'6:00 PM','19:00':'7:00 PM','20:00':'8:00 PM',
  };

  const sundayNote   = document.getElementById('sundayNote');
  const timeSelect   = document.getElementById('appointmentTime');
  const serviceSelect= document.getElementById('serviceType');
  const empleadaGroup= document.getElementById('empleadaGroup');
  const empleadaSel  = document.getElementById('empleadaSelect');

  // Cache para no re-consultar Supabase en cada cambio
  let cachedDate        = null;
  let cachedCitas       = [];
  let cachedDiasBloq    = [];
  let cachedEmpBloq     = [];
  let cachedHorasBloq   = new Set();

  function getSlotKey(dayOfWeek) {
    return dayOfWeek === 0 ? 'sunday' : dayOfWeek === 6 ? 'saturday' : 'weekday';
  }

  function getEmpleadasParaServicio(serviceValue) {
    if (!serviceValue) return null;
    for (const [key, lista] of Object.entries(EMPLEADAS_POR_SERVICIO)) {
      if (serviceValue.startsWith(key)) return lista;
    }
    return null;
  }

  async function cargarDisponibilidadFecha(fecha) {
    if (cachedDate === fecha) return; // ya está cacheado
    cachedDate = fecha;

    const [citasRes, diasRes, empRes, horasRes] = await Promise.all([
      supabaseClient.from('citas')
        .select('hora, empleada, estado')
        .eq('fecha', fecha)
        .in('estado', ['pendiente', 'confirmada']),
      supabaseClient.from('dias_bloqueados').select('fecha').eq('fecha', fecha),
      supabaseClient.from('empleadas_bloqueadas').select('empleada').eq('fecha', fecha),
      supabaseClient.from('horarios_bloqueados').select('hora').eq('fecha', fecha),
    ]);

    cachedCitas    = citasRes.data  || [];
    cachedDiasBloq = diasRes.data   || [];
    cachedEmpBloq  = empRes.data    || [];
    cachedHorasBloq = new Set((horasRes.data || []).map(h => h.hora));
  }

  function isDiaBloqueado() {
    return cachedDiasBloq.length > 0;
  }

  function getEmpleadasBloqueadasHoy() {
    return new Set(cachedEmpBloq.map(e => e.empleada));
  }

  function getEmpleadasLibresEnHora(hora, empleadasDelServicio) {
    const empBloqHoy = getEmpleadasBloqueadasHoy();
    const ocupadasEnHora = new Set(
      cachedCitas.filter(c => c.hora === hora && c.empleada).map(c => c.empleada)
    );
    return empleadasDelServicio.filter(emp =>
      !empBloqHoy.has(emp) && !ocupadasEnHora.has(emp)
    );
  }

  async function actualizarFormulario() {
    const fecha       = dateInput ? dateInput.value : null;
    const serviceVal  = serviceSelect ? serviceSelect.value : null;

    if (!fecha) {
      // Sin fecha: restablecer horarios
      if (timeSelect) {
        timeSelect.innerHTML = '<option value="" disabled selected>Selecciona una fecha primero</option>';
      }
      if (empleadaGroup) empleadaGroup.style.display = 'none';
      return;
    }

    const d = new Date(fecha + 'T12:00:00');
    const dayOfWeek = d.getDay();
    if (sundayNote) sundayNote.classList.toggle('visible', dayOfWeek === 0);

    // Cargar datos de disponibilidad
    await cargarDisponibilidadFecha(fecha);

    // Día bloqueado completo
    if (isDiaBloqueado()) {
      if (timeSelect) {
        timeSelect.innerHTML = '<option value="" disabled selected>Fecha no disponible</option>';
      }
      if (empleadaGroup) empleadaGroup.style.display = 'none';
      // Marcar el input de fecha visualmente
      if (dateInput) dateInput.classList.add('input--bloqueado');
      return;
    }

    if (dateInput) dateInput.classList.remove('input--bloqueado');

    // Empleadas para este servicio
    const empleadasServicio = serviceVal ? getEmpleadasParaServicio(serviceVal) : null;

    // Construir horarios disponibles
    const slotKey = getSlotKey(dayOfWeek);
    const horas   = TIME_SLOTS[slotKey];

    if (timeSelect) {
      timeSelect.innerHTML = '';
      const ph = document.createElement('option');
      ph.value = ''; ph.disabled = true; ph.selected = true;
      ph.textContent = 'Selecciona un horario';
      timeSelect.appendChild(ph);

      let alguno = false;
      horas.forEach(hora => {
        // Horario bloqueado manualmente
        if (cachedHorasBloq.has(hora)) {
          const opt = document.createElement('option');
          opt.value = hora;
          opt.textContent = `${TIME_LABELS[hora] || hora} — No disponible`;
          opt.disabled = true;
          timeSelect.appendChild(opt);
          return;
        }

        let disponible = true;
        if (empleadasServicio) {
          const libres = getEmpleadasLibresEnHora(hora, empleadasServicio);
          disponible = libres.length > 0;
        }
        const opt = document.createElement('option');
        opt.value = hora;
        opt.textContent = TIME_LABELS[hora] || hora;
        if (!disponible) {
          opt.disabled = true;
          opt.textContent += ' — Sin disponibilidad';
        } else {
          alguno = true;
        }
        timeSelect.appendChild(opt);
      });

      if (!alguno) {
        timeSelect.innerHTML = '<option value="" disabled selected>Sin horarios disponibles este día</option>';
      }
    }

    // Actualizar empleadas según hora elegida
    actualizarEmpleadasPorHora();
  }

  function actualizarEmpleadasPorHora() {
    if (!empleadaGroup || !empleadaSel) return;
    const serviceVal = serviceSelect ? serviceSelect.value : null;
    const hora       = timeSelect    ? timeSelect.value    : null;
    const fecha      = dateInput     ? dateInput.value     : null;

    const empleadasServicio = getEmpleadasParaServicio(serviceVal);
    if (!empleadasServicio || !fecha) {
      empleadaGroup.style.display = 'none';
      return;
    }

    const libres = hora
      ? getEmpleadasLibresEnHora(hora, empleadasServicio)
      : empleadasServicio.filter(emp => !getEmpleadasBloqueadasHoy().has(emp));

    if (libres.length === 0) {
      empleadaSel.innerHTML = '<option value="" disabled selected>Sin especialistas disponibles</option>';
      empleadaGroup.style.display = '';
      return;
    }

    empleadaSel.innerHTML =
      '<option value="">Sin preferencia</option>' +
      libres.map(e => `<option value="${e}">${e}</option>`).join('');
    empleadaGroup.style.display = '';
  }

  // Listeners
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      cachedDate = null; // invalidar cache
      actualizarFormulario();
    });
  }

  if (serviceSelect) {
    serviceSelect.addEventListener('change', () => {
      actualizarFormulario();
    });
  }

  if (timeSelect) {
    timeSelect.addEventListener('change', () => {
      actualizarEmpleadasPorHora();
    });
  }

  // ---------- Animated Counters ----------
  // ---------- Testimonials Carousel ----------
  const tTrack  = document.getElementById('testimonialsTrack');
  const tPrev   = document.getElementById('testimonialPrev');
  const tNext   = document.getElementById('testimonialNext');
  const tDotsEl = document.getElementById('testimonialDots');

  if (tTrack && tPrev && tNext && tDotsEl) {
    const tCards      = tTrack.querySelectorAll('.testimonial-card');
    const total       = tCards.length;
    let   tIndex      = 0;
    let   tAuto;
    let   perView     = 1;

    function tGetPerView() {
      if (window.innerWidth >= 960) return 3;
      if (window.innerWidth >= 640) return 2;
      return 1;
    }

    function tCardWidth() {
      const gap = 24;
      return (tTrack.parentElement.offsetWidth - gap * (perView - 1)) / perView;
    }

    function tSetSizes() {
      perView = tGetPerView();
      const w = tCardWidth();
      tCards.forEach(c => { c.style.flex = `0 0 ${w}px`; c.style.width = `${w}px`; });
    }

    function tBuildDots() {
      tDotsEl.innerHTML = '';
      const steps = total - perView + 1;
      for (let i = 0; i < steps; i++) {
        const d = document.createElement('button');
        d.className = 'testimonials__dot' + (i === 0 ? ' is-active' : '');
        d.setAttribute('aria-label', `Reseña ${i + 1}`);
        d.addEventListener('click', () => tGoTo(i));
        tDotsEl.appendChild(d);
      }
    }

    function tGoTo(idx) {
      const maxIdx = total - perView;
      tIndex = Math.max(0, Math.min(idx, maxIdx));
      const offset = tIndex * (tCardWidth() + 24);
      tTrack.style.transform = `translateX(-${offset}px)`;
      tDotsEl.querySelectorAll('.testimonials__dot').forEach((d, i) => {
        d.classList.toggle('is-active', i === tIndex);
      });
      tPrev.disabled = tIndex === 0;
      tNext.disabled = tIndex >= maxIdx;
    }

    function tStartAuto() {
      clearInterval(tAuto);
      tAuto = setInterval(() => {
        const maxIdx = total - perView;
        tGoTo(tIndex >= maxIdx ? 0 : tIndex + 1);
      }, 4500);
    }

    tSetSizes();
    tBuildDots();
    tGoTo(0);
    tStartAuto();

    tPrev.addEventListener('click', () => { tGoTo(tIndex - 1); tStartAuto(); });
    tNext.addEventListener('click', () => { tGoTo(tIndex + 1); tStartAuto(); });

    // Pause on hover
    tTrack.parentElement.addEventListener('mouseenter', () => clearInterval(tAuto));
    tTrack.parentElement.addEventListener('mouseleave', tStartAuto);

    // Touch/swipe
    let tTouchX = 0;
    tTrack.addEventListener('touchstart', e => { tTouchX = e.touches[0].clientX; }, { passive: true });
    tTrack.addEventListener('touchend',   e => {
      const diff = tTouchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { tGoTo(tIndex + (diff > 0 ? 1 : -1)); tStartAuto(); }
    });

    window.addEventListener('resize', () => {
      tSetSizes();
      tBuildDots();
      tGoTo(tIndex);
    });
  }

  // ---------- Animated Counters ----------
  const counterEls = document.querySelectorAll('.stat-count');
  if (counterEls.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const increment = target / (1400 / 16);
        let current = 0;
        const tick = setInterval(() => {
          current += increment;
          if (current >= target) { clearInterval(tick); current = target; }
          el.textContent = Math.floor(current);
        }, 16);
        counterObserver.unobserve(el);
      });
    }, { threshold: 0.6 });
    counterEls.forEach(el => counterObserver.observe(el));
  }

  // ---------- Ocultar branding Behold (Shadow DOM) ----------
  function hideBeholdBranding() {
    const widget = document.querySelector('behold-widget');
    if (!widget) return false;
    const root = widget.shadowRoot;
    if (!root) return false;
    const selectors = [
      '[class*="brand"]', '[class*="Brand"]',
      '[class*="powered"]', '[class*="Powered"]',
      '[class*="credit"]', '[class*="Credit"]',
      '[class*="watermark"]',
      'a[href*="behold"]',
      'a[href*="behold.so"]',
    ];
    let found = false;
    selectors.forEach(sel => {
      root.querySelectorAll(sel).forEach(el => {
        el.style.setProperty('display', 'none', 'important');
        found = true;
      });
    });
    return found;
  }

  // Intentar al cargar y tras retardos por si el widget tarda en renderizar
  if (!hideBeholdBranding()) {
    [500, 1500, 3000].forEach(ms => setTimeout(hideBeholdBranding, ms));
    const brandObserver = new MutationObserver(() => {
      if (hideBeholdBranding()) brandObserver.disconnect();
    });
    brandObserver.observe(document.body, { childList: true, subtree: true });
  }
});
