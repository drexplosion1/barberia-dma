/**
 * Barbería DMA - Oviedo
 * Motor de Citas & Sincronización en Tiempo Real (Firebase / Local)
 */

const BARBERIA_CONFIG = {
  nombre: "Barbería DMA",
  telefono: "+34610245360",
  telefonoLimpio: "34610245360",
  direccion: "C. Ignacio Herrero Garralda, 1, 33011 Oviedo, Asturias",
  googleMapsUrl: "https://maps.google.com/?q=Barberia+DMA+Oviedo+Ignacio+Herrero+Garralda+1",
  pinBarberoPorDefecto: "123456",
  firebaseConfig: {
    apiKey: "AIzaSyDuh_jztJVGXrJRyzbXcusIvRJq-fpkc4g",
    authDomain: "barberia-dma.firebaseapp.com",
    projectId: "barberia-dma",
    storageBucket: "barberia-dma.firebasestorage.app",
    messagingSenderId: "980211881562",
    appId: "1:980211881562:web:fa7c4f698e4614cf332a63"
  },
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

// Base de datos en memoria y cache
let DB_BLOQUEOS = {
  bloqueos: {} // {"2026-11-10": ["11:30", "16:00"]}
};
let DB_CITAS = []; // Array con todas las citas guardadas con cliente y notas

// Estado de reserva del cliente público
let reservaState = {
  servicioSeleccionado: BARBERIA_CONFIG.servicios[0],
  fecha: "",
  hora: "",
  nombre: "",
  telefono: "",
  notas: ""
};

// Estado de Administración
let adminState = {
  autenticado: false,
  fechaSeleccionada: "",
  pinGuardado: localStorage.getItem("dma_admin_pin") || BARBERIA_CONFIG.pinBarberoPorDefecto,
  citaEnEdicion: null // { fecha: "2026-11-10", hora: "11:30" }
};

// Contador de toques para acceso secreto
let secretLogoClicks = 0;
let secretLogoTimer = null;

// Instancia de Firebase Firestore
let firebaseDb = null;

// Inicialización limpia
document.addEventListener("DOMContentLoaded", () => {
  try {
    cargarCacheLocal();
    initServiciosUI();
    initCalendarioUI();
    initFormularioReserva();
    initPanelBarbero();
    initEditorCitaModal();
    initMobileMenu();
    initFaqAccordion();
    initSecretTriggers();
    initFirebase();
  } catch (err) {
    console.error("Error al iniciar:", err);
  }
});

/* ============================================================
   1. ACCESOS SECRETOS / OCULTOS PARA EL BARBERO
   ============================================================ */
function initSecretTriggers() {
  // Comprobar si entró con #admin o #barbero en la URL
  checkAdminHash();
  window.addEventListener("hashchange", checkAdminHash);
}

function checkAdminHash() {
  const hash = window.location.hash.toLowerCase();
  if (hash === "#admin" || hash === "#barbero" || hash === "#agenda") {
    abrirModalBarbero();
  }
}

// Triple toque en el logo ✂️ de la cabecera
window.handleSecretLogoClick = function(event) {
  if (event) event.preventDefault();
  secretLogoClicks++;
  clearTimeout(secretLogoTimer);

  if (secretLogoClicks >= 3) {
    secretLogoClicks = 0;
    abrirModalBarbero();
  } else {
    secretLogoTimer = setTimeout(() => {
      secretLogoClicks = 0;
    }, 1500); // 3 clics en menos de 1.5s
  }
};

/* ============================================================
   2. FIREBASE FIRESTORE EN TIEMPO REAL
   ============================================================ */
function initFirebase() {
  const statusBadge = document.getElementById("firebase-status-badge");
  const configTextarea = document.getElementById("firebase-config-input");

  let configToUse = null;
  const savedConfigStr = localStorage.getItem("dma_firebase_config");

  if (savedConfigStr) {
    try {
      configToUse = JSON.parse(savedConfigStr);
    } catch (e) {}
  } else if (BARBERIA_CONFIG.firebaseConfig && BARBERIA_CONFIG.firebaseConfig.projectId) {
    configToUse = BARBERIA_CONFIG.firebaseConfig;
  }

  if (configTextarea && configToUse) {
    configTextarea.value = JSON.stringify(configToUse, null, 2);
  }

  if (typeof firebase !== "undefined" && configToUse && configToUse.projectId) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(configToUse);
      }
      firebaseDb = firebase.firestore();

      if (statusBadge) {
        statusBadge.innerHTML = `
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-emerald-400 font-medium">Conectado a Firebase Firestore (Tiempo Real)</span>
        `;
      }

      // 1. Escuchar bloqueos de turnos
      firebaseDb.collection("bloqueos").onSnapshot((snapshot) => {
        snapshot.forEach((doc) => {
          const data = doc.data();
          DB_BLOQUEOS.bloqueos[doc.id] = data.horas || [];
        });
        localStorage.setItem("dma_bloqueos_cache", JSON.stringify(DB_BLOQUEOS));

        if (reservaState.fecha) {
          generarHuecosHorariosCliente(reservaState.fecha);
        }
        if (adminState.autenticado) {
          renderizarHorariosAdmin();
        }
      }, (err) => console.warn("Aviso Firestore bloqueos:", err));

      // 2. Escuchar todas las citas de clientes
      firebaseDb.collection("citas").onSnapshot((snapshot) => {
        const citasArray = [];
        snapshot.forEach((doc) => {
          citasArray.push({ id: doc.id, ...doc.data() });
        });
        DB_CITAS = citasArray;
        localStorage.setItem("dma_citas_cache", JSON.stringify(DB_CITAS));

        if (adminState.autenticado) {
          renderizarHorariosAdmin();
          buscarCitasAdmin();
        }
      }, (err) => console.warn("Aviso Firestore citas:", err));

      // 3. Escuchar PIN
      firebaseDb.collection("config").doc("seguridad").onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          if (data.pin && data.pin.length >= 4) {
            adminState.pinGuardado = data.pin;
            localStorage.setItem("dma_admin_pin", data.pin);
          }
        }
      }, (err) => console.warn("Aviso Firestore PIN:", err));

    } catch (err) {
      console.error("Error al inicializar Firebase:", err);
      mostrarEstadoLocal();
    }
  } else {
    mostrarEstadoLocal();
  }
}

