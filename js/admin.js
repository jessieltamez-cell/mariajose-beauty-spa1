/* ============================================
   Panel de Administración - Maria José Beauty & Spa
   ============================================ */

// ─── Seguridad: escapar HTML para prevenir XSS ───
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const ITEMS_PER_PAGE = 25;
const COMISION_PCT   = 0.13;

let currentPage  = 0;
let totalCitas   = 0;
let filtros      = { fechaInicio: '', fechaFin: '', estado: '', empleada: '' };
let modalCitaId  = null;
let modalCobroId = null;
let modalEmpleadaId = null;

// ─── Vista (lista | calendario) ──────────────
let currentView  = 'lista';
let calYear      = new Date().getFullYear();
let calMonth     = new Date().getMonth();
let calendarData = {};

// ─── Navegación de secciones ─────────────────
document.querySelectorAll('.admin-nav__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const sec = btn.dataset.section;
    document.querySelectorAll('.admin-nav__btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('sectionHoy').style.display           = sec === 'hoy'           ? '' : 'none';
    document.getElementById('sectionCitas').style.display         = sec === 'citas'         ? '' : 'none';
    document.getElementById('sectionDisponibilidad').style.display= sec === 'disponibilidad'? '' : 'none';
    document.getElementById('sectionFinanzas').style.display      = sec === 'finanzas'      ? '' : 'none';
    document.getElementById('sectionClientes').style.display      = sec === 'clientes'      ? '' : 'none';
    if (sec === 'finanzas')       iniciarFinanzas();
    if (sec === 'disponibilidad') iniciarDisponibilidad();
    if (sec === 'hoy')            { cargarAgendaHoy(); cargarMetricasDashboard(); }
    if (sec === 'clientes')       cargarClientes();
  });
});

// ─── Auth ───────────────────────────────────────
async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    mostrarPanel();
  } else {
    mostrarLogin();
  }
}

function mostrarLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('adminPage').style.display = 'none';
}

function mostrarPanel() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('adminPage').style.display = 'block';
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();

  // Abrir en sección Hoy por defecto
  document.querySelectorAll('.admin-nav__btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-section="hoy"]').classList.add('active');
  document.getElementById('sectionHoy').style.display           = '';
  document.getElementById('sectionCitas').style.display         = 'none';
  document.getElementById('sectionDisponibilidad').style.display= 'none';
  document.getElementById('sectionFinanzas').style.display      = 'none';
  document.getElementById('sectionClientes').style.display      = 'none';
  cargarAgendaHoy();
  cargarMetricasDashboard();
  suscribirNuevasCitas();
}

// ─── Rate limiting login (cliente) ───────────
let _loginAttempts = 0;
let _loginLockedUntil = 0;

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const btn      = document.getElementById('btnLogin');
  const errEl    = document.getElementById('loginError');

  // Bloqueo temporal tras 5 intentos fallidos
  const ahora = Date.now();
  if (_loginLockedUntil > ahora) {
    const seg = Math.ceil((_loginLockedUntil - ahora) / 1000);
    errEl.textContent = `Demasiados intentos. Espera ${seg}s.`;
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Ingresando...';
  errEl.style.display = 'none';

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    _loginAttempts++;
    if (_loginAttempts >= 5) {
      _loginLockedUntil = Date.now() + 60_000; // 60 segundos
      _loginAttempts = 0;
      errEl.textContent = 'Demasiados intentos. Espera 60 segundos.';
    } else {
      errEl.textContent = 'Credenciales incorrectas. Intenta de nuevo.';
    }
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Ingresar';
  } else {
    _loginAttempts = 0;
    _loginLockedUntil = 0;
    mostrarPanel();
  }
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  mostrarLogin();
});

// ─── Switch de vista ─────────────────────────
function switchView(view) {
  currentView = view;
  const tableWrap  = document.querySelector('.table-wrap');
  const calView    = document.getElementById('calendarView');
  const pagination = document.querySelector('.pagination');

  document.querySelectorAll('.view-toggle__btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'lista') {
    tableWrap.style.display  = '';
    pagination.style.display = '';
    calView.style.display    = 'none';
    cargarCitas();
  } else {
    tableWrap.style.display  = 'none';
    pagination.style.display = 'none';
    calView.style.display    = '';
    cargarCalendario();
  }
}

document.getElementById('viewToggle').addEventListener('click', (e) => {
  const btn = e.target.closest('.view-toggle__btn');
  if (btn && btn.dataset.view !== currentView) switchView(btn.dataset.view);
});

// ─── Cargar Citas (lista) ────────────────────
async function cargarCitas(resetPage = false) {
  if (resetPage) currentPage = 0;

  let query = supabaseClient
    .from('citas')
    .select('*', { count: 'exact' })
    .order('fecha', { ascending: false })
    .order('hora', { ascending: true })
    .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1);

  if (filtros.fechaInicio) query = query.gte('fecha', filtros.fechaInicio);
  if (filtros.fechaFin)    query = query.lte('fecha', filtros.fechaFin);
  if (filtros.estado)      query = query.eq('estado', filtros.estado);
  if (filtros.empleada)    query = query.eq('empleada', filtros.empleada);

  const { data, count, error } = await query;

  if (error) {
    console.warn('[admin] load error');
    return;
  }

  totalCitas = count;
  renderTabla(data);
  renderPaginacion();
  actualizarStats();
}

