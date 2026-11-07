/**
 * Barbería DMA - Oviedo
 * Motor interactivo de citas (Zero Server con GitHub como Base de Datos)
 */

const BARBERIA_CONFIG = {
  nombre: "Barbería DMA",
  telefono: "+34610245360",
  telefonoLimpio: "34610245360",
  direccion: "C. Ignacio Herrero Garralda, 1, 33011 Oviedo, Asturias",
  googleMapsUrl: "https://maps.google.com/?q=Barberia+DMA+Oviedo+Ignacio+Herrero+Garralda+1",
  githubRepo: "drexplosion1/barberia-dma",
  pinBarberoPorDefecto: "1234",
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

// Base de datos de bloqueos (cargada desde data/bloqueos.json o localStorage)
let DB_BLOQUEOS = {
  bloqueos: {}, // {"2026-11-10": ["11:30", "16:00"]}
  citas: []
};
let DB_FILE_SHA = null;

// Estado del formulario de reserva del cliente
let reservaState = {
  servicioSeleccionado: BARBERIA_CONFIG.servicios[0],
  fecha: "",
  hora: "",
  nombre: "",
  telefono: "",
  notas: ""
};

// Estado del Panel Barbero
let adminState = {
  autenticado: false,
  fechaSeleccionada: "",
  githubToken: localStorage.getItem("dma_github_token") || "",
  pinGuardado: localStorage.getItem("dma_admin_pin") || BARBERIA_CONFIG.pinBarberoPorDefecto
};

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
  actualizarEstadoApertura();
  setInterval(actualizarEstadoApertura, 60000);

  initServiciosUI();
  await cargarBloqueosDesdeGitHub();
  initCalendarioUI();
  initFormularioReserva();
  initPanelBarbero();
  initMobileMenu();
  initFaqAccordion();
});

/* ============================================================
   1. ESTADO DE APERTURA EN TIEMPO REAL
   ============================================================ */