function mostrarEstadoLocal() {
  const statusBadge = document.getElementById("firebase-status-badge");
  if (statusBadge) {
    statusBadge.innerHTML = `
      <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
      <span class="text-amber-400 font-medium">Modo Local Activo (Pruebas)</span>
    `;
  }
}

function guardarConfigFirebase() {
  const input = document.getElementById("firebase-config-input");
  if (!input) return;

  const raw = input.value.trim();
  if (!raw) return alert("Por favor introduce la configuración de Firebase.");

  try {
    let parsed = null;
    if (raw.startsWith("{")) {
      parsed = JSON.parse(raw);
    } else {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (parsed && parsed.projectId) {
      localStorage.setItem("dma_firebase_config", JSON.stringify(parsed));
      alert("✅ ¡Configuración de Firebase guardada! Recargando...");
      window.location.reload();
    } else {
      alert("❌ El formato no es válido o falta el projectId.");
    }
  } catch (e) {
    alert("❌ Error al procesar el JSON de Firebase.");
  }
}

function limpiarConfigFirebase() {
  if (confirm("¿Quieres eliminar la configuración de Firebase y volver al modo local?")) {
    localStorage.removeItem("dma_firebase_config");
    window.location.reload();
  }
}

function cargarCacheLocal() {
  const cachedBloqueos = localStorage.getItem("dma_bloqueos_cache");
  if (cachedBloqueos) {
    try { DB_BLOQUEOS = JSON.parse(cachedBloqueos); } catch (e) {}
  }
  const cachedCitas = localStorage.getItem("dma_citas_cache");
  if (cachedCitas) {
    try { DB_CITAS = JSON.parse(cachedCitas); } catch (e) {}
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
   4. CALENDARIO Y HUECOS DEL CLIENTE
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
    slotsBase = [
      "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
    ];
  } else if (diaSemana === 6) {
    slotsBase = [
      "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"
    ];
  } else {
    container.innerHTML = `<p class="text-xs text-amber-400 col-span-full py-2">Cerrado los domingos.</p>`;
    return;
  }

  const bloqueadosDelDia = (DB_BLOQUEOS.bloqueos && DB_BLOQUEOS.bloqueos[fechaString]) || [];
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

async function confirmarReservaWhatsApp() {
  if (!reservaState.servicioSeleccionado) return alert("Por favor selecciona un servicio.");
  if (!reservaState.fecha || !reservaState.hora) return alert("Por favor selecciona la fecha y una hora libre disponible.");
  if (!reservaState.nombre) {
    const nombreInput = document.getElementById("booking-name");
    if (nombreInput) nombreInput.focus();
    return alert("Por favor introduce tu nombre.");
  }

  const partes = reservaState.fecha.split("-");
  const fObj = new Date(partes[0], partes[1] - 1, partes[2]);
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const fechaCompleta = fObj.toLocaleDateString('es-ES', opciones);

  // 1. Guardar automáticamente la cita en memoria y Firebase
  const docId = `${reservaState.fecha}_${reservaState.hora.replace(':', '')}`;
  const citaCliente = {
    fecha: reservaState.fecha,
    hora: reservaState.hora,
    nombre: reservaState.nombre.trim(),
    telefono: (reservaState.telefono || "").trim(),
    servicio: reservaState.servicioSeleccionado.nombre,
    precio: reservaState.servicioSeleccionado.precio || "",
    notas: (reservaState.notas || "").trim(),
    estado: "pendiente",
    origen: "whatsapp_web",
    creadoEn: new Date().toISOString()
  };

  // Guardar en array local
  const cIdx = DB_CITAS.findIndex(c => c.id === docId || (c.fecha === citaCliente.fecha && c.hora === citaCliente.hora));
  if (cIdx > -1) {
    DB_CITAS[cIdx] = { id: docId, ...citaCliente };
  } else {
    DB_CITAS.push({ id: docId, ...citaCliente });
  }
  localStorage.setItem("dma_citas_cache", JSON.stringify(DB_CITAS));

  // Bloquear turno
  if (!DB_BLOQUEOS.bloqueos[reservaState.fecha]) {
    DB_BLOQUEOS.bloqueos[reservaState.fecha] = [];
  }
  if (!DB_BLOQUEOS.bloqueos[reservaState.fecha].includes(reservaState.hora)) {
    DB_BLOQUEOS.bloqueos[reservaState.fecha].push(reservaState.hora);
  }
  localStorage.setItem("dma_bloqueos_cache", JSON.stringify(DB_BLOQUEOS));

  // Guardar en Firestore en tiempo real
  if (firebaseDb) {
    try {
      await firebaseDb.collection("citas").doc(docId).set(citaCliente);
      await firebaseDb.collection("bloqueos").doc(reservaState.fecha).set({
        horas: DB_BLOQUEOS.bloqueos[reservaState.fecha]
      });
    } catch (err) {
      console.warn("Aviso al guardar cita cliente en Firestore:", err);
    }
  }

  // Refrescar los turnos para que no se pueda volver a pedir
  generarHuecosHorariosCliente(reservaState.fecha);

  let mensaje = `💈 *SOLICITUD DE CITA - BARBERÍA DMA*\n\n`;
  mensaje += `👋 ¡Hola! Me gustaría reservar cita:\n\n`;
  mensaje += `✂️ *Servicio:* ${reservaState.servicioSeleccionado.nombre} (${reservaState.servicioSeleccionado.precio})\n`;
  mensaje += `📅 *Fecha:* ${fechaCompleta}\n`;
  mensaje += `⏰ *Hora:* ${reservaState.hora}\n`;
  mensaje += `👤 *Nombre:* ${reservaState.nombre}\n`;
  if (reservaState.telefono) mensaje += `📞 *Teléfono:* ${reservaState.telefono}\n`;
  if (reservaState.notas) mensaje += `💬 *Notas:* ${reservaState.notas}\n`;
  mensaje += `\n¿Me confirmáis que os viene bien? ¡Muchas gracias!`;

  const whatsappUrl = `https://wa.me/${BARBERIA_CONFIG.telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
  window.open(whatsappUrl, '_blank');
}

/* ============================================================
   5. PANEL DEL BARBERO: AGENDA, BUSCADOR & GESTIÓN
   ============================================================ */
window.abrirModalBarbero = function() {
  const modal = document.getElementById("barber-modal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const authSection = document.getElementById("barber-auth-section");
  const manageSection = document.getElementById("barber-manage-section");
  const pinInput = document.getElementById("barber-pin-input");
  const adminDateInput = document.getElementById("admin-date-picker");

  if (adminState.autenticado) {
    if (authSection) authSection.classList.add("hidden");
    if (manageSection) manageSection.classList.remove("hidden");
    if (!adminState.fechaSeleccionada) {
      adminState.fechaSeleccionada = formatearFechaISO(new Date());
    }
    if (adminDateInput) adminDateInput.value = adminState.fechaSeleccionada;
    setSubTabAdmin("turnos");
    renderizarHorariosAdmin();
  } else {
    if (authSection) authSection.classList.remove("hidden");
    if (manageSection) manageSection.classList.add("hidden");
    if (pinInput) {
      pinInput.value = "";
      setTimeout(() => pinInput.focus(), 100);
    }
  }
};

window.cerrarModalBarbero = function() {
  const modal = document.getElementById("barber-modal");
  if (modal) modal.classList.add("hidden");
  // Limpiar hash si lo tenía
  if (window.location.hash) {
    history.replaceState(null, null, window.location.pathname);
  }
};

function cerrarSesionAdmin() {
  adminState.autenticado = false;
  const authSection = document.getElementById("barber-auth-section");
  const manageSection = document.getElementById("barber-manage-section");
  if (authSection) authSection.classList.remove("hidden");
  if (manageSection) manageSection.classList.add("hidden");
}

function setSubTabAdmin(tab) {
  const vTurnos = document.getElementById("subview-turnos");
  const vBuscador = document.getElementById("subview-buscador");
  const vPin = document.getElementById("subview-pin");
  const vFirebase = document.getElementById("subview-firebase");

  const bTurnos = document.getElementById("subtab-btn-turnos");
  const bBuscador = document.getElementById("subtab-btn-buscador");
  const bPin = document.getElementById("subtab-btn-pin");
  const bFirebase = document.getElementById("subtab-btn-firebase");

  [vTurnos, vBuscador, vPin, vFirebase].forEach(el => el && el.classList.add("hidden"));
  [bTurnos, bBuscador, bPin, bFirebase].forEach(b => {
    if (b) b.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white bg-gray-800/60 transition-all";
  });

  if (tab === "turnos" && vTurnos && bTurnos) {
    vTurnos.classList.remove("hidden");
    bTurnos.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gold-500 text-black transition-all";
    renderizarHorariosAdmin();
  } else if (tab === "buscador" && vBuscador && bBuscador) {
    vBuscador.classList.remove("hidden");
    bBuscador.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gold-500 text-black transition-all";
    buscarCitasAdmin();
  } else if (tab === "pin" && vPin && bPin) {
    vPin.classList.remove("hidden");
    bPin.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gold-500 text-black transition-all";
  } else if (tab === "firebase" && vFirebase && bFirebase) {
    vFirebase.classList.remove("hidden");
    bFirebase.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gold-500 text-black transition-all";
  }
}

function initPanelBarbero() {
  const pinForm = document.getElementById("barber-pin-form");
  const pinInput = document.getElementById("barber-pin-input");
  const authSection = document.getElementById("barber-auth-section");
  const manageSection = document.getElementById("barber-manage-section");
  const adminDateInput = document.getElementById("admin-date-picker");
  const formCambiarPin = document.getElementById("form-cambiar-pin");

  // Validación de PIN (acepta 1234, 123456 o el PIN personalizado)
  if (pinForm) {
    pinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const pin = pinInput.value.trim();
      const pinActualValido = adminState.pinGuardado || BARBERIA_CONFIG.pinBarberoPorDefecto;
      const esCorrecto = (pin === pinActualValido) || (pin === "123456") || (pin === "1234");

      if (esCorrecto) {
        adminState.autenticado = true;
        if (authSection) authSection.classList.add("hidden");
        if (manageSection) manageSection.classList.remove("hidden");

        const hoy = new Date();
        adminState.fechaSeleccionada = formatearFechaISO(hoy);
        if (adminDateInput) adminDateInput.value = adminState.fechaSeleccionada;

        setSubTabAdmin("turnos");
        renderizarHorariosAdmin();
      } else {
        alert("❌ PIN incorrecto.");
      }
    });
  }

  // Cambio de Fecha en Agenda
  if (adminDateInput) {
    adminDateInput.addEventListener("change", (e) => {
      adminState.fechaSeleccionada = e.target.value;
      renderizarHorariosAdmin();
    });
  }

  // Formulario Cambiar PIN
  if (formCambiarPin) {
    formCambiarPin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const actual = document.getElementById("pin-actual").value.trim();
      const nuevo = document.getElementById("pin-nuevo").value.trim();
      const repetir = document.getElementById("pin-repetir").value.trim();

      const pinValido = adminState.pinGuardado || BARBERIA_CONFIG.pinBarberoPorDefecto;
      const esActualValido = (actual === pinValido) || (actual === "123456") || (actual === "1234");

      if (!esActualValido) return alert("❌ El PIN actual no es correcto.");
      if (nuevo.length < 6) return alert("❌ El nuevo PIN debe tener al menos 6 dígitos.");
      if (nuevo !== repetir) return alert("❌ Los dos campos del nuevo PIN no coinciden.");

      adminState.pinGuardado = nuevo;
      localStorage.setItem("dma_admin_pin", nuevo);

      if (firebaseDb) {
        try {
          await firebaseDb.collection("config").doc("seguridad").set({ pin: nuevo });
        } catch (err) {
          console.warn("Aviso al guardar PIN en Firebase:", err);
        }
      }

      alert("✅ ¡PIN actualizado a " + nuevo + "! Ya puedes usarlo.");
      formCambiarPin.reset();
      setSubTabAdmin("turnos");
    });
  }
}

// Navegación rápida por días estilo libreta
window.cambiarDiaRelativo = function(delta) {
  const fechaActual = adminState.fechaSeleccionada || formatearFechaISO(new Date());
  const [y, m, d] = fechaActual.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  fecha.setDate(fecha.getDate() + delta);
  adminState.fechaSeleccionada = formatearFechaISO(fecha);
  const adminDateInput = document.getElementById("admin-date-picker");
  if (adminDateInput) adminDateInput.value = adminState.fechaSeleccionada;
  renderizarHorariosAdmin();
};

window.irADiaDirecto = function(offsetDias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + offsetDias);
  adminState.fechaSeleccionada = formatearFechaISO(fecha);
  const adminDateInput = document.getElementById("admin-date-picker");
  if (adminDateInput) adminDateInput.value = adminState.fechaSeleccionada;
  renderizarHorariosAdmin();
};

function renderizarHorariosAdmin() {
  const container = document.getElementById("admin-slots-grid");
  const fechaBadge = document.getElementById("admin-current-date-badge");
  const titleEl = document.getElementById("admin-notebook-date-title");
  const adminDateInput = document.getElementById("admin-date-picker");
  if (!container) return;

  const fecha = adminState.fechaSeleccionada || formatearFechaISO(new Date());
  if (adminDateInput) adminDateInput.value = fecha;

  const hoyStr = formatearFechaISO(new Date());
  const [y, m, d] = fecha.split("-").map(Number);
  const fObj = new Date(y, m - 1, d);
  const diaSemana = fObj.getDay();

  const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
  const fechaTxt = fObj.toLocaleDateString('es-ES', opciones);
  const esHoy = (fecha === hoyStr);

  if (titleEl) {
    titleEl.textContent = esHoy ? `📅 HOY • ${fechaTxt}` : `📅 ${fechaTxt}`;
  }
  if (fechaBadge) {
    fechaBadge.textContent = fecha;
  }

  let slots = [];
  if (diaSemana >= 1 && diaSemana <= 5) {
    slots = [
      "10:30", "11:00", "11:30", "12:00", "12:30", "13:00",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
    ];
  } else if (diaSemana === 6) {
    slots = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"];
  } else {
    container.innerHTML = `
      <div class="p-8 text-center bg-brandDark-950 rounded-2xl border border-gray-800 space-y-2">
        <p class="text-2xl">😴</p>
        <p class="text-sm font-bold text-white uppercase">Domingo - Cerrado</p>
        <p class="text-xs text-gray-400">Día de descanso semanal en Barbería DMA.</p>
        <button type="button" onclick="cambiarDiaRelativo(1)" class="mt-2 px-4 py-2 rounded-xl bg-gold-gradient text-black font-bold text-xs uppercase">
          Ver Lunes Siguiente ▶
        </button>
      </div>
    `;
    return;
  }

  const bloqueados = (DB_BLOQUEOS.bloqueos && DB_BLOQUEOS.bloqueos[fecha]) || [];

  container.innerHTML = slots.map(s => {
    const isBlocked = bloqueados.includes(s);
    const cita = DB_CITAS.find(c => c.fecha === fecha && c.hora === s);
    const nombreCliente = (cita && cita.nombre) ? cita.nombre : (isBlocked ? "Bloqueado por Barbero" : "");
    const estado = cita ? (cita.estado || "confirmada") : (isBlocked ? "bloqueado" : "libre");

    let badgeHtml = "";
    if (!isBlocked) {
      badgeHtml = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">🟢 LIBRE</span>`;
    } else if (estado === "pendiente") {
      badgeHtml = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">🟡 Pendiente</span>`;
    } else {
      badgeHtml = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">✅ Confirmada</span>`;
    }

    return `
      <div onclick="abrirEditorCita('${fecha}', '${s}')" class="p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${isBlocked ? (estado === 'pendiente' ? 'bg-[#1d1810] border-amber-500/40 hover:border-amber-400' : 'bg-[#141923] border-gray-800 hover:border-gold-500/50') : 'bg-brandDark-950/60 border-gray-800/80 hover:border-emerald-500/40'}">
        <div class="flex items-center justify-between gap-3">
          
          <div class="flex items-start sm:items-center gap-3 min-w-0">
            <span class="text-base sm:text-lg font-black font-mono text-gold-400 w-14 sm:w-16 flex-shrink-0 pt-0.5 sm:pt-0">${s}</span>
            
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-black text-sm text-white truncate">${isBlocked ? nombreCliente : '<span class="text-gray-500 font-normal">Hueco libre</span>'}</span>
                ${badgeHtml}
              </div>
              
              ${isBlocked && cita ? `
                <div class="text-[11px] text-gray-400 flex items-center gap-2 mt-1 flex-wrap">
                  ${cita.servicio ? `<span class="text-gold-400/90 font-medium">✂️ ${cita.servicio}</span>` : ''}
                  ${cita.telefono ? `<span>📞 ${cita.telefono}</span>` : ''}
                  ${cita.notas ? `<span class="text-gray-400 italic">💬 "${cita.notas}"</span>` : ''}
                </div>
              ` : ''}
            </div>
          </div>

          <div class="flex items-center gap-1.5 flex-shrink-0">
            ${isBlocked && cita && cita.telefono ? `
              ${estado === 'pendiente' ? `
                <button type="button" onclick="event.stopPropagation(); confirmarCitaPorWhatsAppRapido('${fecha}', '${s}')" title="Confirmar por WhatsApp al cliente" class="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] items-center gap-1 shadow-md shadow-emerald-950/50 transition-all">
                  <span>✅</span> <span>Confirmar</span>
                </button>
              ` : `
                <button type="button" onclick="event.stopPropagation(); recordarCitaPorWhatsAppRapido('${fecha}', '${s}')" title="Enviar recordatorio WhatsApp" class="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] items-center gap-1 transition-all">
                  <span>🔔</span> <span>Recordar</span>
                </button>
              `}
            ` : ''}

            <button type="button" onclick="event.stopPropagation(); abrirEditorCita('${fecha}', '${s}')" class="px-3 py-1.5 rounded-xl ${isBlocked ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gold-gradient text-black font-extrabold'} text-xs font-semibold transition-all">
              ${isBlocked ? '✏️ Ver' : '+ Apuntar'}
            </button>
          </div>

        </div>
      </div>
    `;
  }).join("");
}

