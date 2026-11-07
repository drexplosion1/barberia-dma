/**
 * Barbería DMA - Oviedo
 * Motor interactivo de citas (Zero Server), estado de apertura y utilidades.
 */

// Configuración general del negocio
const BARBERIA_CONFIG = {
  nombre: "Barbería DMA",
  telefono: "+34610245360",
  telefonoLimpio: "34610245360",
  direccion: "C. Ignacio Herrero Garralda, 1, 33011 Oviedo, Asturias",
  googleMapsUrl: "https://maps.google.com/?q=Barberia+DMA+Oviedo+Ignacio+Herrero+Garralda+1",
  // Pega aquí tu enlace de "Página de citas" de Google Calendar (ej: https://calendar.google.com/calendar/appointments/schedules/AcZssZ...)
  googleCalendarBookingUrl: "",
  horarios: {
    semana: [
      { inicio: "10:30", fin: "13:30" },
      { inicio: "15:00", fin: "20:00" }
    ],
    sabado: [
      { inicio: "10:00", fin: "14:00" }
    ],
    domingo: [] // Cerrado
  },
  servicios: [
    {
      id: "corte-caballero",
      nombre: "Corte de Pelo Caballero",
      desc: "Degradado (Fade), corte clásico a tijera o estilo actual. Incluye asesoramiento y peinado con producto premium.",
      duracion: "30 min",
      precio: "15€",
      popular: true
    },
    {
      id: "arreglo-barba",
      nombre: "Arreglo de Barba con Toalla Caliente",
      desc: "Perfilado a navaja tradicional, rebajado, hidratación con aceites y ritual relajante de toalla caliente.",
      duracion: "25 min",
      precio: "12€",
      popular: false
    },
    {
      id: "combo-corte-barba",
      nombre: "Combo VIP: Corte + Arreglo de Barba",
      desc: "El servicio estrella. Tu corte favorito junto al cuidado completo de barba con toalla caliente y loción revitalizante.",
      duracion: "50 min",
      precio: "25€",
      popular: true
    },
    {
      id: "afeitado-cabeza",
      nombre: "Afeitado Clásico de Cabeza",
      desc: "Afeitado completo a navaja con espuma tibia, toallas calientes y tratamiento hidratante post-afeitado.",
      duracion: "30 min",
      precio: "15€",
      popular: false
    },
    {
      id: "corte-infantil",
      nombre: "Corte de Pelo Niño (Apto para niños)",
      desc: "Atención paciente, cercana y divertida para los más peques. Desde estilos clásicos hasta los más modernos.",
      duracion: "25 min",
      precio: "13€",
      popular: false
    },
    {
      id: "lavado-peinado",
      nombre: "Lavado, Masaje Capilar & Peinado",
      desc: "Lavado relajante con champú específico, tónico refrescante y peinado con pomada o cera mate.",
      duracion: "15 min",
      precio: "8€",
      popular: false
    }
  ]
};

// Estado del formulario de reserva
let reservaState = {
  servicioSeleccionado: BARBERIA_CONFIG.servicios[0],
  fecha: "",
  hora: "",
  nombre: "",
  telefono: "",
  notas: ""
};

// Document Ready
document.addEventListener("DOMContentLoaded", () => {
  actualizarEstadoApertura();
  setInterval(actualizarEstadoApertura, 60000); // recalcular cada minuto

  initServiciosUI();
  initCalendarioUI();
  initFormularioReserva();
  initGoogleCalendarEmbed();
  initBookingTabs();
  initMobileMenu();
  initFaqAccordion();
});

/* ============================================================
   GOOGLE CALENDAR APPOINTMENT SCHEDULING (AUTO-BLOQUEO)
   ============================================================ */
