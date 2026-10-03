// Estado de la app, guardado en localStorage del dispositivo.

const KEY = "estudio_v1";

export const SUBJECT_COLORS = ["#C2410C", "#1D4ED8", "#0F766E", "#7C3AED", "#BE185D", "#4D7C0F", "#475569"];

const DEFAULT_SUBJECTS = [
  {
    id: "calculo",
    name: "Cálculo",
    color: "#C2410C",
    topics: "Números reales y funciones, límites y continuidad, derivadas y aplicaciones, Taylor, integrales, sucesiones y series",
  },
  {
    id: "algebra",
    name: "Álgebra",
    color: "#1D4ED8",
    topics: "Matrices y determinantes, sistemas de ecuaciones lineales, espacios vectoriales, aplicaciones lineales, valores y vectores propios, diagonalización",
  },
  {
    id: "programario",
    name: "Programario de sistemas",
    color: "#0F766E",
    topics: "Línea de comandos de Linux, sistema de ficheros y permisos, scripts de shell, procesos, compilación y herramientas (edita esto con tu temario real)",
  },
  {
    id: "fundamentos",
    name: "Fundamentos de los computadores",
    color: "#7C3AED",
    topics: "Sistemas de numeración y representación de datos, álgebra de Boole, puertas lógicas, circuitos combinacionales, circuitos secuenciales, estructura básica del computador",
  },
  {
    id: "programacion",
    name: "Programación",
    color: "#BE185D",
    topics: "Variables y tipos, condicionales, bucles, funciones, vectores y matrices, cadenas, recursividad (indica aquí el lenguaje que usáis)",
  },
];

function defaults() {
  return {
    settings: {
      apiKey: "",
      model: "",
      hoursPerDay: 2,
      startTime: "17:00",
      days: [1, 2, 3, 4, 5, 6], // 0 = domingo
      context: "Primer semestre de Ingeniería Informática",
      tutorStyle: "explicar", // "explicar" | "guiar"
    },
    subjects: DEFAULT_SUBJECTS.map((s) => ({ ...s })),
    exams: [],
    plan: null, // { createdAt, summary, blocks: [...] }
    log: [], // { id, date, subjectId, minutes, blockId }
    chats: {}, // subjectId -> [{ role: "user" | "model", text, hadImage }]
    notebook: {}, // subjectId -> { topics: [{ id, name, lesson, attempts }] }
    games: {}, // id del minijuego -> récord
    seeded: {}, // temas incluidos que ya se han añadido al cuaderno
    session: null, // sesión de estudio en curso
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const d = defaults();
      // Reutiliza la clave de Gemini de la web GlowUp si ya existe en este navegador.
      const legacy = localStorage.getItem("gemini_api_key");
      if (legacy) d.settings.apiKey = legacy;
      return d;
    }
    const d = defaults();
    const parsed = JSON.parse(raw);
    return { ...d, ...parsed, settings: { ...d.settings, ...(parsed.settings || {}) } };
  } catch {
    return defaults();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("No se pudo guardar", e);
  }
}

export function get() {
  return state;
}

export function update(fn) {
  fn(state);
  save();
  listeners.forEach((l) => l(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function exportData() {
  const copy = JSON.parse(JSON.stringify(state));
  copy.settings.apiKey = "";
  return JSON.stringify(copy, null, 2);
}

export function importData(json) {
  const parsed = JSON.parse(json);
  if (!parsed || !Array.isArray(parsed.subjects)) throw new Error("El archivo no es una copia válida");
  const key = state.settings.apiKey;
  const d = defaults();
  state = { ...d, ...parsed, settings: { ...d.settings, ...(parsed.settings || {}), apiKey: key } };
  save();
  listeners.forEach((l) => l(state));
}

export function resetAll() {
  const key = state.settings.apiKey;
  state = defaults();
  state.settings.apiKey = key;
  save();
  listeners.forEach((l) => l(state));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ---------- Fechas (siempre en hora local) ----------

export function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

export function subjectById(id) {
  return state.subjects.find((s) => s.id === id);
}