/* ============================================================
   6. SUBMODAL: ASIGNAR / EDITAR CLIENTE Y NOTAS
   ============================================================ */
function initEditorCitaModal() {
  const form = document.getElementById("form-guardar-cita-admin");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!adminState.citaEnEdicion) return;

    const fecha = adminState.citaEnEdicion.fecha;
    const hora = adminState.citaEnEdicion.hora;
    const nombre = document.getElementById("edit-cliente-nombre").value.trim() || "Cliente Reservado";
    const telefono = document.getElementById("edit-cliente-tel").value.trim();
    const servicio = document.getElementById("edit-cliente-servicio").value;
    const notas = document.getElementById("edit-cliente-notas").value.trim();

    const citaExistente = DB_CITAS.find(c => (c.fecha === fecha && c.hora === hora));
    const estadoActual = (citaExistente && citaExistente.estado) ? citaExistente.estado : "confirmada";

    const citaObj = {
      fecha: fecha,
      hora: hora,
      nombre: nombre,
      telefono: telefono,
      servicio: servicio,
      notas: notas,
      estado: estadoActual,
      actualizadoEn: new Date().toISOString()
    };

    // 1. Guardar cita en memoria / cache
    const docId = `${fecha}_${hora.replace(':', '')}`;
    const idx = DB_CITAS.findIndex(c => c.id === docId || (c.fecha === fecha && c.hora === hora));
    if (idx > -1) {
      DB_CITAS[idx] = { id: docId, ...citaObj };
    } else {
      DB_CITAS.push({ id: docId, ...citaObj });
    }
    localStorage.setItem("dma_citas_cache", JSON.stringify(DB_CITAS));

    // 2. Bloquear turno
    if (!DB_BLOQUEOS.bloqueos[fecha]) DB_BLOQUEOS.bloqueos[fecha] = [];
    if (!DB_BLOQUEOS.bloqueos[fecha].includes(hora)) {
      DB_BLOQUEOS.bloqueos[fecha].push(hora);
    }
    localStorage.setItem("dma_bloqueos_cache", JSON.stringify(DB_BLOQUEOS));

    // 3. Sincronizar con Firebase Firestore
    if (firebaseDb) {
      try {
        await firebaseDb.collection("citas").doc(docId).set(citaObj);
        await firebaseDb.collection("bloqueos").doc(fecha).set({
          horas: DB_BLOQUEOS.bloqueos[fecha]
        });
      } catch (err) {
        console.warn("Aviso al guardar en Firestore:", err);
      }
    }

    cerrarEditorCita();
    renderizarHorariosAdmin();
    buscarCitasAdmin();
    if (reservaState.fecha) generarHuecosHorariosCliente(reservaState.fecha);
  });
}