function initBookingTabs() {
  const tabGoogle = document.getElementById("tab-btn-google");
  const tabWhatsapp = document.getElementById("tab-btn-whatsapp");
  const viewGoogle = document.getElementById("booking-view-google");
  const viewWhatsapp = document.getElementById("booking-view-whatsapp");

  if (!tabGoogle || !tabWhatsapp || !viewGoogle || !viewWhatsapp) return;

  tabGoogle.addEventListener("click", () => {
    tabGoogle.classList.add("bg-gold-500", "text-black", "font-bold");
    tabGoogle.classList.remove("text-gray-400", "hover:text-white");
    tabWhatsapp.classList.remove("bg-gold-500", "text-black", "font-bold");
    tabWhatsapp.classList.add("text-gray-400", "hover:text-white");

    viewGoogle.classList.remove("hidden");
    viewWhatsapp.classList.add("hidden");
  });

  tabWhatsapp.addEventListener("click", () => {
    tabWhatsapp.classList.add("bg-gold-500", "text-black", "font-bold");
    tabWhatsapp.classList.remove("text-gray-400", "hover:text-white");
    tabGoogle.classList.remove("bg-gold-500", "text-black", "font-bold");
    tabGoogle.classList.add("text-gray-400", "hover:text-white");

    viewWhatsapp.classList.remove("hidden");
    viewGoogle.classList.add("hidden");
  });
}

function initGoogleCalendarEmbed() {
  const container = document.getElementById("google-calendar-container");
  if (!container) return;

  // Si el usuario configuró una URL en BARBERIA_CONFIG o guardó una en localStorage
  const savedUrl = localStorage.getItem("barberia_dma_gcal_url") || BARBERIA_CONFIG.googleCalendarBookingUrl;

  if (savedUrl && savedUrl.trim().length > 0) {
    let cleanUrl = savedUrl.trim();
    if (!cleanUrl.includes("gv=true")) {
      cleanUrl += cleanUrl.includes("?") ? "&gv=true" : "?gv=true";
    }
    container.innerHTML = `
      <div class="w-full bg-[#151922] rounded-2xl overflow-hidden border border-gold-500/30 shadow-2xl relative min-h-[650px]">
        <div class="p-3 bg-brandDark-900 border-b border-gray-800 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-white font-semibold">Calendario Oficial Sincronizado en Tiempo Real</span>
          </div>
          <button onclick="cambiarEnlaceGoogleCalendar()" class="text-gray-400 hover:text-gold-400 text-[11px] underline">
            Cambiar enlace
          </button>
        </div>
        <iframe src="${cleanUrl}" width="100%" height="650" frameborder="0" class="w-full h-[650px] bg-white rounded-b-2xl" title="Página de citas Google Calendar Barbería DMA"></iframe>
      </div>
    `;
  } else {
    // Pantalla informativa de activación sencilla en 2 pasos
    container.innerHTML = `
      <div class="glass-card rounded-2xl p-6 sm:p-8 border border-gold-500/30 text-center max-w-2xl mx-auto">
        <div class="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 text-3xl mx-auto mb-4">
          📅
        </div>
        <h3 class="text-xl font-bold font-heading text-white uppercase mb-2">
          Páginas de Citas de Google Calendar (Auto-Bloqueo de Huecos)
        </h3>
        <p class="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6">
          Google Calendar incluye un sistema oficial y 100% gratuito de <strong>Programación de Citas</strong>. Cuando un cliente reserva un turno, <strong>el hueco desaparece automáticamente</strong> y te avisa a tu teléfono móvil.
        </p>

        <div class="text-left bg-brandDark-950 p-4 sm:p-5 rounded-xl border border-gray-800 space-y-3 mb-6 text-xs text-gray-300">
          <p class="font-bold text-gold-400 uppercase text-[11px] tracking-wider">Pasos para activarlo en 2 minutos:</p>
          <div class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center font-bold shrink-0">1</span>
            <span>Abre <a href="https://calendar.google.com" target="_blank" rel="noopener" class="text-gold-400 underline font-semibold">Google Calendar</a> en tu ordenador o móvil con tu cuenta de Google.</span>
          </div>
          <div class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center font-bold shrink-0">2</span>
            <span>Pulsa el botón <strong>+ Crear</strong> ➔ Selecciona <strong>"Programación de citas"</strong>.</span>
          </div>
          <div class="flex items-start gap-2.5">
            <span class="w-5 h-5 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center font-bold shrink-0">3</span>
            <span>Ajusta tu horario (L-V 10:30-13:30 / 15:00-20:00, Sáb 10:00-14:00) y pulsa <strong>Compartir</strong> para copiar tu enlace.</span>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onclick="pedirEnlaceGoogleCalendar()" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-gold-gradient text-black font-extrabold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all">
            Pegar mi enlace de Google Calendar
          </button>
          <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" class="w-full sm:w-auto px-5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs border border-gray-700 transition-colors">
            Abrir Google Calendar ↗
          </a>
        </div>
      </div>
    `;
  }
}

