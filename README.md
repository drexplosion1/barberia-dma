# 💈 Barbería DMA - Oviedo | Web & Sistema de Reservas (Zero Server)

Sitio web oficial y motor interactivo de reservas para **Barbería DMA** (C. Ignacio Herrero Garralda, 1, 33011 Oviedo, Asturias).

Diseñado específicamente para funcionar **100% sin servidores**, sin costes mensuales y listo para alojarse de forma gratuita y para siempre en **GitHub Pages**.

---

## ✨ Características Principales

1. **Sin servidores ni bases de datos de pago (100% Gratis)**:
   - Funciona íntegramente con HTML5, Tailwind CSS y JavaScript vanilla en el navegador del cliente.
   - Se puede alojar gratis en **GitHub Pages** con certificado SSL / HTTPS incluido.

2. **Sistema de Reservas Automatizado con Auto-Bloqueo**:
   - **Google Calendar (Programación de Citas Oficial)**: Los clientes ven únicamente los huecos libres reales. En cuanto alguien reserva, **ese hueco desaparece automáticamente** de la web para evitar reservas dobles y se sincroniza en el calendario del móvil del barbero. Si el barbero añade cualquier evento personal o festivo a su Google Calendar, ese horario queda bloqueado al instante en la web.
   - **WhatsApp Directo (Alternativa)**: Para clientes que prefieran enviar un mensaje rápido con sus datos al `+34 610 24 53 60`.
   - **Atención telefónica directa**: Acceso en un toque para llamadas al `+34 610 24 53 60`.

3. **Detector de Horario en Tiempo Real**:
   - Muestra dinámicamente si la barbería está **🟢 ABIERTO AHORA** o **🟡 CERRADO AHORA** según la hora y día de la semana en Oviedo:
     - *Lunes a viernes:* 10:30 – 13:30 y 15:00 – 20:00
     - *Sábados:* 10:00 – 14:00
     - *Domingos:* Cerrado por descanso

4. **Diseño Barbería Urbana & Clásica**:
   - Paleta de color oscura y dorada vintage (*Dark Charcoal & Warm Gold*).
   - Mención de la mesa de billar en la sala de espera, toalla caliente y servicios aptos para niños.
   - Reseñas destacadas (**4.9 / 5 estrellas**).
   - Mapa interactivo integrado de Google Maps en Calle Ignacio Herrero Garralda, 1.
   - Barra flotante inferior para móviles con acceso directo a reservas, llamada telefónica y ubicación.

---

## 🚀 Cómo probarlo en local

Puedes probar la web en tu ordenador abriendo directamente el archivo `index.html` en cualquier navegador, o ejecutando un servidor local ligero:

```bash
cd /Users/usuario/Desktop/Proyectos/barberiadma
python3 -m http.server 8000
```
Luego abre en tu navegador: `http://localhost:8000`

---

## 🌐 Cómo publicarlo GRATIS en GitHub Pages (En 2 minutos)

1. **Crea un repositorio en GitHub**:
   - Entra en [GitHub.com](https://github.com) y crea un nuevo repositorio (por ejemplo `barberia-dma`).
   - Puedes marcarlo como **Público**.

2. **Sube los archivos desde tu terminal**:
   ```bash
   cd /Users/usuario/Desktop/Proyectos/barberiadma
   git init
   git add .
   git commit -m "Web oficial y sistema de reservas Barberia DMA"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/barberia-dma.git
   git push -u origin main
   ```

3. **Activar GitHub Pages**:
   - En tu repositorio de GitHub, entra en **Settings** (Configuración) -> pestaña **Pages** (en el menú lateral izquierdo).
   - En **Build and deployment > Source**, selecciona **Deploy from a branch**.
   - En **Branch**, selecciona `main` y la carpeta `/(root)`, y haz clic en **Save**.
   - En unos segundos tendrás tu web funcionando en:  
     `https://TU_USUARIO.github.io/barberia-dma/` (o con tu propio dominio `.es` o `.com` si lo deseas más adelante).

---

## 📅 Cómo activar la Programación de Citas de Google Calendar (2 minutos)

Google Calendar incluye una función oficial 100% gratuita llamada **"Programación de citas"** que se encarga del auto-bloqueo:

1. Entra en [calendar.google.com](https://calendar.google.com) desde tu ordenador o móvil con tu cuenta de Gmail/Google.
2. Haz clic en el botón superior **+ Crear** y selecciona **"Programación de citas"**.
3. Configura:
   - **Título**: Cita en Barbería DMA (Oviedo).
   - **Duración**: 30 minutos (o el tiempo que prefieras).
   - **Horario de disponibilidad**:
     - *Lunes a viernes:* 10:30 a 13:30 y 15:00 a 20:00
     - *Sábados:* 10:00 a 14:00
     - *Domingos:* Sin disponibilidad
4. Pulsa **Guardar** y luego haz clic en **Compartir** para copiar el enlace de tu página de reservas.
5. Puedes pegarlo en la web con el botón *"Pegar mi enlace de Google Calendar"* o añadirlo en `js/app.js` en la variable `googleCalendarBookingUrl`.

---

## ⚙️ Cómo personalizar precios, servicios o teléfono

Todos los datos están centralizados al principio del archivo [`js/app.js`](file:///Users/usuario/Desktop/Proyectos/barberiadma/js/app.js) en el objeto `BARBERIA_CONFIG`:

```javascript
const BARBERIA_CONFIG = {
  nombre: "Barbería DMA",
  telefono: "+34610245360",
  telefonoLimpio: "34610245360",
  direccion: "C. Ignacio Herrero Garralda, 1, 33011 Oviedo, Asturias",
  ...
  servicios: [
    {
      id: "corte-caballero",
      nombre: "Corte de Pelo Caballero",
      desc: "...",
      duracion: "30 min",
      precio: "15€",
      popular: true
    },
    ...
  ]
};
```

Cualquier cambio que hagas ahí se reflejará automáticamente tanto en la carta de la web como en el selector interactivo de reservas.

---

## 📍 Datos del Negocio
- **Dirección**: C. Ignacio Herrero Garralda, 1, 33011 Oviedo, Asturias
- **Teléfono / WhatsApp**: +34 610 24 53 60
- **Valoración**: 4.9 ★ (Google Reviews)