// ─── Renderizar Tabla ────────────────────────
function renderTabla(citas) {
  const tbody = document.getElementById('citasBody');

  if (!citas || citas.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state">
          <strong>Sin citas</strong>
          <p>No hay citas con los filtros seleccionados.</p>
        </div>
      </td></tr>`;
    return;
  }

  // Construir filas via DOM para evitar XSS — NO usar innerHTML con datos del DB
  tbody.innerHTML = '';
  citas.forEach(c => {
    const fecha = new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
    const estadoLabel = {
      pendiente:  'Pendiente',
      confirmada: 'Confirmada',
      completada: 'Completada',
      cancelada:  'Cancelada'
    }[c.estado] || escapeHtml(c.estado);

    const disabledConf = (c.estado === 'confirmada' || c.estado === 'completada');
    const disabledCanc = (c.estado === 'cancelada'  || c.estado === 'completada');
    const disabledComp = c.estado === 'completada';

    const tr = document.createElement('tr');

    // Fecha
    const tdFecha = document.createElement('td');
    tdFecha.textContent = fecha;
    tr.appendChild(tdFecha);

    // Hora
    const tdHora = document.createElement('td');
    tdHora.textContent = c.hora || '';
    tr.appendChild(tdHora);

    // Nombre + email
    const tdNombre = document.createElement('td');
    const strong = document.createElement('strong');
    strong.textContent = c.nombre || '';
    const br = document.createElement('br');
    const small = document.createElement('small');
    small.style.color = 'var(--c-gray-lt)';
    small.textContent = c.email || '';
    tdNombre.appendChild(strong);
    tdNombre.appendChild(br);
    tdNombre.appendChild(small);
    tr.appendChild(tdNombre);

    // Teléfono
    const tdTel = document.createElement('td');
    const aTel = document.createElement('a');
    aTel.href = `tel:${encodeURIComponent(c.telefono || '')}`;
    aTel.style.color = 'var(--c-principal)';
    aTel.textContent = c.telefono || '';
    tdTel.appendChild(aTel);
    tr.appendChild(tdTel);

    // Servicio
    const tdServ = document.createElement('td');
    tdServ.style.cssText = 'max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    tdServ.textContent = c.servicio || '';
    tr.appendChild(tdServ);

    // Empleada
    const tdEmpl = document.createElement('td');
    if (c.empleada) {
      const badge = document.createElement('span');
      badge.className = 'empleada-badge';
      badge.textContent = c.empleada;
      tdEmpl.appendChild(badge);
    } else {
      const btnAsig = document.createElement('button');
      btnAsig.className = 'btn-asignar';
      btnAsig.textContent = 'Asignar';
      btnAsig.addEventListener('click', () => abrirModalEmpleada(c.id, ''));
      tdEmpl.appendChild(btnAsig);
    }
    tr.appendChild(tdEmpl);

    // Estado badge
    const tdEstado = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge badge--${c.estado}`;
    badge.textContent = estadoLabel;
    tdEstado.appendChild(badge);
    tr.appendChild(tdEstado);

    // Monto
    const tdMonto = document.createElement('td');
    if (c.monto) {
      const span = document.createElement('span');
      span.className = `monto-cell ${c.metodo_pago === 'tarjeta' ? 'monto-cell--tarjeta' : 'monto-cell--efectivo'}`;
      span.textContent = `$${Number(c.monto).toLocaleString('es-MX')} `;
      const icon = document.createElement('span');
      icon.className = 'metodo-icon';
      icon.textContent = c.metodo_pago === 'tarjeta' ? '💳' : '💵';
      span.appendChild(icon);
      tdMonto.appendChild(span);
    } else {
      tdMonto.textContent = '—';
    }
    tr.appendChild(tdMonto);

    // Acciones — event listeners en lugar de onclick inline
    const tdActions = document.createElement('td');
    const div = document.createElement('div');
    div.className = 'actions-cell';

    const btnConf = document.createElement('button');
    btnConf.className = 'btn-confirmar';
    btnConf.textContent = 'Confirmar';
    btnConf.disabled = disabledConf;
    btnConf.addEventListener('click', () => confirmarCita(c.id, c.nombre, c.telefono, c.servicio, c.fecha, c.hora));

    const btnComp = document.createElement('button');
    btnComp.className = 'btn-completar';
    btnComp.textContent = 'Completar';
    btnComp.disabled = disabledComp;
    btnComp.addEventListener('click', () => abrirCobro(c.id, c.servicio));

    const btnCanc = document.createElement('button');
    btnCanc.className = 'btn-cancelar';
    btnCanc.textContent = 'Cancelar';
    btnCanc.disabled = disabledCanc;
    btnCanc.addEventListener('click', () => cambiarEstado(c.id, 'cancelada'));

    const btnNota = document.createElement('button');
    btnNota.className = 'btn-notas';
    btnNota.textContent = 'Nota';
    btnNota.addEventListener('click', () => abrirNotas(c.id, c.notas || ''));

    const aWa = document.createElement('a');
    aWa.className = 'btn-wa-inline';
    aWa.href = waClienteUrl(c.telefono, c.nombre, c.servicio, c.fecha, c.hora);
    aWa.target = '_blank';
    aWa.rel = 'noopener noreferrer';
    aWa.title = 'WhatsApp cliente';
    aWa.innerHTML = WA_SVG;

    const btnElim = document.createElement('button');
    btnElim.className = 'btn-eliminar';
    btnElim.title = 'Eliminar cita';
    btnElim.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>';
    btnElim.addEventListener('click', () => eliminarCita(c.id, c.nombre));

    div.appendChild(btnConf);
    div.appendChild(btnComp);
    div.appendChild(btnCanc);
    div.appendChild(btnNota);
    div.appendChild(aWa);
    div.appendChild(btnElim);
    tdActions.appendChild(div);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

// ─── Cambiar Estado ──────────────────────────
async function cambiarEstado(id, nuevoEstado, campos = {}, skipReload = false) {
  const { error } = await supabaseClient
    .from('citas')
    .update({ estado: nuevoEstado, ...campos })
    .eq('id', id);

  if (error) {
    alert('Error al actualizar: ' + error.message);
    return false;
  }
  if (!skipReload) {
    cargarCitas();
    actualizarStats();
  }
  return true;
}

// ─── Eliminar Cita ───────────────────────────
async function eliminarCita(id, nombre) {
  if (!confirm(`¿Eliminar la cita de ${nombre}? Esta acción no se puede deshacer.`)) return;
  const { error } = await supabaseClient.from('citas').delete().eq('id', id);
  if (error) { alert('Error al eliminar: ' + error.message); return; }
  cargarCitas();
  actualizarStats();
}

// ─── WhatsApp cliente ────────────────────────
function waClienteUrl(telefono, nombre, servicio, fecha, hora) {
  const tel = (telefono || '').replace(/\D/g, '');
  const fechaFmt = (() => {
    const partes = (fecha || '').split('-').map(Number);
    if (partes.length < 3 || !partes[0]) return fecha || '';
    return new Date(partes[0], partes[1] - 1, partes[2])
      .toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  })();
  const msg = encodeURIComponent(
    `Hola ${nombre}, te contactamos de Maria José Beauty & Spa.\n` +
    `Tu cita: *${servicio}* el ${fechaFmt.charAt(0).toUpperCase() + fechaFmt.slice(1)} a las *${hora}*.\n` +
    `¿Tienes alguna pregunta?`
  );
  return `https://wa.me/52${tel}?text=${msg}`;
}

const WA_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.099 1.51 5.823L.057 23.855a.5.5 0 0 0 .609.609l6.094-1.46A11.933 11.933 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.013-1.376l-.36-.213-3.72.893.907-3.625-.234-.373A9.818 9.818 0 1 1 12 21.818z"/></svg>`;

// ─── Confirmar + WhatsApp ─────────────────────
async function confirmarCita(id, nombre, telefono, servicio, fecha, hora) {
  const ok = await cambiarEstado(id, 'confirmada');
  if (!ok) return;

  const tel = (telefono || '').replace(/\D/g, '');
  const fechaFmt = (() => {
    const [y, m, d] = fecha.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  })();
  const msg = encodeURIComponent(
    `Hola ${nombre} 💅✨ Tu cita para *${servicio}* ha sido *confirmada*.\n` +
    `📅 ${fechaFmt.charAt(0).toUpperCase() + fechaFmt.slice(1)} a las *${hora}*.\n` +
    `¡Te esperamos en Maria José Beauty & Spa! 🌸`
  );
  const waUrl = `https://wa.me/52${tel}?text=${msg}`;

  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast toast--wa';
  toast.innerHTML = `
    <div class="toast__title">✅ Cita confirmada — ${nombre}</div>
    <div class="toast__body">${servicio} · ${hora}</div>
    <a class="toast__wa-btn" href="${waUrl}" target="_blank" rel="noopener noreferrer">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.099 1.51 5.823L.057 23.855a.5.5 0 0 0 .609.609l6.094-1.46A11.933 11.933 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.013-1.376l-.36-.213-3.72.893.907-3.625-.234-.373A9.818 9.818 0 1 1 12 21.818z"/></svg>
      Avisar por WhatsApp
    </a>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 10000);
}

// ─── Modal Cobro ─────────────────────────────
function abrirCobro(id, servicio) {
  modalCobroId = id;
  document.getElementById('cobroSubtitle').textContent = servicio;
  document.getElementById('cobroMonto').value = '';
  document.getElementById('cobroComisionVal').textContent = '$0.00';
  document.querySelector('input[name="metodoPago"][value="efectivo"]').checked = true;
  document.getElementById('modalCobro').classList.add('open');
}

document.getElementById('cobroMonto').addEventListener('input', () => {
  const monto = parseFloat(document.getElementById('cobroMonto').value) || 0;
  const comision = monto * COMISION_PCT;
  document.getElementById('cobroComisionVal').textContent = `$${comision.toFixed(2)}`;
});

document.getElementById('btnGuardarCobro').addEventListener('click', async () => {
  const monto     = parseFloat(document.getElementById('cobroMonto').value);
  const metodo    = document.querySelector('input[name="metodoPago"]:checked').value;

  if (!monto || monto <= 0) {
    alert('Ingresa un monto válido.');
    return;
  }

  const ok = await cambiarEstado(modalCobroId, 'completada', { monto, metodo_pago: metodo });
  if (!ok) return;
  cerrarModalCobro();
  mostrarToast('Cita completada', `Monto: $${monto.toLocaleString('es-MX')} · ${metodo}`);
});

document.getElementById('btnCerrarCobro').addEventListener('click', cerrarModalCobro);
document.getElementById('btnCancelarCobro').addEventListener('click', cerrarModalCobro);
document.getElementById('modalCobro').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalCobro')) cerrarModalCobro();
});

function cerrarModalCobro() {
  document.getElementById('modalCobro').classList.remove('open');
  modalCobroId = null;
}

// ─── Modal Asignar Empleada ──────────────────
function abrirModalEmpleada(id, empleadaActual) {
  modalEmpleadaId = id;
  document.getElementById('empleadaModalSelect').value = empleadaActual || '';
  document.getElementById('modalEmpleada').classList.add('open');
}

document.getElementById('btnGuardarEmpleada').addEventListener('click', async () => {
  const empleada = document.getElementById('empleadaModalSelect').value;
  const { error } = await supabaseClient
    .from('citas')
    .update({ empleada })
    .eq('id', modalEmpleadaId);

  if (error) { alert('Error: ' + error.message); return; }
  cerrarModalEmpleada();
  cargarCitas();
});

document.getElementById('btnCancelarEmpleada').addEventListener('click', cerrarModalEmpleada);
document.getElementById('modalEmpleada').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalEmpleada')) cerrarModalEmpleada();
});

function cerrarModalEmpleada() {
  document.getElementById('modalEmpleada').classList.remove('open');
  modalEmpleadaId = null;
}

// ─── Modal Notas ─────────────────────────────
function abrirNotas(id, notasActuales) {
  modalCitaId = id;
  document.getElementById('notasTextarea').value = notasActuales;
  document.getElementById('modalNotas').classList.add('open');
}

document.getElementById('btnGuardarNota').addEventListener('click', async () => {
  const notas = document.getElementById('notasTextarea').value.trim();
  const { error } = await supabaseClient
    .from('citas')
    .update({ notas })
    .eq('id', modalCitaId);

  if (error) { alert('Error al guardar nota: ' + error.message); return; }
  cerrarModal();
  if (currentView === 'lista') cargarCitas();
  else cargarCalendario();
});

document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);
document.getElementById('modalNotas').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalNotas')) cerrarModal();
});

function cerrarModal() {
  document.getElementById('modalNotas').classList.remove('open');
  modalCitaId = null;
}

// ─── Paginación ──────────────────────────────
function renderPaginacion() {
  const totalPages = Math.ceil(totalCitas / ITEMS_PER_PAGE);
  const container  = document.getElementById('paginacion');
  const info       = document.getElementById('paginacionInfo');

  const desde = currentPage * ITEMS_PER_PAGE + 1;
  const hasta = Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalCitas);
  info.textContent = totalCitas > 0 ? `${desde}–${hasta} de ${totalCitas} citas` : '0 citas';

  container.innerHTML = '';

  const btnPrev = document.createElement('button');
  btnPrev.className = 'btn-page';
  btnPrev.textContent = '← Anterior';
  btnPrev.disabled = currentPage === 0;
  btnPrev.addEventListener('click', () => { currentPage--; cargarCitas(); });
  container.appendChild(btnPrev);

  for (let i = 0; i < totalPages && totalPages <= 7; i++) {
    const btn = document.createElement('button');
    btn.className = 'btn-page' + (i === currentPage ? ' active' : '');
    btn.textContent = i + 1;
    btn.addEventListener('click', () => { currentPage = i; cargarCitas(); });
    container.appendChild(btn);
  }

  const btnNext = document.createElement('button');
  btnNext.className = 'btn-page';
  btnNext.textContent = 'Siguiente →';
  btnNext.disabled = currentPage >= totalPages - 1;
  btnNext.addEventListener('click', () => { currentPage++; cargarCitas(); });
  container.appendChild(btnNext);
}

// ─── Stats ───────────────────────────────────
async function actualizarStats() {
  const { data } = await supabaseClient.from('citas').select('estado');
  if (!data) return;

  const total      = data.length;
  const pendientes  = data.filter(c => c.estado === 'pendiente').length;
  const confirmadas = data.filter(c => c.estado === 'confirmada').length;
  const completadas = data.filter(c => c.estado === 'completada').length;
  const canceladas  = data.filter(c => c.estado === 'cancelada').length;

  document.getElementById('statTotal').textContent      = total;
  document.getElementById('statPendientes').textContent  = pendientes;
  document.getElementById('statConfirmadas').textContent = confirmadas;
  document.getElementById('statCompletadas').textContent = completadas;
  document.getElementById('statCanceladas').textContent  = canceladas;

  const statCards = [
    { el: document.getElementById('statTotal'),       estado: '' },
    { el: document.getElementById('statPendientes'),  estado: 'pendiente' },
    { el: document.getElementById('statConfirmadas'), estado: 'confirmada' },
    { el: document.getElementById('statCompletadas'), estado: 'completada' },
    { el: document.getElementById('statCanceladas'),  estado: 'cancelada' },
  ];

  statCards.forEach(({ el, estado }) => {
    const card = el.closest('.stat-card');
    if (card.dataset.bound) return;
    card.dataset.bound = '1';
    card.classList.add('stat-card--clickable');
    card.addEventListener('click', () => {
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('stat-card--active'));
      card.classList.add('stat-card--active');
      filtros.estado = estado;
      document.getElementById('filtroEstado').value = estado;
      if (currentView === 'lista') cargarCitas(true);
      else cargarCalendario();
    });
  });
}

// ─── Filtros ─────────────────────────────────
document.getElementById('btnFiltrar').addEventListener('click', () => {
  filtros.fechaInicio = document.getElementById('filtroFechaInicio').value;
  filtros.fechaFin    = document.getElementById('filtroFechaFin').value;
  filtros.estado      = document.getElementById('filtroEstado').value;
  filtros.empleada    = document.getElementById('filtroEmpleada').value;
  document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('stat-card--active'));
  if (currentView === 'lista') cargarCitas(true);
  else cargarCalendario();
});

document.getElementById('btnLimpiar').addEventListener('click', () => {
  filtros = { fechaInicio: '', fechaFin: '', estado: '', empleada: '' };
  document.getElementById('filtroFechaInicio').value = '';
  document.getElementById('filtroFechaFin').value    = '';
  document.getElementById('filtroEstado').value      = '';
  document.getElementById('filtroEmpleada').value    = '';
  document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('stat-card--active'));
  if (currentView === 'lista') cargarCitas(true);
  else cargarCalendario();
});

// ─── Calendario: Cargar datos ────────────────
async function cargarCalendario() {
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const lastOfMonth  = new Date(calYear, calMonth + 1, 0);

  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(lastOfMonth.getDate() + (6 - lastOfMonth.getDay()));

  const fechaInicio = gridStart.toISOString().slice(0, 10);
  const fechaFin    = gridEnd.toISOString().slice(0, 10);

  let query = supabaseClient
    .from('citas')
    .select('id, nombre, servicio, telefono, hora, estado, notas, fecha, empleada, monto, metodo_pago')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('hora', { ascending: true });

  if (filtros.estado)   query = query.eq('estado', filtros.estado);
  if (filtros.empleada) query = query.eq('empleada', filtros.empleada);

  const { data, error } = await query;
  if (error) { console.warn('[admin] calendar error'); return; }

  calendarData = {};
  (data || []).forEach(c => {
    if (!calendarData[c.fecha]) calendarData[c.fecha] = [];
    calendarData[c.fecha].push(c);
  });

  renderCalendario();
}

// ─── Calendario: Renderizar ──────────────────
function renderCalendario() {
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('calNavTitle').textContent = `${MESES[calMonth]} ${calYear}`;

  const grid    = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  const todayStr     = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const lastOfMonth  = new Date(calYear, calMonth + 1, 0);

  const cursor = new Date(firstOfMonth);
  cursor.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  for (let i = 0; i < 42; i++) {
    const dateStr    = cursor.toISOString().slice(0, 10);
    const citas      = calendarData[dateStr] || [];
    const isToday    = dateStr === todayStr;
    const otherMonth = cursor.getMonth() !== calMonth;

    const cell = document.createElement('div');
    cell.className = [
      'cal-day',
      isToday    ? 'cal-day--today'       : '',
      otherMonth ? 'cal-day--other-month' : '',
      citas.length > 0 ? 'cal-day--has-events' : '',
    ].filter(Boolean).join(' ');
    cell.dataset.date = dateStr;

    const numEl = document.createElement('div');
    numEl.className = 'cal-day__num';
    numEl.textContent = cursor.getDate();
    cell.appendChild(numEl);

    const MAX_VISIBLE = 3;
    citas.slice(0, MAX_VISIBLE).forEach(c => {
      const ev = document.createElement('span');
      ev.className = `cal-event cal-event--${c.estado}`;
      ev.textContent = `${(c.hora || '').slice(0, 5)} ${c.nombre}`;
      cell.appendChild(ev);
    });

    if (citas.length > MAX_VISIBLE) {
      const more = document.createElement('div');
      more.className = 'cal-day__more';
      more.textContent = `+${citas.length - MAX_VISIBLE} más`;
      cell.appendChild(more);
    }

    if (citas.length > 0) {
      const snapshot = [...citas];
      cell.addEventListener('click', () => abrirModalDia(dateStr, snapshot));
    }

    grid.appendChild(cell);
    cursor.setDate(cursor.getDate() + 1);
  }
}

// ─── Calendario: Navegación ──────────────────
function navCalendario(delta) {
  calMonth += delta;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  cargarCalendario();
}

document.getElementById('btnCalPrev').addEventListener('click', () => navCalendario(-1));
document.getElementById('btnCalNext').addEventListener('click', () => navCalendario(+1));
document.getElementById('btnCalHoy').addEventListener('click', () => {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  cargarCalendario();
});

// ─── Modal Día ───────────────────────────────
function abrirModalDia(fechaStr, citas) {
  const [year, month, day] = fechaStr.split('-').map(Number);
  const titulo = new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  document.getElementById('modalDiaTitle').textContent =
    titulo.charAt(0).toUpperCase() + titulo.slice(1);

  const list = document.getElementById('modalDiaList');
  list.innerHTML = citas.map(c => {
    const estadoLabel = {
      pendiente: 'Pendiente', confirmada: 'Confirmada',
      completada: 'Completada', cancelada: 'Cancelada'
    }[c.estado] || c.estado;
    const disabledConf = (c.estado === 'confirmada' || c.estado === 'completada') ? 'disabled' : '';
    const disabledCanc = (c.estado === 'cancelada'  || c.estado === 'completada') ? 'disabled' : '';
    const disabledComp = c.estado === 'completada' ? 'disabled' : '';
    const notasHtml = c.notas ? `<div class="modal-dia__notas">${c.notas}</div>` : '';
    const empleadaHtml = c.empleada ? `<div class="modal-dia__empleada">👩 ${c.empleada}</div>` : '';
    const montoHtml = c.monto
      ? `<div class="modal-dia__monto">${c.metodo_pago === 'tarjeta' ? '💳' : '💵'} $${Number(c.monto).toLocaleString('es-MX')}</div>`
      : '';
    return `
      <div class="modal-dia__item">
        <div class="modal-dia__time">
          ${(c.hora || '').slice(0, 5)}
          <span class="badge badge--${c.estado}">${estadoLabel}</span>
        </div>
        <div class="modal-dia__name">${c.nombre}</div>
        <div class="modal-dia__info">${c.servicio} · <a href="tel:${c.telefono}" style="color:var(--c-principal)">${c.telefono}</a></div>
        ${empleadaHtml}${montoHtml}${notasHtml}
        <div class="modal-dia__actions">
          <button class="btn-confirmar" ${disabledConf}
            onclick="confirmarCita('${c.id}','${(c.nombre||'').replace(/'/g,"\\'")}','${c.telefono}','${(c.servicio||'').replace(/'/g,"\\'")}','${fechaStr}','${(c.hora||'').slice(0,5)}');cerrarModalDia();cargarCalendario();actualizarStats()">Confirmar</button>
          <button class="btn-completar" ${disabledComp}
            onclick="abrirCobro('${c.id}','${(c.servicio||'').replace(/'/g,"\\'")}');cerrarModalDia()">Completar</button>
          <button class="btn-cancelar" ${disabledCanc}
            onclick="cambiarEstadoCal('${c.id}','cancelada','${fechaStr}')">Cancelar</button>
          <button class="btn-notas"
            onclick="abrirNotas('${c.id}','${(c.notas || '').replace(/'/g,"\\'")}')">Nota</button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('modalDia').classList.add('open');
}