function pedirEnlaceGoogleCalendar() {
  const url = prompt(
    "Pega el enlace de tu 'Página de citas' de Google Calendar:\n(Ej: https://calendar.google.com/calendar/appointments/schedules/...)"
  );
  if (url && url.trim().length > 0) {
    localStorage.setItem("barberia_dma_gcal_url", url.trim());
    initGoogleCalendarEmbed();
  }
}

function cambiarEnlaceGoogleCalendar() {
  if (confirm("¿Quieres cambiar o actualizar el enlace de Google Calendar?")) {
    localStorage.removeItem("barberia_dma_gcal_url");
    initGoogleCalendarEmbed();
  }
}

/* ============================================================
   1. ESTADO DE APERTURA EN TIEMPO REAL (HORARIOS DE OVIEDO)
   ============================================================ */
function actualizarEstadoApertura() {
  const badgeElement = document.getElementById("status-badge");
  const textElement = document.getElementById("status-text");
  if (!badgeElement || !textElement) return;

  const ahora = new Date();
  // Formatear a hora local española
  const diaSemana = ahora.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const horas = ahora.getHours();
  const minutos = ahora.getMinutes();
  const horaActualDecimal = horas + minutos / 60;

  let estaAbierto = false;
  let mensajeExtra = "";

  if (diaSemana >= 1 && diaSemana <= 5) {
    // Lunes a Viernes: 10:30 - 13:30 (10.5 a 13.5) y 15:00 - 20:00 (15 a 20)
    if ((horaActualDecimal >= 10.5 && horaActualDecimal < 13.5) || (horaActualDecimal >= 15.0 && horaActualDecimal < 20.0)) {
      estaAbierto = true;
      if (horaActualDecimal < 13.5) {
        mensajeExtra = "• Cierra a las 13:30 (abre a las 15:00)";
      } else {
        mensajeExtra = "• Cierra a las 20:00";
      }
    } else if (horaActualDecimal < 10.5) {
      mensajeExtra = "• Abre hoy a las 10:30";
    } else if (horaActualDecimal >= 13.5 && horaActualDecimal < 15.0) {
      mensajeExtra = "• Pausa mediodía (reabre a las 15:00)";
    } else {
      mensajeExtra = diaSemana === 5 ? "• Abre mañana sábado a las 10:00" : "• Abre mañana a las 10:30";
    }
  } else if (diaSemana === 6) {
    // Sábado: 10:00 - 14:00 (10 a 14)
    if (horaActualDecimal >= 10.0 && horaActualDecimal < 14.0) {
      estaAbierto = true;
      mensajeExtra = "• Cierra a las 14:00";
    } else if (horaActualDecimal < 10.0) {
      mensajeExtra = "• Abre hoy a las 10:00";
    } else {
      mensajeExtra = "• Cerrado hasta el lunes a las 10:30";
    }
  } else {
    // Domingo
    mensajeExtra = "• Cerrado por descanso (Abre lunes a las 10:30)";
  }

  if (estaAbierto) {
    badgeElement.className = "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    badgeElement.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 pulse-indicator"></span> <span>ABIERTO AHORA</span> <span class="text-xs text-gray-300 font-normal hidden sm:inline">${mensajeExtra}</span>`;
  } else {
    badgeElement.className = "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30";
    badgeElement.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span> <span>CERRADO AHORA</span> <span class="text-xs text-gray-400 font-normal hidden sm:inline">${mensajeExtra}</span>`;
  }
}

/* ============================================================
   2. RENDER DE SERVICIOS
   ============================================================ */