window.abrirEditorCita = function(fecha, hora) {
  adminState.citaEnEdicion = { fecha, hora };

  const modal = document.getElementById("appointment-edit-modal");
  const timeLabel = document.getElementById("edit-modal-time-label");
  const statusBadge = document.getElementById("edit-modal-status-badge");
  const nombreInput = document.getElementById("edit-cliente-nombre");
  const telInput = document.getElementById("edit-cliente-tel");
  const servSelect = document.getElementById("edit-cliente-servicio");
  const notasInput = document.getElementById("edit-cliente-notas");
  const contactActions = document.getElementById("edit-contact-actions");
  const btnCall = document.getElementById("btn-call-client");
  const btnWhatsApp = document.getElementById("btn-whatsapp-client");

  if (!modal) return;

  const bloqueados = (DB_BLOQUEOS.bloqueos && DB_BLOQUEOS.bloqueos[fecha]) || [];
  const isBlocked = bloqueados.includes(hora);
  const cita = DB_CITAS.find(c => c.fecha === fecha && c.hora === hora);

  timeLabel.textContent = `📅 ${fecha} • ⏰ ${hora} h`;

  if (isBlocked) {
    if (cita && cita.estado === "pendiente") {
      statusBadge.textContent = "🟡 Pendiente de Confirmar";
      statusBadge.className = "text-[10px] font-sans py-0.5 px-2 rounded-full uppercase font-bold bg-amber-500 text-black";
    } else {
      statusBadge.textContent = "✅ Confirmada";
      statusBadge.className = "text-[10px] font-sans py-0.5 px-2 rounded-full uppercase font-bold bg-emerald-500 text-black";
    }
  } else {
    statusBadge.textContent = "🟢 Disponible";
    statusBadge.className = "text-[10px] font-sans py-0.5 px-2 rounded-full uppercase font-bold bg-emerald-500/20 text-emerald-400";
  }

  // Prellenar campos
  nombreInput.value = (cita && cita.nombre) ? cita.nombre : "";
  telInput.value = (cita && cita.telefono) ? cita.telefono : "";
  if (servSelect && cita && cita.servicio) servSelect.value = cita.servicio;
  notasInput.value = (cita && cita.notas) ? cita.notas : "";

  // Botones de llamada / whatsapp directa si hay teléfono
  if (cita && cita.telefono) {
    contactActions.classList.remove("hidden");
    let telLimpio = cita.telefono.replace(/\s+/g, '').replace('+', '');
    if (!telLimpio.startsWith('34') && telLimpio.length === 9) telLimpio = '34' + telLimpio;
    btnCall.href = `tel:+${telLimpio}`;
    btnWhatsApp.href = `https://wa.me/${telLimpio}?text=Hola%20${encodeURIComponent(cita.nombre || '')},%20te%20escribimos%20de%20Barber%C3%ADa%20DMA`;
  } else {
    contactActions.classList.add("hidden");
  }

  modal.classList.remove("hidden");
  setTimeout(() => nombreInput.focus(), 150);
};