async function cambiarEstadoCal(id, nuevoEstado, fechaStr) {
  const ok = await cambiarEstado(id, nuevoEstado, {}, true);
  if (!ok) return;
  cerrarModalDia();
  await cargarCalendario();
  actualizarStats();
}

document.getElementById('btnCerrarDia').addEventListener('click', cerrarModalDia);
document.getElementById('modalDia').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalDia')) cerrarModalDia();
});

function cerrarModalDia() {
  document.getElementById('modalDia').classList.remove('open');
}

// ─── FINANZAS ────────────────────────────────

function iniciarFinanzas() {
  // Pre-llenar con la semana actual
  setSemanaActual();
  generarCorte();
}

function getSemanaActual() {
  const hoy   = new Date();
  const dia   = hoy.getDay(); // 0=Dom
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return {
    inicio: lunes.toISOString().slice(0, 10),
    fin:    domingo.toISOString().slice(0, 10),
  };
}

function setSemanaActual() {
  const { inicio, fin } = getSemanaActual();
  document.getElementById('finFechaInicio').value = inicio;
  document.getElementById('finFechaFin').value    = fin;
}

document.getElementById('btnSemanaActual').addEventListener('click', () => {
  setSemanaActual();
  generarCorte();
});

document.getElementById('btnGenerarCorte').addEventListener('click', generarCorte);