function actualizarEstadoApertura() {
  const badgeElement = document.getElementById("status-badge");
  if (!badgeElement) return;

  const ahora = new Date();
  const diaSemana = ahora.getDay(); // 0 = Dom, 1 = Lun, ..., 6 = Sáb
  const horas = ahora.getHours();
  const minutos = ahora.getMinutes();
  const horaActualDecimal = horas + minutos / 60;

  let estaAbierto = false;
  let mensajeExtra = "";

  if (diaSemana >= 1 && diaSemana <= 5) {
    // L-V: 10:30-13:30 y 15:00-20:00
    if ((horaActualDecimal >= 10.5 && horaActualDecimal < 13.5) || (horaActualDecimal >= 15.0 && horaActualDecimal < 20.0)) {
      estaAbierto = true;
      mensajeExtra = horaActualDecimal < 13.5 ? "• Cierra a las 13:30 (reabre 15:00)" : "• Cierra a las 20:00";
    } else if (horaActualDecimal < 10.5) {
      mensajeExtra = "• Abre hoy a las 10:30";
    } else if (horaActualDecimal >= 13.5 && horaActualDecimal < 15.0) {
      mensajeExtra = "• Pausa mediodía (abre 15:00)";
    } else {
      mensajeExtra = diaSemana === 5 ? "• Abre mañana sábado a las 10:00" : "• Abre mañana a las 10:30";
    }
  } else if (diaSemana === 6) {
    // Sábado: 10:00 - 14:00
    if (horaActualDecimal >= 10.0 && horaActualDecimal < 14.0) {
      estaAbierto = true;
      mensajeExtra = "• Cierra a las 14:00";
    } else if (horaActualDecimal < 10.0) {
      mensajeExtra = "• Abre hoy a las 10:00";
    } else {
      mensajeExtra = "• Cerrado hasta el lunes a las 10:30";
    }
  } else {
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
   2. GITHUB COMO BASE DE DATOS (CARGA Y GUARDADO DE BLOQUEOS)
   ============================================================ */
async function cargarBloqueosDesdeGitHub() {
  try {
    // Intentar leer primero con timestamp para evitar cache
    const url = `data/bloqueos.json?nocache=${Date.now()}`;
    const res = await fetch(url);
    if (res.ok) {
      const datos = await res.json();
      DB_BLOQUEOS = datos || { bloqueos: {}, citas: [] };
      localStorage.setItem("dma_bloqueos_cache", JSON.stringify(DB_BLOQUEOS));
    } else {
      // Fallback a localStorage
      const cached = localStorage.getItem("dma_bloqueos_cache");
      if (cached) DB_BLOQUEOS = JSON.parse(cached);
    }
  } catch (err) {
    console.warn("Aviso al cargar data/bloqueos.json, usando cache local", err);
    const cached = localStorage.getItem("dma_bloqueos_cache");
    if (cached) DB_BLOQUEOS = JSON.parse(cached);
  }
}

/* ============================================================
   3. RENDER DE SERVICIOS
   ============================================================ */
function initServiciosUI() {
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
  if (seccion) seccion.scrollIntoView({ behavior: "smooth" });
}

function setServicioBooking(serviceId) {
  const encontrado = BARBERIA_CONFIG.servicios.find(s => s.id === serviceId);
  if (!encontrado) return;
  reservaState.servicioSeleccionado = encontrado;

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
   4. CALENDARIO Y HUECOS LIBRES/OCUPADOS DEL CLIENTE
   ============================================================ */
function initCalendarioUI() {
  const dateInput = document.getElementById("booking-date");
  if (!dateInput) return;

  const hoy = new Date();
  const fechaMin = formatearFechaISO(hoy);
  dateInput.min = fechaMin;

  const maxFechaObj = new Date();
  maxFechaObj.setDate(hoy.getDate() + 40);
  dateInput.max = formatearFechaISO(maxFechaObj);

  let fechaInicial = fechaMin;
  if (hoy.getDay() === 0) {
    // Si hoy es domingo, sugerir lunes
    const proxLunes = new Date();
    proxLunes.setDate(hoy.getDate() + 1);
    fechaInicial = formatearFechaISO(proxLunes);
  }

  dateInput.value = fechaInicial;
  reservaState.fecha = fechaInicial;

  generarHuecosHorariosCliente(fechaInicial);

  dateInput.addEventListener("change", (e) => {
    const valor = e.target.value;
    if (!valor) return;

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
    generarHuecosHorariosCliente(valor);
    actualizarResumenReserva();
  });
}

function generarHuecosHorariosCliente(fechaString) {
  const container = document.getElementById("time-slots-container");
  if (!container) return;

  const fechaObj = new Date(fechaString + "T12:00:00");
  const diaSemana = fechaObj.getDay();

  let slotsBase = [];
  if (diaSemana >= 1 && diaSemana <= 5) {
    // L-V
    slotsBase = [
      "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
    ];
  } else if (diaSemana === 6) {
    // Sábado
    slotsBase = [
      "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"
    ];
  } else {
    container.innerHTML = `<p class="text-xs text-amber-400 col-span-full py-2">Cerrado los domingos.</p>`;
    return;
  }

  // Comprobar qué horas están bloqueadas por el barbero
  const bloqueadosDelDia = (DB_BLOQUEOS.bloqueos && DB_BLOQUEOS.bloqueos[fechaString]) || [];

  // Filtrar horas ya pasadas si la fecha es hoy
  const hoyStr = formatearFechaISO(new Date());
  const ahora = new Date();
  const horaActual = ahora.getHours();
  const minActual = ahora.getMinutes();

  let primerHuecoDisponible = null;

  container.innerHTML = slotsBase.map((s) => {
    let esPasada = false;
    if (fechaString === hoyStr) {
      const [h, m] = s.split(":").map(Number);
      if (h < horaActual || (h === horaActual && m <= minActual + 15)) {
        esPasada = true;
      }
    }

    const estaBloqueada = bloqueadosDelDia.includes(s);

    if (esPasada) {
      return `
        <button type="button" disabled class="py-2 px-1 text-center rounded-lg border border-gray-800 text-[11px] text-gray-600 bg-[#0d0f14] cursor-not-allowed opacity-50" title="Hora ya pasada">
          <span>${s}</span>
          <span class="block text-[8px] text-gray-600">Pasada</span>
        </button>
      `;
    }

    if (estaBloqueada) {
      return `
        <button type="button" disabled class="py-2 px-1 text-center rounded-lg border border-red-500/20 text-[11px] text-red-400/60 bg-red-950/20 cursor-not-allowed line-through" title="Hora ocupada por otro cliente">
          <span>${s}</span>
          <span class="block text-[8px] text-red-400/80 uppercase font-semibold">Ocupado</span>
        </button>
      `;
    }

    // Libre y disponible
    if (!primerHuecoDisponible) primerHuecoDisponible = s;

    return `
      <button type="button" onclick="setSlotHora('${s}')" class="time-slot-btn py-2 px-1 text-center rounded-lg border border-gray-700/80 text-xs text-gray-200 hover:border-amber-400 hover:text-white bg-[#151922] transition-colors" data-slot="${s}">
        <span>${s}</span>
        <span class="block text-[8px] text-emerald-400 font-semibold">Libre</span>
      </button>
    `;
  }).join("");

  if (primerHuecoDisponible) {
    setSlotHora(primerHuecoDisponible);
  } else {
    reservaState.hora = "";
    actualizarResumenReserva();
  }
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
      fechaEl.textContent = `${reservaState.fecha} (Elige turno libre)`;
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
    alert("Por favor selecciona la fecha y una hora libre disponible.");
    return;
  }
  if (!reservaState.nombre) {
    const nombreInput = document.getElementById("booking-name");
    if (nombreInput) nombreInput.focus();
    alert("Por favor introduce tu nombre.");
    return;
  }

  const partes = reservaState.fecha.split("-");
  const fObj = new Date(partes[0], partes[1] - 1, partes[2]);
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const fechaCompleta = fObj.toLocaleDateString('es-ES', opciones);

  let mensaje = `💈 *SOLICITUD DE CITA - BARBERÍA DMA*\n\n`;
  mensaje += `👋 ¡Hola! Me gustaría reservar cita:\n\n`;
  mensaje += `✂️ *Servicio:* ${reservaState.servicioSeleccionado.nombre} (${reservaState.servicioSeleccionado.precio})\n`;
  mensaje += `📅 *Fecha:* ${fechaCompleta}\n`;
  mensaje += `⏰ *Hora:* ${reservaState.hora}\n`;
  mensaje += `👤 *Nombre:* ${reservaState.nombre}\n`;
  if (reservaState.telefono) {
    mensaje += `📞 *Teléfono:* ${reservaState.telefono}\n`;
  }
  if (reservaState.notas) {
    mensaje += `💬 *Notas:* ${reservaState.notas}\n`;
  }
  mensaje += `\n¿Me confirmáis que os viene bien? ¡Gracias!`;

  const whatsappUrl = `https://wa.me/${BARBERIA_CONFIG.telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
  window.open(whatsappUrl, '_blank');
}

/* ============================================================
   5. PANEL DEL BARBERO: BLOQUEO DIRECTO DE HUECOS CON 1 CLIC
   ============================================================ */
function initPanelBarbero() {
  const modal = document.getElementById("barber-modal");
  const openBtns = document.querySelectorAll(".btn-open-barber-panel");
  const closeBtn = document.getElementById("btn-close-barber-modal");
  const pinForm = document.getElementById("barber-pin-form");
  const pinInput = document.getElementById("barber-pin-input");
  const authSection = document.getElementById("barber-auth-section");
  const manageSection = document.getElementById("barber-manage-section");
  const adminDateInput = document.getElementById("admin-date-picker");

  if (!modal) return;

  openBtns.forEach(b => {
    b.addEventListener("click", () => {
      modal.classList.remove("hidden");
      if (adminState.autenticado) {
        authSection.classList.add("hidden");
        manageSection.classList.remove("hidden");
        renderizarHorariosAdmin();
      } else {
        authSection.classList.remove("hidden");
        manageSection.classList.add("hidden");
        if (pinInput) {
          pinInput.value = "";
          pinInput.focus();
        }
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  // Validación de PIN
  if (pinForm) {
    pinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const pin = pinInput.value.trim();
      if (pin === adminState.pinGuardado || pin === "1234") {
        adminState.autenticado = true;
        authSection.classList.add("hidden");
        manageSection.classList.remove("hidden");

        const hoy = new Date();
        adminState.fechaSeleccionada = formatearFechaISO(hoy);
        if (adminDateInput) adminDateInput.value = adminState.fechaSeleccionada;

        renderizarHorariosAdmin();
      } else {
        alert("❌ PIN incorrecto. (El PIN por defecto es 1234)");
      }
    });
  }

  if (adminDateInput) {
    adminDateInput.addEventListener("change", (e) => {
      adminState.fechaSeleccionada = e.target.value;
      renderizarHorariosAdmin();
    });
  }
}

function renderizarHorariosAdmin() {
  const container = document.getElementById("admin-slots-grid");
  const fechaBadge = document.getElementById("admin-current-date-badge");
  if (!container) return;

  const fecha = adminState.fechaSeleccionada || formatearFechaISO(new Date());
  if (fechaBadge) {
    fechaBadge.textContent = fecha;
  }

  const fObj = new Date(fecha + "T12:00:00");
  const diaSemana = fObj.getDay();

  let slots = [];
  if (diaSemana >= 1 && diaSemana <= 5) {
    slots = [
      "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
    ];
  } else if (diaSemana === 6) {
    slots = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"];
  } else {
    container.innerHTML = `<p class="col-span-full py-4 text-center text-xs text-amber-400">Domingo: día de descanso cerrado.</p>`;
    return;
  }

  const bloqueados = (DB_BLOQUEOS.bloqueos && DB_BLOQUEOS.bloqueos[fecha]) || [];

  container.innerHTML = slots.map(s => {
    const isBlocked = bloqueados.includes(s);
    return `
      <button type="button" onclick="toggleBloqueoAdmin('${fecha}', '${s}')" class="p-3 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${isBlocked ? 'bg-red-950/40 border-red-500/60 text-red-300' : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 hover:scale-105'}">
        <span class="text-sm">${s}</span>
        <span class="text-[9px] uppercase tracking-wider py-0.5 px-2 rounded-full ${isBlocked ? 'bg-red-500 text-black font-extrabold' : 'bg-emerald-500/20 text-emerald-400'}">
          ${isBlocked ? '🔴 Ocupada' : '🟢 Libre'}
        </span>
      </button>
    `;
  }).join("");
}

function toggleBloqueoAdmin(fecha, hora) {
  if (!DB_BLOQUEOS.bloqueos) DB_BLOQUEOS.bloqueos = {};
  if (!DB_BLOQUEOS.bloqueos[fecha]) DB_BLOQUEOS.bloqueos[fecha] = [];

  const index = DB_BLOQUEOS.bloqueos[fecha].indexOf(hora);
  if (index > -1) {
    // Desbloquear
    DB_BLOQUEOS.bloqueos[fecha].splice(index, 1);
    if (DB_BLOQUEOS.bloqueos[fecha].length === 0) {
      delete DB_BLOQUEOS.bloqueos[fecha];
    }
  } else {
    // Bloquear
    DB_BLOQUEOS.bloqueos[fecha].push(hora);
  }

  // Guardar en cache local de inmediato
  localStorage.setItem("dma_bloqueos_cache", JSON.stringify(DB_BLOQUEOS));

  // Refrescar vistas
  renderizarHorariosAdmin();
  if (reservaState.fecha) {
    generarHuecosHorariosCliente(reservaState.fecha);
  }
}

// Guardar en GitHub (Commit automático a data/bloqueos.json)
async function guardarCambiosEnGitHub() {
  const token = adminState.githubToken || localStorage.getItem("dma_github_token");
  const statusEl = document.getElementById("admin-save-status");

  if (!token) {
    const nuevoToken = prompt(
      "Para sincronizar con GitHub automáticamente, pega tu GitHub Personal Access Token:\n(Si aún no tienes uno, puedes generarlo gratis en github.com/settings/tokens o usar el botón de abajo para copiar el archivo)"
    );
    if (nuevoToken && nuevoToken.trim().length > 0) {
      adminState.githubToken = nuevoToken.trim();
      localStorage.setItem("dma_github_token", adminState.githubToken);
    } else {
      return;
    }
  }

  if (statusEl) {
    statusEl.textContent = "⏳ Guardando en GitHub...";
    statusEl.className = "text-xs text-amber-400 font-semibold";
  }

  try {
    const repo = BARBERIA_CONFIG.githubRepo;
    const path = "data/bloqueos.json";
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

    // Obtener SHA actual del archivo
    let sha = DB_FILE_SHA;
    const getRes = await fetch(apiUrl, {
      headers: {
        "Authorization": `Bearer ${adminState.githubToken}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    const jsonContent = JSON.stringify(DB_BLOQUEOS, null, 2);
    // Codificar a base64 UTF-8 compatible
    const contentBase64 = btoa(unescape(encodeURIComponent(jsonContent)));

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${adminState.githubToken}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Actualización de horas bloqueadas - Barbería DMA",
        content: contentBase64,
        sha: sha || undefined
      })
    });

    if (putRes.ok) {
      const dataResp = await putRes.json();
      DB_FILE_SHA = dataResp.content.sha;
      if (statusEl) {
        statusEl.textContent = "✅ ¡Guardado con éxito en GitHub!";
        statusEl.className = "text-xs text-emerald-400 font-bold";
      }
      alert("✅ ¡Horas actualizadas y guardadas en GitHub! Los clientes ya verán esos huecos bloqueados.");
    } else {
      const errData = await putRes.json();
      throw new Error(errData.message || "Error al subir a GitHub");
    }
  } catch (err) {
    console.error("Error al guardar en GitHub:", err);
    if (statusEl) {
      statusEl.textContent = "⚠️ Guardado solo en este teléfono (Revisa el Token de GitHub)";
      statusEl.className = "text-xs text-amber-400";
    }
    alert(`Nota: Los cambios quedan guardados en este dispositivo. Para sincronizarlo globalmente a todos los clientes, revisa tu Token de GitHub o sube el archivo data/bloqueos.json.`);
  }
}

function copiarJsonParaGitHub() {
  const jsonContent = JSON.stringify(DB_BLOQUEOS, null, 2);
  navigator.clipboard.writeText(jsonContent).then(() => {
    alert("📋 Contenido de bloqueos copiado al portapapeles. Puedes pegarlo en GitHub en el archivo data/bloqueos.json");
  }).catch(() => {
    prompt("Copia este texto y pégalo en data/bloqueos.json en GitHub:", jsonContent);
  });
}

/* ============================================================
   UTILIDADES
   ============================================================ */
function formatearFechaISO(d) {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${a}-${m}-${dia}`;
}

function initMobileMenu() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const menuNav = document.getElementById("mobile-menu-drawer");
  const closeBtn = document.getElementById("close-menu-btn");
  const links = document.querySelectorAll(".mobile-nav-link");

  if (!menuBtn || !menuNav) return;

  const toggle = () => menuNav.classList.toggle("hidden");
  menuBtn.addEventListener("click", toggle);
  if (closeBtn) closeBtn.addEventListener("click", toggle);

  links.forEach(l => {
    l.addEventListener("click", () => menuNav.classList.add("hidden"));
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