window.cerrarEditorCita = function() {
  const modal = document.getElementById("appointment-edit-modal");
  if (modal) modal.classList.add("hidden");
  adminState.citaEnEdicion = null;
};

// Acciones rápidas de WhatsApp para el barbero
window.confirmarCitaPorWhatsAppRapido = async function(fecha, hora) {
  const cita = DB_CITAS.find(c => c.fecha === fecha && c.hora === hora);
  if (!cita || !cita.telefono) return alert("Esta cita no tiene teléfono del cliente registrado.");

  // Actualizar estado a confirmada
  cita.estado = "confirmada";
  localStorage.setItem("dma_citas_cache", JSON.stringify(DB_CITAS));
  if (firebaseDb) {
    const docId = `${fecha}_${hora.replace(':', '')}`;
    try {
      await firebaseDb.collection("citas").doc(docId).set(cita, { merge: true });
    } catch (e) {
      console.warn("Aviso Firestore al confirmar:", e);
    }
  }

  const [y, m, d] = fecha.split('-').map(Number);
  const fObj = new Date(y, m - 1, d);
  const fechaTxt = fObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  let tel = cita.telefono.replace(/\s+/g, '').replace('+', '');
  if (!tel.startsWith('34') && tel.length === 9) tel = '34' + tel;

  const msj = `💈 *BARBERÍA DMA - CITA CONFIRMADA*\n\n👋 ¡Hola ${cita.nombre}!\nTu cita queda confirmada para el *${fechaTxt}* a las *${hora} h*.\n✂️ Servicio: ${cita.servicio || 'Corte'}.\n📍 C. Ignacio Herrero Garralda, 1, Oviedo.\n\n¡Te esperamos!`;
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msj)}`, '_blank');
  renderizarHorariosAdmin();
};

window.recordarCitaPorWhatsAppRapido = function(fecha, hora) {
  const cita = DB_CITAS.find(c => c.fecha === fecha && c.hora === hora);
  if (!cita || !cita.telefono) return alert("Esta cita no tiene teléfono del cliente registrado.");

  const [y, m, d] = fecha.split('-').map(Number);
  const fObj = new Date(y, m - 1, d);
  const fechaTxt = fObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  let tel = cita.telefono.replace(/\s+/g, '').replace('+', '');
  if (!tel.startsWith('34') && tel.length === 9) tel = '34' + tel;

  const msj = `💈 *BARBERÍA DMA - RECORDATORIO*\n\n👋 ¡Hola ${cita.nombre}!\nTe recordamos tu cita para *${fechaTxt}* a las *${hora} h* en Barbería DMA.\n📍 C. Ignacio Herrero Garralda, 1, Oviedo.\n\nSi necesitas modificarla o surge cualquier imprevisto, avísanos por aquí. ¡Nos vemos pronto!`;
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msj)}`, '_blank');
};