async function generarCorte() {
  const inicio = document.getElementById('finFechaInicio').value;
  const fin    = document.getElementById('finFechaFin').value;

  // Cargar citas completadas del periodo
  let query = supabaseClient
    .from('citas')
    .select('*')
    .eq('estado', 'completada');

  if (inicio) query = query.gte('fecha', inicio);
  if (fin)    query = query.lte('fecha', fin);

  const { data: citas, error } = await query;
  if (error) { console.warn("[admin] query error"); return; }

  // Cargar egresos del periodo
  let eQuery = supabaseClient.from('egresos').select('*').order('fecha', { ascending: false });
  if (inicio) eQuery = eQuery.gte('fecha', inicio);
  if (fin)    eQuery = eQuery.lte('fecha', fin);

  const { data: egresos } = await eQuery;

  renderFinanzas(citas || [], egresos || []);
}

function renderFinanzas(citas, egresos) {
  // ── Totales de ingresos
  let totalEfectivo = 0, totalTarjeta = 0;
  citas.forEach(c => {
    const m = parseFloat(c.monto) || 0;
    if (c.metodo_pago === 'tarjeta') totalTarjeta += m;
    else totalEfectivo += m;
  });
  const totalIngresos = totalEfectivo + totalTarjeta;

  // ── Totales de egresos
  const totalEgresos = egresos.reduce((s, e) => s + (parseFloat(e.monto) || 0), 0);
  const neto = totalIngresos - totalEgresos;

  document.getElementById('finEfectivo').textContent = `$${totalEfectivo.toLocaleString('es-MX', {minimumFractionDigits:2})}`;
  document.getElementById('finTarjeta').textContent  = `$${totalTarjeta.toLocaleString('es-MX',  {minimumFractionDigits:2})}`;
  document.getElementById('finTotal').textContent    = `$${totalIngresos.toLocaleString('es-MX', {minimumFractionDigits:2})}`;
  document.getElementById('finEgresos').textContent  = `$${totalEgresos.toLocaleString('es-MX',  {minimumFractionDigits:2})}`;

  const netoEl = document.getElementById('finNeto');
  netoEl.textContent = `$${Math.abs(neto).toLocaleString('es-MX', {minimumFractionDigits:2})}`;
  netoEl.style.color = neto >= 0 ? 'var(--c-completada)' : 'var(--c-cancelada)';

  // ── Comisiones por empleada
  const comisiones = {};
  citas.forEach(c => {
    const emp = c.empleada || 'Sin asignar';
    if (!comisiones[emp]) comisiones[emp] = { total: 0, servicios: 0 };
    const m = parseFloat(c.monto) || 0;
    comisiones[emp].total    += m * COMISION_PCT;
    comisiones[emp].servicios += 1;
  });

  const comBody = document.getElementById('comisionesBody');
  const empKeys = Object.keys(comisiones);
  if (empKeys.length === 0) {
    comBody.innerHTML = '<div class="empty-state"><p>Sin servicios completados en este periodo.</p></div>';
  } else {
    comBody.innerHTML = empKeys.map(emp => `
      <div class="comision-row">
        <div class="comision-row__name">${emp}</div>
        <div class="comision-row__detail">${comisiones[emp].servicios} servicio${comisiones[emp].servicios !== 1 ? 's' : ''}</div>
        <div class="comision-row__monto">$${comisiones[emp].total.toLocaleString('es-MX', {minimumFractionDigits:2})}</div>
      </div>`).join('');
  }

  // ── Lista de egresos
  renderEgresos(egresos);

  // ── Detalle de servicios
  const detalleBody = document.getElementById('detalleBody');
  if (citas.length === 0) {
    detalleBody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>Sin servicios completados en este periodo.</p></div></td></tr>';
  } else {
    detalleBody.innerHTML = citas.map(c => {
      const fecha = new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      const monto = parseFloat(c.monto) || 0;
      const comision = monto * COMISION_PCT;
      return `
        <tr>
          <td>${fecha}</td>
          <td>${c.nombre}</td>
          <td style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.servicio}</td>
          <td>${c.empleada || '—'}</td>
          <td><strong>$${monto.toLocaleString('es-MX', {minimumFractionDigits:2})}</strong></td>
          <td><span class="metodo-badge metodo-badge--${c.metodo_pago}">${c.metodo_pago === 'tarjeta' ? '💳 Tarjeta' : '💵 Efectivo'}</span></td>
          <td style="color:var(--c-principal)">$${comision.toLocaleString('es-MX', {minimumFractionDigits:2})}</td>
        </tr>`;
    }).join('');
  }
}

function renderEgresos(egresos) {
  const egBody = document.getElementById('egresosBody');
  if (egresos.length === 0) {
    egBody.innerHTML = '<div class="empty-state"><p>Sin egresos en este periodo.</p></div>';
    return;
  }
  egBody.innerHTML = egresos.map(e => {
    const fecha = new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    return `
      <div class="egreso-row">
        <div class="egreso-row__info">
          <div class="egreso-row__razon">${e.razon}</div>
          <div class="egreso-row__fecha">${fecha}</div>
        </div>
        <div class="egreso-row__monto">-$${parseFloat(e.monto).toLocaleString('es-MX', {minimumFractionDigits:2})}</div>
        <button class="btn-delete-egreso" onclick="eliminarEgreso('${e.id}')">✕</button>
      </div>`;
  }).join('');
}

// ─── Modal Egreso ─────────────────────────────
document.getElementById('btnAgregarEgreso').addEventListener('click', () => {
  document.getElementById('egresoRazon').value = '';
  document.getElementById('egresoMonto').value = '';
  document.getElementById('egresoFecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('modalEgreso').classList.add('open');
});

document.getElementById('btnGuardarEgreso').addEventListener('click', async () => {
  const razon = document.getElementById('egresoRazon').value.trim();
  const monto = parseFloat(document.getElementById('egresoMonto').value);
  const fecha = document.getElementById('egresoFecha').value;

  if (!razon)        { alert('Ingresa la razón del egreso.'); return; }
  if (!monto || monto <= 0) { alert('Ingresa un monto válido.'); return; }
  if (!fecha)        { alert('Selecciona una fecha.'); return; }

  const { error } = await supabaseClient.from('egresos').insert([{ razon, monto, fecha }]);
  if (error) { alert('Error: ' + error.message); return; }

  cerrarModalEgreso();
  mostrarToast('Egreso registrado', `${razon}: $${monto.toLocaleString('es-MX')}`);
  generarCorte();
});

document.getElementById('btnCancelarEgreso').addEventListener('click', cerrarModalEgreso);
document.getElementById('modalEgreso').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalEgreso')) cerrarModalEgreso();
});

function cerrarModalEgreso() {
  document.getElementById('modalEgreso').classList.remove('open');
}

async function eliminarEgreso(id) {
  if (!confirm('¿Eliminar este egreso?')) return;
  const { error } = await supabaseClient.from('egresos').delete().eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  generarCorte();
}

// ─── DISPONIBILIDAD ──────────────────────────

const EMPLEADAS_ACTIVAS = [
  'Daniela Loera', 'Anette Constantino',
  'Yuliana Pérez', 'Dafne Adame', 'Perla Tobías'
];

// Mapa servicio → empleadas (mismo que en el formulario)
const EMPLEADAS_POR_SERVICIO_ADMIN = {
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

let disponSemanaOffset = 0; // semanas desde hoy

function iniciarDisponibilidad() {
  disponSemanaOffset = 0;
  cargarBloqueos();
  renderDisponSemana();
}

// ── Semana actual con offset ─────────────────
function getSemanaConOffset(offset) {
  const hoy   = new Date();
  const dia   = hoy.getDay();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1) + offset * 7);
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    dias.push(d);
  }
  return dias;
}

// ── Bloqueos: cargar y renderizar ───────────
async function cargarBloqueos() {
  const [diasRes, empRes, horasRes] = await Promise.all([
    supabaseClient.from('dias_bloqueados').select('*').order('fecha', { ascending: true }),
    supabaseClient.from('empleadas_bloqueadas').select('*').order('fecha', { ascending: true }),
    supabaseClient.from('horarios_bloqueados').select('*').order('fecha', { ascending: true }).order('hora', { ascending: true }),
  ]);

  renderListaDias(diasRes.data    || []);
  renderListaEmpleadas(empRes.data || []);
  renderListaHoras(horasRes.data  || []);
}

