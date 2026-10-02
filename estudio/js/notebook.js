// Cuaderno: temas por asignatura, lecciones generadas por la IA, evaluaciones y estadísticas.

import * as store from "./store.js";
import { generateJSON, streamChat, DEFAULT_MODEL } from "./gemini.js";

// ---------- datos ----------

export function notebook(subjectId) {
  return store.get().notebook?.[subjectId] || { topics: [] };
}

export function topicById(subjectId, topicId) {
  return notebook(subjectId).topics.find((t) => t.id === topicId);
}

function updateNotebook(subjectId, fn) {
  store.update((st) => {
    st.notebook ||= {};
    st.notebook[subjectId] ||= { topics: [] };
    fn(st.notebook[subjectId]);
  });
}

export function addTopic(subjectId, name) {
  name = name.trim().slice(0, 80);
  if (!name) return null;
  const existing = notebook(subjectId).topics.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing.id;
  const id = store.uid();
  updateNotebook(subjectId, (nb) => nb.topics.push({ id, name, lesson: null, attempts: [] }));
  return id;
}

export function importTopicsFromSyllabus(subjectId) {
  const sub = store.subjectById(subjectId);
  const names = (sub?.topics || "")
    .replace(/\([^)]*\)/g, "")
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
  names.forEach((n) => addTopic(subjectId, n.charAt(0).toUpperCase() + n.slice(1)));
  return names.length;
}

export function deleteTopic(subjectId, topicId) {
  updateNotebook(subjectId, (nb) => (nb.topics = nb.topics.filter((t) => t.id !== topicId)));
}

export function saveLesson(subjectId, topicId, text) {
  updateNotebook(subjectId, (nb) => {
    const t = nb.topics.find((x) => x.id === topicId);
    if (t) t.lesson = { text, createdAt: new Date().toISOString() };
  });
}

export function saveAttempt(subjectId, topicId, attempt) {
  updateNotebook(subjectId, (nb) => {
    const t = nb.topics.find((x) => x.id === topicId);
    if (!t) return;
    t.attempts.push(attempt);
    if (t.attempts.length > 30) t.attempts = t.attempts.slice(-30);
  });
}

// ---------- estadísticas ----------

const RECENT = 5; // el nivel actual se mide con las últimas evaluaciones

export function topicStats(topic) {
  const recent = topic.attempts.slice(-RECENT);
  const answers = recent.flatMap((a) => a.answers);
  const correct = answers.filter((a) => a.correct).length;
  const concepts = {};
  for (const a of answers) {
    const key = a.concept || "General";
    concepts[key] ||= { name: key, correct: 0, total: 0, topic: topic.name, topicId: topic.id };
    concepts[key].total++;
    if (a.correct) concepts[key].correct++;
  }
  const last = topic.attempts[topic.attempts.length - 1];
  return {
    attempts: topic.attempts.length,
    total: answers.length,
    correct,
    accuracy: answers.length ? correct / answers.length : null,
    last: last ? { correct: last.correct, total: last.total } : null,
    concepts: Object.values(concepts).map((c) => ({ ...c, accuracy: c.correct / c.total })),
  };
}

// Resumen de una asignatura: dónde falla y dónde acierta más.
export function subjectStats(subjectId) {
  const topics = notebook(subjectId).topics.map((t) => ({ topic: t, stats: topicStats(t) }));
  const evaluated = topics.filter((x) => x.stats.total > 0);
  const total = evaluated.reduce((a, x) => a + x.stats.total, 0);
  const correct = evaluated.reduce((a, x) => a + x.stats.correct, 0);
  // Conceptos con al menos 2 preguntas; si hay pocos, se usan los temas.
  let items = evaluated.flatMap((x) => x.stats.concepts).filter((c) => c.total >= 2);
  if (items.length < 2) {
    items = evaluated.map((x) => ({ name: x.topic.name, topic: x.topic.name, topicId: x.topic.id, correct: x.stats.correct, total: x.stats.total, accuracy: x.stats.accuracy }));
  }
  const weak = [...items].filter((c) => c.accuracy < 0.7).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total).slice(0, 3);
  const strong = [...items].filter((c) => c.accuracy >= 0.7).sort((a, b) => b.accuracy - a.accuracy || b.total - a.total).slice(0, 3);
  return { total, correct, accuracy: total ? correct / total : null, weak, strong, topics };
}

// Conceptos flojos de una asignatura, para que el tutor y el plan los tengan en cuenta.
export function weakSummary(subjectId) {
  return subjectStats(subjectId)
    .weak.map((c) => (c.name === c.topic ? `${c.name} (${Math.round(c.accuracy * 100)}% de acierto)` : `${c.name} — tema «${c.topic}» (${Math.round(c.accuracy * 100)}% de acierto)`))
    .join("; ");
}

// ---------- IA ----------

const FORMAT = `Formato (se lee en el móvil):
- Markdown con títulos ### cortos, listas numeradas para los pasos y **negrita** solo para lo esencial. Párrafos cortos.
- Todas las fórmulas en LaTeX: $...$ en línea y $$...$$ en bloque. Nunca matemáticas en texto plano (nada de x^2 ni sqrt(x)).
- Código en bloques \`\`\` con el lenguaje y comentarios breves; muestra la salida esperada.
- Tablas Markdown cuando ayuden (tablas de verdad, comparaciones, conversiones).
- Español de España. Sin frases de relleno.`;

function settings() {
  const s = store.get().settings;
  return { apiKey: s.apiKey, model: s.model || DEFAULT_MODEL, context: s.context };
}

