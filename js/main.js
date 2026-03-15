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
      navToggle.classList.toggle('active');
      navMenu.classList.toggle('open');
      document.body.style.overflow = navMenu.classList.contains('open') ? 'hidden' : '';
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('open');
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
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('clientName').value.trim();
      const phone = document.getElementById('clientPhone').value.trim();
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

      // Build WhatsApp message
      const message = encodeURIComponent(
        `Hola, soy ${name}.\n` +
        `Me gustaría reservar una cita:\n\n` +
        `📋 Servicio: ${serviceText}\n` +
        `📅 Fecha: ${formattedDate}\n` +
        `🕐 Hora: ${timeText}\n` +
        `📱 Mi teléfono: ${phone}\n\n` +
        `¡Gracias!`
      );

      // Show success state
      bookingForm.innerHTML = `
        <div class="form-success">
          <div class="form-success__icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
          <h3>¡Redirigiendo a WhatsApp!</h3>
          <p>Te estamos conectando para confirmar tu cita de ${serviceText}.</p>
        </div>
      `;

      // Redirect to WhatsApp
      setTimeout(() => {
        window.open(`https://wa.me/5218135727136?text=${message}`, '_blank');
      }, 800);
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

  pricingTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      pricingTabs.forEach(t => t.classList.remove('pricing__tab--active'));
      pricingPanels.forEach(p => p.classList.remove('pricing__panel--active'));
      tab.classList.add('pricing__tab--active');
      const panel = document.getElementById(`panel-${target}`);
      if (panel) panel.classList.add('pricing__panel--active');
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
      mp.innerHTML = `<a class="chat-maps-btn" href="${MAPS_URL}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        Ver en Google Maps
      </a>`;
      chatMessages.appendChild(mp);
    }

    if (waButton) {
      const wa = document.createElement('div');
      wa.className = 'chat-chips';
      wa.innerHTML = `<a class="chat-wa-btn" href="${WA_URL}" target="_blank" rel="noopener">
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
      return { text: '💆 Masajes & Terapias con Perla Tobías:\n• Masajes relajantes y terapéuticos\n• Fisioterapia corporal y estética\n• 4 años de experiencia\n\nConsulta precios y disponibilidad:', waButton: true };
    if (t.match(/maquill|peinado|boda|quincea|graduaci|evento|dafne/))
      return { text: '💄 Maquillaje & Peinados con Dafne Adame:\n• Maquillaje social, de noche y editorial\n• Peinados para quinceañeras, bodas y graduaciones\n• 6 años de experiencia', waButton: true };
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
  // Agrega las fotos de trabajos en las carpetas correspondientes:
  // img/trabajos/sofia/   → 1.jpg, 2.jpg, 3.jpg ...
  // img/trabajos/daniela/ → 1.jpg, 2.jpg, 3.jpg ...
  // img/trabajos/anette/  → 1.jpg, 2.jpg, 3.jpg ...
  // img/trabajos/yuliana/ → 1.jpg, 2.jpg, 3.jpg ...
  // img/trabajos/dafne/   → 1.jpg, 2.jpg, 3.jpg ...
  // img/trabajos/perla/   → 1.jpg, 2.jpg, 3.jpg ...
  const galleryData = {
    sofia: {
      name: 'Sofia Sustaita — Trabajos',
      images: ['img/trabajos/sofia/1.jpg','img/trabajos/sofia/2.jpg','img/trabajos/sofia/3.jpg']
    },
    daniela: {
      name: 'Daniela Loera — Trabajos',
      images: ['img/trabajos/daniela/1.jpg','img/trabajos/daniela/2.jpg','img/trabajos/daniela/3.jpg']
    },
    anette: {
      name: 'Anette Constantino — Trabajos',
      images: ['img/trabajos/anette/1.jpg','img/trabajos/anette/2.jpg','img/trabajos/anette/3.jpg']
    },
    yuliana: {
      name: 'Yuliana Pérez — Trabajos',
      images: ['img/trabajos/yuliana/1.jpg','img/trabajos/yuliana/2.jpg','img/trabajos/yuliana/3.jpg']
    },
    dafne: {
      name: 'Dafne Adame — Trabajos',
      images: ['img/trabajos/dafne/1.jpg','img/trabajos/dafne/2.jpg','img/trabajos/dafne/3.jpg']
    },
    perla: {
      name: 'Perla Tobías — Trabajos',
      images: ['img/trabajos/perla/1.jpg','img/trabajos/perla/2.jpg','img/trabajos/perla/3.jpg']
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

  function openGallery(member) {
    const data = galleryData[member];
    if (!data) return;
    currentGallery = data.images;
    currentIndex   = 0;
    galleryTitle.textContent = data.name;

    galleryDots.innerHTML = '';
    currentGallery.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'gallery-modal__dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', `Imagen ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      galleryDots.appendChild(dot);
    });

    showSlide(0);
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

  // ---------- Dynamic Time Slots ----------
  const sundayNote  = document.getElementById('sundayNote');
  const timeSelect  = document.getElementById('appointmentTime');

  const timeSlots = {
    weekday:  [
      { v: '10:00', l: '10:00 AM' }, { v: '11:00', l: '11:00 AM' },
      { v: '12:00', l: '12:00 PM' }, { v: '13:00', l: '1:00 PM'  },
      { v: '14:00', l: '2:00 PM'  }, { v: '15:00', l: '3:00 PM'  },
      { v: '16:00', l: '4:00 PM'  }, { v: '17:00', l: '5:00 PM'  },
      { v: '18:00', l: '6:00 PM'  }, { v: '19:00', l: '7:00 PM'  },
      { v: '20:00', l: '8:00 PM'  },
    ],
    saturday: [
      { v: '09:30', l: '9:30 AM'  }, { v: '10:00', l: '10:00 AM' },
      { v: '11:00', l: '11:00 AM' }, { v: '12:00', l: '12:00 PM' },
      { v: '13:00', l: '1:00 PM'  }, { v: '14:00', l: '2:00 PM'  },
      { v: '15:00', l: '3:00 PM'  }, { v: '16:00', l: '4:00 PM'  },
      { v: '17:00', l: '5:00 PM'  },
    ],
    sunday:   [
      { v: '10:00', l: '10:00 AM' }, { v: '11:00', l: '11:00 AM' },
      { v: '12:00', l: '12:00 PM' }, { v: '13:00', l: '1:00 PM'  },
      { v: '14:00', l: '2:00 PM'  },
    ],
  };

  const dayLabels = {
    weekday:  'Lunes a Viernes  •  10:00 AM – 8:00 PM',
    saturday: 'Sábado  •  9:30 AM – 6:00 PM',
    sunday:   'Domingo  •  Solo Masajes con Cita Previa',
  };

  function updateTimeOptions(dayOfWeek) {
    if (!timeSelect) return;
    const key = dayOfWeek === 0 ? 'sunday' : dayOfWeek === 6 ? 'saturday' : 'weekday';
    timeSelect.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = ''; ph.disabled = true; ph.selected = true;
    ph.textContent = 'Selecciona un horario';
    timeSelect.appendChild(ph);
    const grp = document.createElement('optgroup');
    grp.label = dayLabels[key];
    timeSlots[key].forEach(({ v, l }) => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = l;
      grp.appendChild(opt);
    });
    timeSelect.appendChild(grp);
  }

  if (dateInput) {
    dateInput.addEventListener('change', () => {
      const d = new Date(dateInput.value + 'T12:00:00');
      const day = d.getDay();
      if (sundayNote) sundayNote.classList.toggle('visible', day === 0);
      updateTimeOptions(day);
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
});