function initServiciosUI() {
  // Render en la lista de servicios de la web
  const listaServiciosContenedor = document.getElementById("services-grid");
  if (listaServiciosContenedor) {
    listaServiciosContenedor.innerHTML = BARBERIA_CONFIG.servicios.map(s => `
      <div class="glass-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 relative group flex flex-col justify-between">
        ${s.popular ? `<span class="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-lg">Más pedido</span>` : ''}
        <div>
          <div class="flex items-start justify-between gap-4 mb-3">
            <h3 class="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">${s.nombre}</h3>
            <span class="text-2xl font-black text-amber-400 font-heading whitespace-nowrap">${s.precio}</span>
          </div>
          <p class="text-gray-400 text-sm leading-relaxed mb-4">${s.desc}</p>
        </div>
        <div class="pt-4 border-t border-gray-800/80 flex items-center justify-between mt-auto">
          <div class="flex items-center gap-1.5 text-xs text-gray-400">
            <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>${s.duracion} aprox.</span>
          </div>
          <button onclick="seleccionarServicioParaReserva('${s.id}')" class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-white transition-colors bg-amber-500/10 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg border border-amber-500/30">
            <span>Reservar</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>
      </div>
    `).join("");
  }

  // Render en el selector del formulario de reserva
  const bookingServicesContainer = document.getElementById("booking-service-options");
  if (bookingServicesContainer) {
    bookingServicesContainer.innerHTML = BARBERIA_CONFIG.servicios.map((s, idx) => `
      <div onclick="setServicioBooking('${s.id}')" id="booking-item-${s.id}" class="service-pill border border-gray-700/80 rounded-xl p-3.5 flex items-center justify-between ${idx === 0 ? 'active' : ''} bg-[#181c25] hover:border-amber-400/50">
        <div class="flex items-center gap-3">
          <div class="w-5 h-5 rounded-full border border-amber-400/60 flex items-center justify-center text-amber-400 check-icon ${idx === 0 ? 'opacity-100' : 'opacity-20'}">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-white">${s.nombre}</p>
            <p class="text-xs text-gray-400">${s.duracion}</p>
          </div>
        </div>
        <span class="text-base font-bold text-amber-400 font-heading">${s.precio}</span>
      </div>
    `).join("");
  }
}

function seleccionarServicioParaReserva(serviceId) {
  setServicioBooking(serviceId);
  const seccion = document.getElementById("reservas");
  if (seccion) {
    seccion.scrollIntoView({ behavior: "smooth" });
  }
}

function setServicioBooking(serviceId) {
  const encontrado = BARBERIA_CONFIG.servicios.find(s => s.id === serviceId);
  if (!encontrado) return;
  reservaState.servicioSeleccionado = encontrado;

  // Actualizar UI de pills
  BARBERIA_CONFIG.servicios.forEach(s => {
    const el = document.getElementById(`booking-item-${s.id}`);
    if (el) {
      if (s.id === serviceId) {
        el.classList.add("active");
        const icon = el.querySelector(".check-icon");
        if (icon) icon.classList.replace("opacity-20", "opacity-100");
      } else {
        el.classList.remove("active");
        const icon = el.querySelector(".check-icon");
        if (icon) icon.classList.replace("opacity-100", "opacity-20");
      }
    }
  });

  actualizarResumenReserva();
}

/* ============================================================
   3. CALENDARIO Y SELECTOR DE HORAS
   ============================================================ */
function initCalendarioUI() {
  const dateInput = document.getElementById("booking-date");
  if (!dateInput) return;

  // Fecha mínima: Hoy
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  const fechaMin = `${anio}-${mes}-${dia}`;
  dateInput.min = fechaMin;

  // Fecha máxima: 40 días vista
  const maxFechaObj = new Date();
  maxFechaObj.setDate(hoy.getDate() + 40);
  const maxAnio = maxFechaObj.getFullYear();
  const maxMes = String(maxFechaObj.getMonth() + 1).padStart(2, "0");
  const maxDia = String(maxFechaObj.getDate()).padStart(2, "0");
  dateInput.max = `${maxAnio}-${maxMes}-${maxDia}`;

  // Preseleccionar fecha: Hoy si aún está abierto, o mañana
  const diaHoySemana = hoy.getDay();
  let fechaInicial = fechaMin;
  if (diaHoySemana === 0) {
    // Si hoy es domingo, sugerir lunes
    const proxLunes = new Date();
    proxLunes.setDate(hoy.getDate() + 1);
    const pAnio = proxLunes.getFullYear();
    const pMes = String(proxLunes.getMonth() + 1).padStart(2, "0");
    const pDia = String(proxLunes.getDate()).padStart(2, "0");
    fechaInicial = `${pAnio}-${pMes}-${pDia}`;
  }

  dateInput.value = fechaInicial;
  reservaState.fecha = fechaInicial;

  generarHuecosHorarios(fechaInicial);

  dateInput.addEventListener("change", (e) => {
    const valor = e.target.value;
    if (!valor) return;

    // Verificar si seleccionó domingo
    const seleccion = new Date(valor + "T12:00:00");
    if (seleccion.getDay() === 0) {
      alert("⚠️ Los domingos estamos cerrados por descanso. Por favor, selecciona un día de lunes a sábado.");
      dateInput.value = "";
      reservaState.fecha = "";
      reservaState.hora = "";
      document.getElementById("time-slots-container").innerHTML = `<p class="text-xs text-amber-400 col-span-full py-3 text-center">Los domingos la barbería permanece cerrada. Elige otro día.</p>`;
      actualizarResumenReserva();
      return;
    }

    reservaState.fecha = valor;
    reservaState.hora = "";
    generarHuecosHorarios(valor);
    actualizarResumenReserva();
  });
}