function renderListaDias(lista) {
  const el = document.getElementById('listaDiasBloqueados');
  if (lista.length === 0) {
    el.innerHTML = '<div class="empty-state"><p>Sin días bloqueados.</p></div>';
    return;
  }
  el.innerHTML = lista.map(b => {
    const fecha = new Date(b.fecha + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    return `
      <div class="bloqueo-row">
        <div class="bloqueo-row__info">
          <div class="bloqueo-row__fecha">${fecha.charAt(0).toUpperCase() + fecha.slice(1)}</div>
          ${b.motivo ? `<div class="bloqueo-row__motivo">${b.motivo}</div>` : ''}
        </div>
        <button class="btn-delete-egreso" onclick="eliminarBloqueoDia('${b.id}')">✕</button>
      </div>`;
  }).join('');
}

function renderListaEmpleadas(lista) {
  const el = document.getElementById('listaEmpleadasBloqueadas');
  if (lista.length === 0) {
    el.innerHTML = '<div class="empty-state"><p>Sin bloqueos de empleadas.</p></div>';
    return;
  }
  el.innerHTML = lista.map(b => {
    const fecha = new Date(b.fecha + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
    return `
      <div class="bloqueo-row">
        <div class="bloqueo-row__info">
          <div class="bloqueo-row__fecha">${b.empleada}</div>
          <div class="bloqueo-row__motivo">${fecha}${b.motivo ? ' · ' + b.motivo : ''}</div>
        </div>
        <button class="btn-delete-egreso" onclick="eliminarBloqueoEmpleada('${b.id}')">✕</button>
      </div>`;
  }).join('');
}

const HORA_LABELS_ADMIN = {
  '09:30':'9:30 AM','10:00':'10:00 AM','11:00':'11:00 AM','12:00':'12:00 PM',
  '13:00':'1:00 PM','14:00':'2:00 PM','15:00':'3:00 PM','16:00':'4:00 PM',
  '17:00':'5:00 PM','18:00':'6:00 PM','19:00':'7:00 PM','20:00':'8:00 PM',
};

function renderListaHoras(lista) {
  const el = document.getElementById('listaHorasBloqueadas');
  if (lista.length === 0) {
    el.innerHTML = '<div class="empty-state"><p>Sin horarios bloqueados.</p></div>';
    return;
  }
  el.innerHTML = lista.map(b => {
    const fecha = new Date(b.fecha + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
    const horaLabel = HORA_LABELS_ADMIN[b.hora] || b.hora;
    return `
      <div class="bloqueo-row">
        <div class="bloqueo-row__info">
          <div class="bloqueo-row__fecha">${fecha} — <strong>${horaLabel}</strong></div>
          ${b.motivo ? `<div class="bloqueo-row__motivo">${b.motivo}</div>` : ''}
        </div>
        <button class="btn-delete-egreso" onclick="eliminarBloqueoHora('${b.id}')">✕</button>
      </div>`;
  }).join('');
}

// ── Agregar bloqueo de día ───────────────────
document.getElementById('btnBloquearDia').addEventListener('click', async () => {
  const fecha  = document.getElementById('bloqueoFecha').value;
  const motivo = document.getElementById('bloqueoMotivo').value.trim();
  if (!fecha) { alert('Selecciona una fecha.'); return; }

  const { error } = await supabaseClient
    .from('dias_bloqueados')
    .insert([{ fecha, motivo: motivo || null }]);

  if (error) { alert('Error: ' + error.message); return; }
  document.getElementById('bloqueoFecha').value  = '';
  document.getElementById('bloqueoMotivo').value = '';
  mostrarToast('Día bloqueado', fecha);
  cargarBloqueos();
  renderDisponSemana();
});

// ── Agregar bloqueo de empleada ──────────────
document.getElementById('btnBloquearEmpleada').addEventListener('click', async () => {
  const empleada = document.getElementById('bloqueoEmpleada').value;
  const fecha    = document.getElementById('bloqueoEmpleadaFecha').value;
  const motivo   = document.getElementById('bloqueoEmpleadaMotivo').value.trim();
  if (!empleada) { alert('Selecciona una empleada.'); return; }
  if (!fecha)    { alert('Selecciona una fecha.'); return; }

  const { error } = await supabaseClient
    .from('empleadas_bloqueadas')
    .insert([{ empleada, fecha, motivo: motivo || null }]);

  if (error) { alert('Error: ' + error.message); return; }
  document.getElementById('bloqueoEmpleada').value      = '';
  document.getElementById('bloqueoEmpleadaFecha').value = '';
  document.getElementById('bloqueoEmpleadaMotivo').value= '';
  mostrarToast('Empleada bloqueada', `${empleada} — ${fecha}`);
  cargarBloqueos();
  renderDisponSemana();
});

// ── Seleccionar / deseleccionar todos ────────
document.getElementById('btnSelTodos').addEventListener('click', () => {
  document.querySelectorAll('input[name="horaBloqueo"]').forEach(cb => cb.checked = true);
});
document.getElementById('btnDeselTodos').addEventListener('click', () => {
  document.querySelectorAll('input[name="horaBloqueo"]').forEach(cb => cb.checked = false);
});

// ── Agregar bloqueo de horario (múltiple) ────
document.getElementById('btnBloquearHora').addEventListener('click', async () => {
  const fecha  = document.getElementById('bloqueoHoraFecha').value;
  const motivo = document.getElementById('bloqueoHoraMotivo').value.trim();
  const horas  = [...document.querySelectorAll('input[name="horaBloqueo"]:checked')].map(cb => cb.value);

  if (!fecha)          { alert('Selecciona una fecha.'); return; }
  if (horas.length === 0) { alert('Selecciona al menos un horario.'); return; }

  const registros = horas.map(hora => ({ fecha, hora, motivo: motivo || null }));

  const btn = document.getElementById('btnBloquearHora');
  btn.disabled = true;
  btn.textContent = 'Bloqueando...';

  const { error } = await supabaseClient
    .from('horarios_bloqueados')
    .insert(registros);

  btn.disabled = false;
  btn.textContent = 'Bloquear seleccionados';

  if (error) { alert('Error: ' + error.message); return; }

  document.getElementById('bloqueoHoraFecha').value  = '';
  document.getElementById('bloqueoHoraMotivo').value = '';
  document.querySelectorAll('input[name="horaBloqueo"]').forEach(cb => cb.checked = false);

  const horasLabel = horas.map(h => HORA_LABELS_ADMIN[h] || h).join(', ');
  mostrarToast(`${horas.length} horario${horas.length > 1 ? 's' : ''} bloqueado${horas.length > 1 ? 's' : ''}`, `${fecha} — ${horasLabel}`);
  cargarBloqueos();
  renderDisponSemana();
});

// ── Eliminar bloqueos ────────────────────────
async function eliminarBloqueoDia(id) {
  if (!confirm('¿Desbloquear este día?')) return;
  await supabaseClient.from('dias_bloqueados').delete().eq('id', id);
  cargarBloqueos();
  renderDisponSemana();
}

async function eliminarBloqueoEmpleada(id) {
  if (!confirm('¿Quitar este bloqueo?')) return;
  await supabaseClient.from('empleadas_bloqueadas').delete().eq('id', id);
  cargarBloqueos();
  renderDisponSemana();
}

async function eliminarBloqueoHora(id) {
  if (!confirm('¿Desbloquear este horario?')) return;
  await supabaseClient.from('horarios_bloqueados').delete().eq('id', id);
  cargarBloqueos();
  renderDisponSemana();
}

// ── Vista semanal de disponibilidad ─────────
document.getElementById('btnSemPrev').addEventListener('click', () => { disponSemanaOffset--; renderDisponSemana(); });
document.getElementById('btnSemNext').addEventListener('click', () => { disponSemanaOffset++; renderDisponSemana(); });
document.getElementById('btnSemHoy').addEventListener('click', () => { disponSemanaOffset = 0; renderDisponSemana(); });

async function renderDisponSemana() {
  const dias = getSemanaConOffset(disponSemanaOffset);
  const inicio = dias[0].toISOString().slice(0, 10);
  const fin    = dias[6].toISOString().slice(0, 10);

  // Label de semana
  const label = document.getElementById('disponSemanaLabel');
  const fmt = d => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  label.textContent = `${fmt(dias[0])} — ${fmt(dias[6])}`;

  // Traer citas de la semana (confirmadas + pendientes)
  const { data: citas } = await supabaseClient
    .from('citas')
    .select('fecha, hora, empleada, estado')
    .gte('fecha', inicio)
    .lte('fecha', fin)
    .in('estado', ['pendiente', 'confirmada']);

  // Traer bloqueos de la semana
  const [diasBloqRes, empBloqRes, horasBloqRes] = await Promise.all([
    supabaseClient.from('dias_bloqueados').select('fecha').gte('fecha', inicio).lte('fecha', fin),
    supabaseClient.from('empleadas_bloqueadas').select('fecha, empleada').gte('fecha', inicio).lte('fecha', fin),
    supabaseClient.from('horarios_bloqueados').select('fecha, hora').gte('fecha', inicio).lte('fecha', fin),
  ]);

  const diasBloqSet = new Set((diasBloqRes.data || []).map(b => b.fecha));
  const empBloqMap  = {}; // fecha → Set de empleadas bloqueadas
  (empBloqRes.data || []).forEach(b => {
    if (!empBloqMap[b.fecha]) empBloqMap[b.fecha] = new Set();
    empBloqMap[b.fecha].add(b.empleada);
  });
  const horasBloqSet = new Set((horasBloqRes.data || []).map(b => `${b.fecha}|${b.hora}`));

  // Citas agrupadas por fecha+hora+empleada
  const citasMap = {}; // `fecha|hora|empleada` → true
  (citas || []).forEach(c => {
    if (c.empleada) citasMap[`${c.fecha}|${c.hora}|${c.empleada}`] = true;
  });

  const HORAS = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
  const DIAS_LABEL = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  const grid = document.getElementById('disponSemana');
  grid.innerHTML = '';

  dias.forEach(diaDate => {
    const fechaStr = diaDate.toISOString().slice(0, 10);
    const esBloqueado = diasBloqSet.has(fechaStr);
    const esDom = diaDate.getDay() === 0;
    const esSab = diaDate.getDay() === 6;
    const esHoy = fechaStr === new Date().toISOString().slice(0, 10);
    const empBloqHoy = empBloqMap[fechaStr] || new Set();

    const col = document.createElement('div');
    col.className = 'dispon-col' + (esHoy ? ' dispon-col--hoy' : '') + (esBloqueado ? ' dispon-col--bloqueado' : '');

    // Header del día
    const header = document.createElement('div');
    header.className = 'dispon-col__header';
    header.innerHTML = `
      <div class="dispon-col__dia">${DIAS_LABEL[diaDate.getDay()]}</div>
      <div class="dispon-col__fecha">${diaDate.getDate()}</div>
      ${esBloqueado ? '<div class="dispon-cerrado-badge">Cerrado</div>' : ''}
    `;
    col.appendChild(header);

    if (esBloqueado) {
      const msg = document.createElement('div');
      msg.className = 'dispon-bloqueado-msg';
      msg.textContent = 'Día bloqueado';
      col.appendChild(msg);
      grid.appendChild(col);
      return;
    }

    // Horarios del día
    const horasDelDia = esDom ? ['10:00','11:00','12:00','13:00','14:00'] : esSab ? HORAS.slice(0, 8) : HORAS;

    horasDelDia.forEach(hora => {
      const slot = document.createElement('div');
      slot.className = 'dispon-slot';

      const esBloqueadoHorario = horasBloqSet.has(`${fechaStr}|${hora}`);

      if (esBloqueadoHorario) {
        slot.classList.add('dispon-slot--bloqueado-hora');
        slot.innerHTML = `
          <div class="dispon-slot__hora">${hora}</div>
          <div class="dispon-slot__cerrado">Cerrado</div>
        `;
        col.appendChild(slot);
        return;
      }

      // Calcular disponibilidad por empleada en esta hora
      const disponibles = EMPLEADAS_ACTIVAS.filter(emp => {
        if (empBloqHoy.has(emp)) return false;
        return !citasMap[`${fechaStr}|${hora}|${emp}`];
      });

      const ocupadas = EMPLEADAS_ACTIVAS.filter(emp => {
        if (empBloqHoy.has(emp)) return false;
        return citasMap[`${fechaStr}|${hora}|${emp}`];
      });

      const bloqueadas = EMPLEADAS_ACTIVAS.filter(emp => empBloqHoy.has(emp));

      const nivel = disponibles.length === 0 ? 'lleno'
                  : disponibles.length <= 2  ? 'parcial'
                  : 'libre';

      slot.classList.add(`dispon-slot--${nivel}`);
      slot.innerHTML = `
        <div class="dispon-slot__hora">${hora}</div>
        <div class="dispon-slot__dots">
          ${EMPLEADAS_ACTIVAS.map(emp => {
            const cls = empBloqHoy.has(emp) ? 'dot--bloqueada'
                      : citasMap[`${fechaStr}|${hora}|${emp}`] ? 'dot--ocupada'
                      : 'dot--libre';
            return `<span class="dot ${cls}" title="${emp}"></span>`;
          }).join('')}
        </div>
      `;

      const names = [
        ...disponibles.map(e => `✓ ${e}`),
        ...ocupadas.map(e => `✗ ${e}`),
        ...bloqueadas.map(e => `⊘ ${e}`),
      ].join('\n');
      slot.title = names;

      col.appendChild(slot);
    });

    grid.appendChild(col);
  });
}

// ─── Dashboard: métricas de la semana ────────
async function cargarMetricasDashboard() {
  const { inicio, fin } = getSemanaActual();

  const { data: citas } = await supabaseClient
    .from('citas')
    .select('estado, monto, servicio, empleada')
    .gte('fecha', inicio)
    .lte('fecha', fin)
    .neq('estado', 'cancelada');

  if (!citas || citas.length === 0) return;

  const completadas = citas.filter(c => c.estado === 'completada');
  const ingresos = completadas.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);

  // Servicio más frecuente
  const servCount = {};
  citas.forEach(c => { servCount[c.servicio] = (servCount[c.servicio] || 0) + 1; });
  const topServ = Object.entries(servCount).sort((a, b) => b[1] - a[1])[0];

  // Empleada con más citas
  const empCount = {};
  citas.filter(c => c.empleada).forEach(c => { empCount[c.empleada] = (empCount[c.empleada] || 0) + 1; });
  const topEmp = Object.entries(empCount).sort((a, b) => b[1] - a[1])[0];

  document.getElementById('dashSemCitas').textContent    = citas.length;
  document.getElementById('dashSemIngresos').textContent = ingresos > 0 ? `$${ingresos.toLocaleString('es-MX')}` : '$0';
  document.getElementById('dashSemServ').textContent     = topServ ? topServ[0].split(' ')[0] : '—';
  document.getElementById('dashSemEmp').textContent      = topEmp  ? topEmp[0].split(' ')[0]  : '—';
  document.getElementById('dashSemana').style.display    = '';
}

// ─── Modal Nueva Cita ────────────────────────
function abrirModalNuevaCita() {
  const hoy = new Date().toISOString().slice(0, 10);
  document.getElementById('ncNombre').value   = '';
  document.getElementById('ncTelefono').value = '';
  document.getElementById('ncServicio').value = '';
  document.getElementById('ncFecha').value    = hoy;
  document.getElementById('ncHora').value     = '10:00';
  document.getElementById('ncEmpleada').value = '';
  document.getElementById('ncEstado').value   = 'pendiente';
  document.getElementById('modalNuevaCita').classList.add('open');
}

function cerrarModalNuevaCita() {
  document.getElementById('modalNuevaCita').classList.remove('open');
}

document.getElementById('btnNuevaCita').addEventListener('click', abrirModalNuevaCita);
document.getElementById('btnCerrarNuevaCita').addEventListener('click', cerrarModalNuevaCita);
document.getElementById('btnCancelarNuevaCita').addEventListener('click', cerrarModalNuevaCita);
document.getElementById('modalNuevaCita').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalNuevaCita')) cerrarModalNuevaCita();
});

