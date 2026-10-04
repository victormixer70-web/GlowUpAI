# ARENA MIX

Minijuegos de deportes (fútbol, baloncesto, béisbol y vóley) como app web instalable (PWA).

## Instalar en el móvil

1. Abre la app en el navegador del móvil: `https://victormixer70-web.github.io/GlowUpAI/arenamix/`
2. **Android (Chrome):** menú ⋮ → *Instalar aplicación* (o *Añadir a pantalla de inicio*).
3. **iPhone (Safari):** botón Compartir → *Añadir a pantalla de inicio*.

La app se abre a pantalla completa y en horizontal. Cada vez que se publica un cambio, la app se actualiza sola la próxima vez que la abres.

## Cómo está hecha

- `screens/*.dc.html` — las pantallas, las mismas que en el diseño de Claude (formato Design Component).
- `app.js` — un pequeño motor que lee esas pantallas y las ejecuta con Preact (plantillas `{{…}}`, `sc-for`, `sc-if`, `dc-import`, navegación entre pantallas).
- `vendor/` — Preact y three.js (gráficos 3D), incluidos para que funcione sin depender de otros servidores.
- `sw.js` — service worker: primero pide la versión nueva a la red (para que las actualizaciones lleguen) y usa la caché solo si no hay conexión.
- `manifest.webmanifest` + `icons/` — lo necesario para instalarla como app.

Para probarla en local: `python3 -m http.server` dentro de esta carpeta y abre `http://localhost:8000`.
