/* ============================================
   Supabase Integration - Maria Jose Beauty & Spa
   ============================================ */

const SUPABASE_URL = 'https://ltxvxyzawvbjtpmzhecu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0eHZ4eXphd3ZianRwbXpoZWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NjYyNzgsImV4cCI6MjA4OTU0MjI3OH0.Kwe56BU5MOl26UYZD2yhRacKg4qUdsSi953tZ8PJxnY';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Valida y limpia los campos de una cita antes de guardar.
 * Lanza un Error con mensaje legible si algo no pasa la validación.
 */
function validarCita(cita) {
  const nombre = String(cita.nombre || '').trim().slice(0, 120);
  const telefono = String(cita.telefono || '').replace(/[^\d\s\-+()]/g, '').trim().slice(0, 20);
  const servicio = String(cita.servicio || '').trim().slice(0, 200);
  const fecha = String(cita.fecha || '').trim();
  const hora = String(cita.hora || '').trim().slice(0, 20);
  const empleada = cita.empleada ? String(cita.empleada).trim().slice(0, 80) : null;

  if (!nombre || nombre.length < 2)
    throw new Error('El nombre es obligatorio (mínimo 2 caracteres).');
  if (!telefono || telefono.replace(/\D/g, '').length < 8)
    throw new Error('El teléfono debe tener al menos 8 dígitos.');
  if (!servicio)
    throw new Error('El servicio es obligatorio.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    throw new Error('La fecha no tiene el formato correcto.');
  if (!hora)
    throw new Error('La hora es obligatoria.');

  // Verificar que la fecha no sea en el pasado (tolerancia de 1 día)
  const fechaDate = new Date(fecha + 'T00:00:00');
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  if (fechaDate < ayer)
    throw new Error('No se pueden agendar citas en fechas pasadas.');

  return { nombre, telefono, servicio, fecha, hora, empleada };
}

/**
 * Guarda una cita en Supabase.
 * @param {Object} cita - Datos de la cita
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function guardarCita(cita) {
  let datos;
  try {
    datos = validarCita(cita);
  } catch (e) {
    return { success: false, error: e.message };
  }

  const { error } = await supabaseClient
    .from('citas')
    .insert([{
      nombre:   datos.nombre,
      telefono: datos.telefono,
      servicio: datos.servicio,
      fecha:    datos.fecha,
      hora:     datos.hora,
      empleada: datos.empleada,
    }]);

  if (error) {
    // No exponer detalles internos al usuario público
    console.warn('[citas] insert error:', error.code);
    return { success: false, error: 'No se pudo guardar la cita. Intenta de nuevo.' };
  }

  return { success: true, error: null };
}

/**
 * Actualiza estado y/o notas de una cita.
 * @param {string|number} id
 * @param {{estado?: string, notas?: string}} campos
 */
async function actualizarCita(id, campos) {
  const { error } = await supabaseClient
    .from('citas')
    .update(campos)
    .eq('id', id);

  if (error) {
    console.warn('[supabase] update error');
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