document.getElementById('btnGuardarNuevaCita').addEventListener('click', async () => {
  const nombre   = document.getElementById('ncNombre').value.trim();
  const telefono = document.getElementById('ncTelefono').value.trim();
  const servicio = document.getElementById('ncServicio').value.trim();
  const fecha    = document.getElementById('ncFecha').value;
  const hora     = document.getElementById('ncHora').value;
  const empleada = document.getElementById('ncEmpleada').value || null;
  const estado   = document.getElementById('ncEstado').value;

  if (!nombre)   { alert('Ingresa el nombre del cliente.'); return; }
  if (!telefono) { alert('Ingresa el teléfono.'); return; }
  if (!servicio) { alert('Ingresa el servicio.'); return; }
  if (!fecha)    { alert('Selecciona una fecha.'); return; }

  const btn = document.getElementById('btnGuardarNuevaCita');
  btn.disabled = true; btn.textContent = 'Guardando...';

  const { error } = await supabaseClient.from('citas').insert([{
    nombre, telefono, servicio, fecha, hora, empleada, estado
  }]);

  btn.disabled = false; btn.textContent = 'Crear Cita';

  if (error) { alert('Error: ' + error.message); return; }

  cerrarModalNuevaCita();
  mostrarToast('Cita creada', `${nombre} — ${servicio} · ${fecha} ${hora}`);

  // Refresca la vista activa
  const secHoy   = document.getElementById('sectionHoy');
  const secCitas = document.getElementById('sectionCitas');
  if (secHoy.style.display !== 'none')   cargarAgendaHoy();
  if (secCitas.style.display !== 'none') { cargarCitas(); actualizarStats(); }
});

// ─── Historial de Cliente ─────────────────────
function abrirHistorial() {
  document.getElementById('historialBusqueda').value = '';
  document.getElementById('historialResultado').innerHTML =
    '<div class="empty-state"><p>Ingresa un nombre o teléfono para buscar.</p></div>';
  document.getElementById('modalHistorial').classList.add('open');
}
function cerrarHistorial() {
  document.getElementById('modalHistorial').classList.remove('open');
}

document.getElementById('btnAbrirHistorial').addEventListener('click', abrirHistorial);
document.getElementById('btnCerrarHistorial').addEventListener('click', cerrarHistorial);
document.getElementById('modalHistorial').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalHistorial')) cerrarHistorial();
});
document.getElementById('historialBusqueda').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') buscarHistorial();
});
document.getElementById('btnBuscarHistorial').addEventListener('click', buscarHistorial);