window.confirmarCitaPorWhatsAppModal = function() {
  if (!adminState.citaEnEdicion) return;
  const { fecha, hora } = adminState.citaEnEdicion;
  confirmarCitaPorWhatsAppRapido(fecha, hora);
};

window.recordarCitaPorWhatsAppModal = function() {
  if (!adminState.citaEnEdicion) return;
  const { fecha, hora } = adminState.citaEnEdicion;
  recordarCitaPorWhatsAppRapido(fecha, hora);
};

window.liberarTurnoActualAdmin = async function() {
  if (!adminState.citaEnEdicion) return;
  const { fecha, hora } = adminState.citaEnEdicion;

  if (!confirm(`¿Quieres liberar el turno de las ${hora} del ${fecha}? Volverá a estar disponible para los clientes.`)) return;

  // 1. Quitar de bloqueos
  if (DB_BLOQUEOS.bloqueos[fecha]) {
    const idx = DB_BLOQUEOS.bloqueos[fecha].indexOf(hora);
    if (idx > -1) DB_BLOQUEOS.bloqueos[fecha].splice(idx, 1);
    if (DB_BLOQUEOS.bloqueos[fecha].length === 0) delete DB_BLOQUEOS.bloqueos[fecha];
  }
  localStorage.setItem("dma_bloqueos_cache", JSON.stringify(DB_BLOQUEOS));

  // 2. Borrar cita
  const docId = `${fecha}_${hora.replace(':', '')}`;
  const cIdx = DB_CITAS.findIndex(c => c.id === docId || (c.fecha === fecha && c.hora === hora));
  if (cIdx > -1) DB_CITAS.splice(cIdx, 1);
  localStorage.setItem("dma_citas_cache", JSON.stringify(DB_CITAS));

  // 3. Firestore
  if (firebaseDb) {
    try {
      await firebaseDb.collection("bloqueos").doc(fecha).set({
        horas: DB_BLOQUEOS.bloqueos[fecha] || []
      });
      await firebaseDb.collection("citas").doc(docId).delete();
    } catch (err) {
      console.warn("Aviso Firestore al liberar:", err);
    }
  }

  cerrarEditorCita();
  renderizarHorariosAdmin();
  buscarCitasAdmin();
  if (reservaState.fecha) generarHuecosHorariosCliente(reservaState.fecha);
};