function generarHuecosHorarios(fechaString) {
  const container = document.getElementById("time-slots-container");
  if (!container) return;

  const fechaObj = new Date(fechaString + "T12:00:00");
  const diaSemana = fechaObj.getDay();

  let slots = [];
  if (diaSemana >= 1 && diaSemana <= 5) {
    // Lunes a Viernes
    slots = [
      "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
    ];
  } else if (diaSemana === 6) {
    // Sábado
    slots = [
      "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"
    ];
  } else {
    // Domingo
    container.innerHTML = `<p class="text-xs text-amber-400 col-span-full py-2">Cerrado los domingos.</p>`;
    return;
  }

  // Si la fecha seleccionada es hoy, descartar horas pasadas
  const ahora = new Date();
  const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
  
  if (fechaString === hoyStr) {
    const horaActual = ahora.getHours();
    const minActual = ahora.getMinutes();
    slots = slots.filter(s => {
      const [h, m] = s.split(":").map(Number);
      return (h > horaActual) || (h === horaActual && m > minActual + 15);
    });
  }

  if (slots.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-400 col-span-full py-4 text-center">No quedan turnos disponibles para hoy. ¡Por favor selecciona otra fecha!</p>`;
    return;
  }

  container.innerHTML = slots.map((s, idx) => `
    <button type="button" onclick="setSlotHora('${s}')" class="time-slot-btn py-2 px-1 text-center rounded-lg border border-gray-700/80 text-xs text-gray-300 hover:border-amber-400 hover:text-white bg-[#151922] transition-colors" data-slot="${s}">
      ${s}
    </button>
  `).join("");

  // Preseleccionar el primer turno disponible
  setSlotHora(slots[0]);
}