async function buscarHistorial() {
  const q = document.getElementById('historialBusqueda').value.trim();
  if (q.length < 2) { alert('Escribe al menos 2 caracteres.'); return; }

  const resultado = document.getElementById('historialResultado');
  resultado.innerHTML = '<div class="empty-state"><strong>Buscando...</strong></div>';

  // Busca por nombre (ilike) o teléfono (ilike)
  const [resByNombre, resByTel] = await Promise.all([
    supabaseClient.from('citas').select('*').ilike('nombre', `%${q}%`).order('fecha', { ascending: false }),
    supabaseClient.from('citas').select('*').ilike('telefono', `%${q}%`).order('fecha', { ascending: false }),
  ]);

  const todos = [...(resByNombre.data || []), ...(resByTel.data || [])];
  // deduplicar por id
  const vistos = new Set();
  const citas  = todos.filter(c => { if (vistos.has(c.id)) return false; vistos.add(c.id); return true; });
  citas.sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));

  if (citas.length === 0) {
    resultado.innerHTML = '<div class="empty-state"><p>Sin resultados para esa búsqueda.</p></div>';
    return;
  }

  // Agrupar por cliente (teléfono)
  const clientes = {};
  citas.forEach(c => {
    const key = c.telefono || c.nombre;
    if (!clientes[key]) clientes[key] = { nombre: c.nombre, telefono: c.telefono, citas: [] };
    clientes[key].citas.push(c);
  });

  resultado.innerHTML = Object.values(clientes).map(cl => {
    const totalServ = cl.citas.length;
    const totalGasto = cl.citas.filter(c => c.monto).reduce((s, c) => s + (parseFloat(c.monto)||0), 0);
    const ul = cl.citas.map(c => {
      const estadoLabel = { pendiente:'Pendiente', confirmada:'Confirmada', completada:'Completada', cancelada:'Cancelada' }[c.estado] || c.estado;
      const fechaFmt = new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' });
      const montoStr = c.monto ? ` · $${Number(c.monto).toLocaleString('es-MX')}` : '';
      return `<div class="hist-cita">
        <span class="badge badge--${c.estado}">${estadoLabel}</span>
        <span class="hist-cita__fecha">${fechaFmt} ${(c.hora||'').slice(0,5)}</span>
        <span class="hist-cita__serv">${c.servicio}${montoStr}</span>
        ${c.empleada ? `<span class="hist-cita__emp">👩 ${c.empleada}</span>` : ''}
      </div>`;
    }).join('');
    return `
      <div class="hist-cliente">
        <div class="hist-cliente__header">
          <div>
            <div class="hist-cliente__nombre">${cl.nombre}</div>
            <div class="hist-cliente__tel"><a href="tel:${cl.telefono}" style="color:var(--c-principal)">${cl.telefono}</a></div>
          </div>
          <div class="hist-cliente__stats">
            <span>${totalServ} visita${totalServ !== 1 ? 's' : ''}</span>
            ${totalGasto > 0 ? `<span>$${totalGasto.toLocaleString('es-MX')} total</span>` : ''}
          </div>
        </div>
        <div class="hist-citas">${ul}</div>
      </div>`;
  }).join('');
}

// ─── Agenda Hoy ──────────────────────────────
async function cargarAgendaHoy() {
  const hoy = new Date().toISOString().slice(0, 10);

  // Label de fecha
  const labelFecha = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  document.getElementById('hoyFechaLabel').textContent =
    labelFecha.charAt(0).toUpperCase() + labelFecha.slice(1);

  const { data: citas, error } = await supabaseClient
    .from('citas')
    .select('*')
    .eq('fecha', hoy)
    .order('hora', { ascending: true });

  if (error) { console.warn("[admin] query error"); return; }

  const lista = citas || [];
  const pend = lista.filter(c => c.estado === 'pendiente').length;
  const conf = lista.filter(c => c.estado === 'confirmada').length;
  const comp = lista.filter(c => c.estado === 'completada').length;

  document.getElementById('hoyStatTotal').textContent = lista.length;
  document.getElementById('hoyStatPend').textContent  = pend;
  document.getElementById('hoyStatConf').textContent  = conf;
  document.getElementById('hoyStatComp').textContent  = comp;
  document.getElementById('hoySub').textContent =
    lista.length === 0 ? 'Sin citas programadas' : `${lista.length} cita${lista.length !== 1 ? 's' : ''} programada${lista.length !== 1 ? 's' : ''}`;

  const agenda = document.getElementById('hoyAgenda');
  if (lista.length === 0) {
    agenda.innerHTML = '<div class="empty-state"><strong>Sin citas para hoy</strong><p>¡Día libre! 🌸</p></div>';
    return;
  }

  agenda.innerHTML = lista.map(c => {
    const estadoLabel = { pendiente:'Pendiente', confirmada:'Confirmada', completada:'Completada', cancelada:'Cancelada' }[c.estado] || c.estado;
    const disabledConf = (c.estado === 'confirmada' || c.estado === 'completada') ? 'disabled' : '';
    const disabledCanc = (c.estado === 'cancelada'  || c.estado === 'completada') ? 'disabled' : '';
    const disabledComp = c.estado === 'completada' ? 'disabled' : '';
    const waUrl = waClienteUrl(c.telefono, c.nombre, c.servicio, c.fecha, c.hora);
    const montoHtml = c.monto
      ? `<span class="hoy-monto">${c.metodo_pago === 'tarjeta' ? '💳' : '💵'} $${Number(c.monto).toLocaleString('es-MX')}</span>`
      : '';
    return `
      <div class="hoy-cita hoy-cita--${c.estado}">
        <div class="hoy-cita__hora">${(c.hora||'').slice(0,5)}</div>
        <div class="hoy-cita__body">
          <div class="hoy-cita__nombre">${c.nombre} <span class="badge badge--${c.estado}">${estadoLabel}</span></div>
          <div class="hoy-cita__servicio">${c.servicio}</div>
          <div class="hoy-cita__meta">
            ${c.empleada ? `<span>👩 ${c.empleada}</span>` : ''}
            <a href="tel:${c.telefono}" style="color:var(--c-principal)">${c.telefono}</a>
            ${montoHtml}
          </div>
          ${c.notas ? `<div class="hoy-cita__notas">${c.notas}</div>` : ''}
        </div>
        <div class="hoy-cita__actions">
          <button class="btn-confirmar" ${disabledConf}
            onclick="confirmarCita('${c.id}','${(c.nombre||'').replace(/'/g,"\\'")}','${c.telefono}','${(c.servicio||'').replace(/'/g,"\\'")}','${c.fecha}','${(c.hora||'').slice(0,5)}');cargarAgendaHoy()">Confirmar</button>
          <button class="btn-completar" ${disabledComp}
            onclick="abrirCobro('${c.id}','${(c.servicio||'').replace(/'/g,"\\'")}')">Completar</button>
          <button class="btn-cancelar" ${disabledCanc}
            onclick="cambiarEstado('${c.id}','cancelada').then(()=>cargarAgendaHoy())">Cancelar</button>
          <a class="btn-wa-inline" href="${waUrl}" target="_blank" rel="noopener noreferrer" title="WhatsApp cliente">${WA_SVG}</a>
        </div>
      </div>`;
  }).join('');
}

// ─── Realtime: nuevas citas ──────────────────
function suscribirNuevasCitas() {
  supabaseClient
    .channel('admin-citas')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'citas' }, (payload) => {
      const c = payload.new;
      mostrarToast(`Nueva cita: ${c.nombre}`, `${c.servicio} — ${c.fecha} a las ${c.hora}`);
      if (currentView === 'lista') cargarCitas();
      else cargarCalendario();
      actualizarStats();
    })
    .subscribe();
}

// ─── Toast ───────────────────────────────────
function mostrarToast(titulo, cuerpo, tipo = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  // Usar textContent para evitar XSS — datos vienen de Supabase realtime (usuario externo)
  const titleEl = document.createElement('div');
  titleEl.className = 'toast__title';
  titleEl.textContent = titulo;
  const bodyEl = document.createElement('div');
  bodyEl.className = 'toast__body';
  bodyEl.textContent = cuerpo;
  toast.appendChild(titleEl);
  toast.appendChild(bodyEl);
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ─── Refresh automático de sesión ────────────
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') return;
  if (event === 'SIGNED_OUT' || !session) mostrarLogin();
});

/* ============================================================
   SECCIÓN CLIENTES — Base de datos derivada de citas
   ============================================================ */

let todosClientesData = [];

function getLoyaltyLevel(totalCitas) {
  if (totalCitas >= 10) return { nivel: 'vip',     label: 'VIP',     cls: 'loyalty-badge--vip' };
  if (totalCitas >= 5)  return { nivel: 'fiel',    label: 'Fiel',    cls: 'loyalty-badge--fiel' };
  if (totalCitas >= 2)  return { nivel: 'regular', label: 'Regular', cls: 'loyalty-badge--regular' };
  return                       { nivel: 'nuevo',   label: 'Nueva',   cls: 'loyalty-badge--nuevo' };
}

