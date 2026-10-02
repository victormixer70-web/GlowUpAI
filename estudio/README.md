# Estudio · Tutor IA

App móvil (PWA) para organizar el estudio de Ingeniería Informática con ayuda de Google Gemini.

- **Hoy:** los bloques de estudio del día, el siguiente bloque y un temporizador de sesión.
- **Plan:** añades tus exámenes y la IA reparte el temario de cada asignatura en bloques diarios según tus horas y días libres. Se puede rehacer cuando quieras sin perder lo ya hecho.
- **Tutor:** chat por asignatura que explica paso a paso, pone ejercicios y lee fotos de problemas. Muestra fórmulas (LaTeX) y código.
- **Progreso:** racha, minutos por día frente a tu meta, tiempo por asignatura y cuenta atrás de exámenes.
- **Ajustes:** clave de Gemini, modelo, horario, asignaturas y temario, copia de seguridad.

Todo se guarda en el propio móvil (`localStorage`); no hay servidor. La clave de Gemini solo se envía a Google.

## Usarla en el móvil

1. Publica la carpeta `estudio/` en cualquier hosting estático con HTTPS (por ejemplo GitHub Pages: `https://<usuario>.github.io/GlowUpAI/estudio/`).
2. Ábrela en el móvil e instálala:
   - **iPhone (Safari):** Compartir → «Añadir a pantalla de inicio».
   - **Android (Chrome):** menú ⋮ → «Instalar aplicación».
3. En **Ajustes**, pega tu clave de [Google AI Studio](https://aistudio.google.com/apikey) y pulsa *Guardar*.
4. Revisa el temario de cada asignatura, añade tus exámenes en **Plan** y pulsa *Crear plan con IA*.

## Probarla en el ordenador

```bash
cd estudio
npx serve .   # o: python3 -m http.server 8000
```

Abre la dirección que indique (hace falta un servidor; abrir `index.html` directamente no funciona por los módulos JS).

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html`, `styles.css` | Estructura y estilos (modo claro y oscuro) |
| `js/app.js` | Pantallas, navegación, sesión de estudio y tutor |
| `js/planner.js` | Prompt y validación del plan generado por la IA |
| `js/gemini.js` | Llamadas a la API de Gemini (normal y en streaming) |
| `js/store.js` | Datos guardados en el dispositivo y asignaturas por defecto |
| `js/markdown.js` | Markdown + fórmulas de las respuestas del tutor |
| `sw.js`, `manifest.webmanifest`, `icons/` | Instalación como app y funcionamiento sin conexión |
| `vendor/` | marked, DOMPurify y KaTeX (licencias incluidas) |