export async function generateLesson({ subjectId, topicId, focusNote, onText, signal }) {
  const sub = store.subjectById(subjectId);
  const topic = topicById(subjectId, topicId);
  const { apiKey, model, context } = settings();
  const weak = topicStats(topic).concepts.filter((c) => c.accuracy < 0.7).map((c) => c.name);
  const system = `Eres un profesor universitario excelente que escribe apuntes claros y rigurosos para un estudiante de ${context}. Explicas como el mejor profesor que haya tenido: primero la intuición, luego lo formal, y siempre con ejemplos resueltos paso a paso justificando cada paso. Compruebas tus cálculos antes de escribirlos.\n\n${FORMAT}`;
  const prompt = `Escribe una lección completa sobre el tema «${topic.name}» de la asignatura ${sub?.name}.
Temario de la asignatura (para situar el tema y usar la misma notación): ${sub?.topics || "no especificado"}.
${focusNote ? `El estudiante pide que se centre en: ${focusNote}\n` : ""}${weak.length ? `En sus evaluaciones falla sobre todo en: ${weak.join(", ")}. Dedícales más explicación y ejemplos.\n` : ""}
Estructura:
### Qué vas a aprender
3-5 puntos.
### La idea clave
La intuición en lenguaje llano, con una analogía si ayuda.
### Teoría
Definiciones, propiedades, fórmulas o reglas, explicando qué significa cada símbolo.
### Ejemplos resueltos
2-4 ejemplos de dificultad creciente hasta nivel de examen, resueltos paso a paso.
### Errores típicos
Los fallos más comunes y cómo evitarlos.
### Resumen para repasar
Una chuleta breve con lo esencial.`;
  return streamChat({ apiKey, model, system, history: [{ role: "user", parts: [{ text: prompt }] }], onText, signal });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIFFICULTY = {
  facil: "fácil: comprobar que entiende los conceptos básicos y aplica las reglas directamente",
  media: "media: problemas típicos de clase que combinan dos o tres ideas",
  examen: "nivel examen: problemas completos como los de un parcial, con trampas habituales",
};

export async function generateQuiz({ subjectId, topicId, count, difficulty, targetWeak }) {
  const sub = store.subjectById(subjectId);
  const topic = topicById(subjectId, topicId);
  const { apiKey, model, context } = settings();
  const stats = topicStats(topic);
  const weak = stats.concepts.filter((c) => c.accuracy < 0.7).map((c) => c.name);
  const known = [...new Set(stats.concepts.map((c) => c.name))];
  const previous = topic.attempts
    .slice(-3)
    .flatMap((a) => a.answers.map((x) => x.question))
    .slice(-20);

  const system = `Eres un profesor que diseña evaluaciones tipo test para un estudiante de ${context}. Tus preguntas miden comprensión y capacidad de resolver, no memoria. Respondes SOLO con JSON válido.`;
  const prompt = `Crea una evaluación de ${count} preguntas tipo test sobre el tema «${topic.name}» de ${sub?.name}.
Temario de la asignatura: ${sub?.topics || "no especificado"}.
Dificultad: ${DIFFICULTY[difficulty] || DIFFICULTY.media}.
${targetWeak && weak.length ? `Al menos la mitad de las preguntas deben trabajar estos conceptos en los que falla: ${weak.join(", ")}.\n` : weak.length ? `Conceptos en los que suele fallar (inclúyelos): ${weak.join(", ")}.\n` : ""}${topic.lesson ? `Basa las preguntas en lo que explica esta lección:\n"""\n${topic.lesson.text.slice(0, 6000)}\n"""\n` : ""}${previous.length ? `No repitas estas preguntas de evaluaciones anteriores:\n${previous.map((q) => `- ${q}`).join("\n")}\n` : ""}
Reglas:
- Cada pregunta tiene exactamente 4 opciones y una sola correcta.
- Mezcla preguntas conceptuales y de cálculo/aplicación. En las de cálculo, las opciones incorrectas deben ser resultados de errores típicos reales.
- Resuelve tú cada pregunta antes de marcar la correcta y comprueba que ninguna otra opción también lo es.
- "concepto": el subtema concreto que evalúa, en 2-5 palabras (p. ej. "Regla de la cadena"). Usa nombres consistentes entre preguntas${known.length ? ` y reutiliza estos cuando encajen: ${known.join(", ")}` : ""}.
- "explicacion": por qué la correcta es correcta, paso a paso si hay cálculo, y por qué falla la trampa más probable. 2-6 frases.
- Fórmulas en LaTeX con $...$ (recuerda escapar las barras invertidas en JSON: "\\\\frac"). Código entre \`comillas\` o en bloque \`\`\`.
- En español de España.

Devuelve:
{"preguntas":[{"enunciado":"...","opciones":["...","...","...","..."],"correcta":0,"concepto":"...","explicacion":"..."}]}`;

  const result = await generateJSON({ apiKey, model, system, prompt });
  const questions = (Array.isArray(result.preguntas) ? result.preguntas : [])
    .filter((q) => q && q.enunciado && Array.isArray(q.opciones) && q.opciones.length >= 2 && Number.isInteger(q.correcta) && q.opciones[q.correcta] !== undefined)
    .slice(0, count)
    .map((q) => {
      // Baraja las opciones para que la correcta no caiga siempre en la misma letra.
      const opts = shuffle(q.opciones.map((text, i) => ({ text: String(text), correct: i === q.correcta })));
      return {
        question: String(q.enunciado),
        options: opts.map((o) => o.text),
        answer: opts.findIndex((o) => o.correct),
        concept: String(q.concepto || "General").slice(0, 60),
        explanation: String(q.explicacion || ""),
      };
    });
  if (!questions.length) throw new Error("La IA no devolvió preguntas válidas. Vuelve a intentarlo.");
  return questions;
}