function setSlotHora(slot) {
  reservaState.hora = slot;

  document.querySelectorAll(".time-slot-btn").forEach(btn => {
    if (btn.getAttribute("data-slot") === slot) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  actualizarResumenReserva();
}

/* ============================================================
   4. FORMULARIO Y CONFIRMACIÓN POR WHATSAPP
   ============================================================ */
function initFormularioReserva() {
  const nombreInput = document.getElementById("booking-name");
  const telInput = document.getElementById("booking-phone");
  const notasInput = document.getElementById("booking-notes");
  const form = document.getElementById("booking-form");

  if (nombreInput) {
    nombreInput.addEventListener("input", (e) => {
      reservaState.nombre = e.target.value.trim();
      actualizarResumenReserva();
    });
  }
  if (telInput) {
    telInput.addEventListener("input", (e) => {
      reservaState.telefono = e.target.value.trim();
    });
  }
  if (notasInput) {
    notasInput.addEventListener("input", (e) => {
      reservaState.notas = e.target.value.trim();
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      confirmarReservaWhatsApp();
    });
  }
}

function actualizarResumenReserva() {
  const servEl = document.getElementById("summary-service");
  const fechaEl = document.getElementById("summary-date");
  const precioEl = document.getElementById("summary-price");

  if (servEl && reservaState.servicioSeleccionado) {
    servEl.textContent = `${reservaState.servicioSeleccionado.nombre} (${reservaState.servicioSeleccionado.duracion})`;
  }

  if (fechaEl) {
    if (reservaState.fecha && reservaState.hora) {
      const partes = reservaState.fecha.split("-");
      const fObj = new Date(partes[0], partes[1] - 1, partes[2]);
      const opciones = { weekday: 'short', day: 'numeric', month: 'short' };
      const fechaFormateada = fObj.toLocaleDateString('es-ES', opciones);
      fechaEl.textContent = `${fechaFormateada} a las ${reservaState.hora}`;
    } else if (reservaState.fecha) {
      fechaEl.textContent = `${reservaState.fecha} (Selecciona hora)`;
    } else {
      fechaEl.textContent = "Elige fecha y hora";
    }
  }

  if (precioEl && reservaState.servicioSeleccionado) {
    precioEl.textContent = reservaState.servicioSeleccionado.precio;
  }
}

function confirmarReservaWhatsApp() {
  if (!reservaState.servicioSeleccionado) {
    alert("Por favor selecciona un servicio.");
    return;
  }
  if (!reservaState.fecha || !reservaState.hora) {
    alert("Por favor selecciona la fecha y la hora deseada.");
    return;
  }
  if (!reservaState.nombre) {
    const nombreInput = document.getElementById("booking-name");
    if (nombreInput) nombreInput.focus();
    alert("Por favor introduce tu nombre.");
    return;
  }

  // Formato legible de fecha en español
  const partes = reservaState.fecha.split("-");
  const fObj = new Date(partes[0], partes[1] - 1, partes[2]);
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const fechaCompleta = fObj.toLocaleDateString('es-ES', opciones);

  // Redactar mensaje estructurado
  let mensaje = `💈 *SOLICITUD DE CITA - BARBERÍA DMA*\n\n`;
  mensaje += `👋 ¡Hola! Me gustaría solicitar una cita:\n\n`;
  mensaje += `✂️ *Servicio:* ${reservaState.servicioSeleccionado.nombre} (${reservaState.servicioSeleccionado.precio})\n`;
  mensaje += `📅 *Fecha:* ${fechaCompleta}\n`;
  mensaje += `⏰ *Hora preferida:* ${reservaState.hora}\n`;
  mensaje += `👤 *A nombre de:* ${reservaState.nombre}\n`;
  if (reservaState.telefono) {
    mensaje += `📞 *Teléfono:* ${reservaState.telefono}\n`;
  }
  if (reservaState.notas) {
    mensaje += `💬 *Comentarios:* ${reservaState.notas}\n`;
  }
  mensaje += `\n¿Tenéis disponibilidad para confirmar? ¡Muchas gracias!`;

  // Abrir WhatsApp Web o App directamente
  const whatsappUrl = `https://wa.me/${BARBERIA_CONFIG.telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
  window.open(whatsappUrl, '_blank');
}

/* ============================================================
   5. MENU MOVIL Y UTILIDADES
   ============================================================ */
function initMobileMenu() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const menuNav = document.getElementById("mobile-menu-drawer");
  const closeBtn = document.getElementById("close-menu-btn");
  const links = document.querySelectorAll(".mobile-nav-link");

  if (!menuBtn || !menuNav) return;

  const toggle = () => {
    menuNav.classList.toggle("hidden");
  };

  menuBtn.addEventListener("click", toggle);
  if (closeBtn) closeBtn.addEventListener("click", toggle);

  links.forEach(l => {
    l.addEventListener("click", () => {
      menuNav.classList.add("hidden");
    });
  });
}

function initFaqAccordion() {
  const faqButtons = document.querySelectorAll(".faq-trigger");
  faqButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const targetContent = document.getElementById(targetId);
      const icon = btn.querySelector(".faq-icon");

      if (targetContent) {
        const isHidden = targetContent.classList.contains("hidden");
        // Cerrar otros
        document.querySelectorAll(".faq-content").forEach(c => c.classList.add("hidden"));
        document.querySelectorAll(".faq-icon").forEach(i => i.classList.remove("rotate-180"));

        if (isHidden) {
          targetContent.classList.remove("hidden");
          if (icon) icon.classList.add("rotate-180");
        }
      }
    });
  });
}
