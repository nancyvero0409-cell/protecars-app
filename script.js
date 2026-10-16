'use strict';
// Protecars: esta versión funciona sin librerías externas ni servidor.
// WhatsApp recibe una SOLICITUD, no una reserva confirmada.
(() => {
  const PHONE = '593968695736';
  const form = document.getElementById('booking-form');
  const service = document.getElementById('service');
  const micrajeField = document.getElementById('micraje-field');
  const micraje = document.getElementById('micraje');
  const dateInput = document.getElementById('date');
  const result = document.getElementById('result');
  const calendarBtn = document.getElementById('calendar-btn');
  const fallback = document.getElementById('whatsapp-fallback');
  let latestBooking = null;

  const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  dateInput.min = localToday();
  document.getElementById('current-year').textContent = new Date().getFullYear();

  function updateMicraje() {
    const active = service.value === 'laminas';
    micrajeField.hidden = !active;
    micraje.required = active;
    if (!active) micraje.value = '';
  }
  service.addEventListener('change', updateMicraje);

  document.querySelectorAll('[data-service]').forEach(card => {
    card.addEventListener('click', () => {
      service.value = card.dataset.service;
      updateMicraje();
      document.getElementById('agenda').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => service.focus({ preventScroll: true }), 450);
    });
  });

  const getText = id => document.getElementById(id).value.trim();
  const safeLine = value => String(value).replace(/[\r\n]+/g, ' ').trim();
  const displayDate = value => {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    dateInput.min = localToday();
    if (!form.reportValidity()) return;
    if (getText('date') < localToday()) {
      dateInput.setCustomValidity('Elige una fecha de hoy en adelante.');
      dateInput.reportValidity();
      dateInput.setCustomValidity('');
      return;
    }
    const booking = {
      service: service.options[service.selectedIndex].text,
      micraje: getText('micraje'),
      date: getText('date'), time: getText('time'),
      name: getText('name'), phone: getText('phone'), email: getText('email'),
      make: getText('make'), model: getText('model'), year: getText('year'),
      plate: getText('plate'), details: getText('details'),
      reminder: document.getElementById('reminder').checked
    };
    const lines = [
      'Hola, Protecars. Quisiera solicitar una cita (pendiente de confirmación).',
      '', `Servicio: ${booking.service}`,
      ...(booking.micraje ? [`Micraje: ${booking.micraje}`] : []),
      `Fecha preferida: ${displayDate(booking.date)}`,
      `Hora preferida: ${booking.time}`,
      '', `Nombre: ${booking.name}`, `WhatsApp: ${booking.phone}`,
      `Correo: ${booking.email}`,
      '', `Vehículo: ${booking.make} ${booking.model}`,
      `Año: ${booking.year}`,
      ...(booking.plate ? [`Placa: ${booking.plate}`] : []),
      ...(booking.details ? [`Datos adicionales: ${booking.details}`] : []),
      '', 'Por favor, confirmen disponibilidad, fecha y hora. ¡Gracias!'
    ];
    const message = lines.map(safeLine).join('\n');
    const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
    latestBooking = booking;
    fallback.href = url;
    fallback.hidden = false;
    calendarBtn.hidden = !booking.reminder;
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // La apertura debe realizarse directamente durante el clic del usuario.
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.href = url;
  });

  function icsEscape(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }
  function pad(num) { return String(num).padStart(2, '0'); }
  function utcStamp(date) {
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
  }
  calendarBtn.addEventListener('click', () => {
    if (!latestBooking) return;
    const b = latestBooking;
    // Quito, UTC-05:00 (sin horario de verano). El recordatorio es PROVISIONAL.
    const start = new Date(`${b.date}T${b.time}:00-05:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const desc = `SOLICITUD PENDIENTE: confirmar con Protecars por WhatsApp +${PHONE}. Vehículo: ${b.make} ${b.model} ${b.year}. La duración de 1 hora es referencial.`;
    const event = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Protecars//Solicitud de cita//ES',
      'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:protecars-${Date.now()}@agenda.local`, `DTSTAMP:${utcStamp(new Date())}`,
      `DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(end)}`,
      `SUMMARY:${icsEscape(`PROVISIONAL - Protecars: ${b.service}`)}`,
      `DESCRIPTION:${icsEscape(desc)}`, 'STATUS:TENTATIVE',
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY',
      'DESCRIPTION:Recordatorio provisional de solicitud Protecars', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `protecars-cita-provisional-${b.date}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });
})();
