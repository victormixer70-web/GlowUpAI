# ARENA MIX

Minijuegos de deportes (fútbol, baloncesto, tenis y vóley) como app web instalable (PWA).

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

## Créditos

- Estadio: "New Football Map" (https://sketchfab.com/3d-models/new-football-map-5993a290e7df41b9ac554c205ff22199) de kyrox, licencia CC BY 4.0. Convertido a `assets/stadium/stadium.glb` (centrado en el campo, sin sus porterías ni vallas).
- Cielo e iluminación: HDRI "Orlando Stadium" de Poly Haven (CC0).
- Personajes y animaciones: Mixamo.