function getInitials(nombre) {
  return (nombre || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

function fechaBonita(fechaStr) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function cargarClientes() {
  const body = document.getElementById('clientesBody');
  body.innerHTML = `<tr><td colspan="8"><div class="empty-state"><strong>Cargando...</strong></div></td></tr>`;

  const { data, error } = await supabaseClient
    .from('citas')
    .select('nombre, telefono, email, servicio, fecha, empleada, monto, estado')
    .order('fecha', { ascending: false });

  if (error || !data) {
    body.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>Error al cargar las clientas.</p></div></td></tr>`;
    return;
  }

  // Agrupar por teléfono
  const clienteMap = {};
  for (const cita of data) {
    const tel = (cita.telefono || '').replace(/\s/g, '') || ('sin-tel-' + cita.nombre);
    if (!clienteMap[tel]) {
      clienteMap[tel] = {
        nombre:        cita.nombre || '—',
        telefono:      cita.telefono || '',
        email:         cita.email || '',
        citas:         [],
        gastoTotal:    0,
        servicioCount: {},
      };
    }
    const c = clienteMap[tel];
    c.citas.push(cita);
    if (cita.monto && cita.estado === 'completada') {
      c.gastoTotal += Number(cita.monto) || 0;
    }
    if (cita.servicio) {
      c.servicioCount[cita.servicio] = (c.servicioCount[cita.servicio] || 0) + 1;
    }
  }

  // Enriquecer con campos derivados
  todosClientesData = Object.values(clienteMap).map(c => {
    const completadas   = c.citas.filter(x => x.estado === 'completada');
    const fechas        = c.citas.map(x => x.fecha).filter(Boolean).sort();
    const servicioTop   = Object.entries(c.servicioCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    return {
      ...c,
      totalCitas:       c.citas.length,
      citasCompletadas: completadas.length,
      ultimaVisita:     fechas[fechas.length - 1] || null,
      primeraVisita:    fechas[0] || null,
      servicioFrecuente: servicioTop,
      loyalty:          getLoyaltyLevel(c.citas.length),
    };
  });

  // Calcular stats
  const ahora        = new Date();
  const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0];
  const nuevasMes    = todosClientesData.filter(c => c.primeraVisita >= primerDiaMes).length;
  const vip          = todosClientesData.filter(c => c.loyalty.nivel === 'vip').length;
  const fiel         = todosClientesData.filter(c => c.loyalty.nivel === 'fiel').length;
  const conGasto     = todosClientesData.filter(c => c.gastoTotal > 0);
  const promedioGasto = conGasto.length
    ? Math.round(conGasto.reduce((s, c) => s + c.gastoTotal, 0) / conGasto.length)
    : 0;

  document.getElementById('clienteStatTotal').textContent = todosClientesData.length;
  document.getElementById('clienteStatVip').textContent   = vip;
  document.getElementById('clienteStatFiel').textContent  = fiel;
  document.getElementById('clienteStatNuevo').textContent = nuevasMes;
  document.getElementById('clienteStatGasto').textContent = promedioGasto > 0 ? '$' + promedioGasto.toLocaleString('es-MX') : '—';

  // Ordenar por defecto: más citas
  todosClientesData.sort((a, b) => b.totalCitas - a.totalCitas);
  renderClientesTabla(todosClientesData);
}

function renderClientesTabla(clientes) {
  const body  = document.getElementById('clientesBody');
  const count = document.getElementById('clienteCount');

  if (!clientes.length) {
    body.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>No se encontraron clientas.</p></div></td></tr>`;
    count.textContent = '';
    return;
  }

  count.textContent = `${clientes.length} clienta${clientes.length !== 1 ? 's' : ''}`;

  body.innerHTML = clientes.map(c => {
    const tel = escapeHtml(c.telefono);
    const ini = escapeHtml(getInitials(c.nombre));
    return `
      <tr class="clientes-row" onclick="abrirPerfilCliente('${tel}')">
        <td>
          <div class="cliente-cell">
            <div class="cliente-avatar">${ini}</div>
            <div>
              <div class="cliente-cell__name">${escapeHtml(c.nombre)}</div>
              ${c.email ? `<div class="cliente-cell__email">${escapeHtml(c.email)}</div>` : ''}
            </div>
          </div>
        </td>
        <td>${escapeHtml(c.telefono || '—')}</td>
        <td><span class="loyalty-badge ${escapeHtml(c.loyalty.cls)}">${escapeHtml(c.loyalty.label)}</span></td>
        <td><strong>${c.totalCitas}</strong></td>
        <td>${c.ultimaVisita ? fechaBonita(c.ultimaVisita) : '—'}</td>
        <td class="servicio-top-cell">${escapeHtml(c.servicioFrecuente)}</td>
        <td class="gasto-cell">${c.gastoTotal > 0 ? '$' + c.gastoTotal.toLocaleString('es-MX') : '—'}</td>
        <td>
          <button class="btn-notas" onclick="event.stopPropagation();abrirPerfilCliente('${tel}')">
            Ver perfil
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filtrarYOrdenarClientes() {
  const busq   = (document.getElementById('clienteBusqueda').value || '').toLowerCase().trim();
  const orden  = document.getElementById('clienteOrden').value;
  const lealtad = document.getElementById('clienteFiltroLealtad').value;

  let resultado = todosClientesData.filter(c => {
    if (busq && !c.nombre.toLowerCase().includes(busq) && !c.telefono.includes(busq)) return false;
    if (lealtad && c.loyalty.nivel !== lealtad) return false;
    return true;
  });

  if (orden === 'citas')    resultado.sort((a, b) => b.totalCitas - a.totalCitas);
  if (orden === 'reciente') resultado.sort((a, b) => (b.ultimaVisita || '').localeCompare(a.ultimaVisita || ''));
  if (orden === 'gasto')    resultado.sort((a, b) => b.gastoTotal - a.gastoTotal);
  if (orden === 'nombre')   resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  renderClientesTabla(resultado);
}

function abrirPerfilCliente(telefono) {
  const c = todosClientesData.find(x => x.telefono === telefono || escapeHtml(x.telefono) === telefono);
  if (!c) return;

  document.getElementById('perfilClienteTitle').textContent = c.nombre;

  const citasOrdenadas = [...c.citas].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const waNum = c.telefono.replace(/\D/g, '');

  document.getElementById('perfilClienteContent').innerHTML = `
    <div class="perfil-header">
      <div class="perfil-avatar-lg">${escapeHtml(getInitials(c.nombre))}</div>
      <div class="perfil-info">
        <div class="perfil-nombre">${escapeHtml(c.nombre)}</div>
        <div class="perfil-contacto">
          ${escapeHtml(c.telefono || '—')}${c.email ? ' · ' + escapeHtml(c.email) : ''}
        </div>
        <div style="margin-top:0.4rem;display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
          <span class="loyalty-badge ${escapeHtml(c.loyalty.cls)}">${escapeHtml(c.loyalty.label)}</span>
          ${c.primeraVisita ? `<span style="font-size:0.74rem;color:var(--c-gray-lt)">Clienta desde ${fechaBonita(c.primeraVisita)}</span>` : ''}
        </div>
      </div>
      ${waNum.length >= 8 ? `
        <a href="https://wa.me/52${waNum}?text=Hola%20${encodeURIComponent(c.nombre)}%2C%20te%20contactamos%20de%20Maria%20Jos%C3%A9%20Beauty%20%26%20Spa%20%F0%9F%8C%AA"
           target="_blank" rel="noopener"
           class="btn-wa-perfil">
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </a>
      ` : ''}
    </div>

    <div class="perfil-stats">
      <div class="perfil-stat">
        <div class="perfil-stat__val">${c.totalCitas}</div>
        <div class="perfil-stat__lbl">Citas totales</div>
      </div>
      <div class="perfil-stat">
        <div class="perfil-stat__val" style="color:var(--c-completada)">${c.citasCompletadas}</div>
        <div class="perfil-stat__lbl">Completadas</div>
      </div>
      <div class="perfil-stat">
        <div class="perfil-stat__val" style="color:var(--c-confirmada)">${c.gastoTotal > 0 ? '$' + c.gastoTotal.toLocaleString('es-MX') : '—'}</div>
        <div class="perfil-stat__lbl">Gasto total</div>
      </div>
    </div>

    <div class="perfil-serv-top">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="14" height="14"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      Servicio frecuente: <strong>${escapeHtml(c.servicioFrecuente)}</strong>
    </div>

    <div class="perfil-citas-title">Historial de citas (${citasOrdenadas.length})</div>
    <div class="perfil-citas-list">
      ${citasOrdenadas.map(cita => `
        <div class="perfil-cita-row">
          <span class="perfil-cita-fecha">${fechaBonita(cita.fecha)}</span>
          <span class="perfil-cita-serv">${escapeHtml(cita.servicio || '—')}</span>
          ${cita.empleada ? `<span class="perfil-cita-emp">${escapeHtml(cita.empleada)}</span>` : ''}
          <span class="badge badge--${escapeHtml(cita.estado || 'pendiente')}">${escapeHtml(cita.estado || '—')}</span>
          ${cita.monto ? `<span class="perfil-cita-monto">$${Number(cita.monto).toLocaleString('es-MX')}</span>` : ''}
        </div>
      `).join('')}
    </div>

    <div class="perfil-danger-zone">
      <button class="btn-eliminar-cliente" onclick="eliminarCliente('${escapeHtml(c.telefono)}', '${escapeHtml(c.nombre)}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        Eliminar clienta
      </button>
    </div>
  `;

  document.getElementById('modalPerfilCliente').classList.add('open');
}

async function eliminarCliente(telefono, nombre) {
  if (!confirm(`¿Eliminar a ${nombre} y todas sus citas? Esta acción no se puede deshacer.`)) return;

  const btn = document.querySelector('.btn-eliminar-cliente');
  if (btn) { btn.disabled = true; btn.textContent = 'Eliminando...'; }

  const { error } = await supabaseClient
    .from('citas')
    .delete()
    .eq('telefono', telefono);

  if (error) {
    alert('No se pudo eliminar. Intenta de nuevo.');
    if (btn) { btn.disabled = false; btn.textContent = 'Eliminar clienta'; }
    return;
  }

  document.getElementById('modalPerfilCliente').classList.remove('open');
  cargarClientes();
}

// ─── Event listeners Clientes ──────────────────────────────
document.getElementById('btnBuscarClientes').addEventListener('click', filtrarYOrdenarClientes);
document.getElementById('clienteBusqueda').addEventListener('keydown', e => {
  if (e.key === 'Enter') filtrarYOrdenarClientes();
});
document.getElementById('clienteOrden').addEventListener('change', filtrarYOrdenarClientes);
document.getElementById('clienteFiltroLealtad').addEventListener('change', filtrarYOrdenarClientes);
document.getElementById('btnCerrarPerfil').addEventListener('click', () => {
  document.getElementById('modalPerfilCliente').classList.remove('open');
});
document.getElementById('modalPerfilCliente').addEventListener('click', e => {
  if (e.target === document.getElementById('modalPerfilCliente')) {
    document.getElementById('modalPerfilCliente').classList.remove('open');
  }
});

// ─── Init ────────────────────────────────────
checkSession();