/* ============================================================
   7. BUSCADOR INTELIGENTE DE CITAS & CLIENTES
   ============================================================ */
window.buscarCitasAdmin = function() {
  const input = document.getElementById("admin-search-input");
  const resultsContainer = document.getElementById("admin-search-results");
  if (!resultsContainer) return;

  const query = input ? input.value.trim().toLowerCase() : "";

  // Filtrar citas
  let filtradas = DB_CITAS.slice();

  if (query.length > 0) {
    filtradas = filtradas.filter(c => {
      const nom = (c.nombre || "").toLowerCase();
      const tel = (c.telefono || "").toLowerCase();
      const serv = (c.servicio || "").toLowerCase();
      const not = (c.notas || "").toLowerCase();
      const fec = (c.fecha || "").toLowerCase();
      return nom.includes(query) || tel.includes(query) || serv.includes(query) || not.includes(query) || fec.includes(query);
    });
  }

  // Ordenar por fecha y hora
  filtradas.sort((a, b) => {
    const da = `${a.fecha}T${a.hora}`;
    const db = `${b.fecha}T${b.hora}`;
    return da.localeCompare(db);
  });

  if (filtradas.length === 0) {
    resultsContainer.innerHTML = `
      <div class="text-center py-8 text-gray-500 text-xs bg-brandDark-950 rounded-xl border border-gray-800">
        ${query ? `No se encontraron citas que coincidan con "${query}".` : 'No hay citas registradas todavía.'}
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = filtradas.map(c => `
    <div class="p-3.5 rounded-xl bg-brandDark-950 border border-gray-800 hover:border-gold-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="space-y-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-mono font-bold text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded-md border border-gold-500/20">${c.fecha} • ${c.hora}</span>
          <span class="text-xs font-bold text-white">${c.nombre || 'Sin nombre'}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${c.estado === 'confirmada' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'}">
            ${c.estado === 'confirmada' ? '✅ Confirmada' : '🟡 Pendiente'}
          </span>
        </div>
        <p class="text-xs text-gray-400 font-medium">${c.servicio || 'Servicio no especificado'}</p>
        ${c.notas ? `<p class="text-[11px] text-gray-500 italic">💬 "${c.notas}"</p>` : ''}
      </div>

      <div class="flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800 flex-wrap">
        ${c.telefono ? `
          <button type="button" onclick="confirmarCitaPorWhatsAppRapido('${c.fecha}', '${c.hora}')" class="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-bold transition-all" title="Confirmar Cita por WhatsApp">
            ✅ Confirmar
          </button>
          <button type="button" onclick="recordarCitaPorWhatsAppRapido('${c.fecha}', '${c.hora}')" class="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-all" title="Enviar recordatorio WhatsApp">
            🔔 Recordar
          </button>
        ` : ''}
        <button type="button" onclick="abrirEditorCita('${c.fecha}', '${c.hora}')" class="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gold-400 border border-gray-700 text-xs font-bold transition-all">
          ✏️ Ver
        </button>
      </div>
    </div>
  `).join("");
};

/* ============================================================
   8. UTILIDADES
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
