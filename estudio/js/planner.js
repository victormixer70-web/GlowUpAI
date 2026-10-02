// Generación del plan de estudio con Gemini.

import * as store from "./store.js";
import { generateJSON } from "./gemini.js";
import { weakSummary } from "./notebook.js";

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const KINDS = ["teoria", "ejercicios", "repaso", "practica", "simulacro"];

const SYSTEM = `Eres un planificador de estudio experto para estudiantes universitarios de ingeniería.
Creas planes realistas, concretos y equilibrados:
- Reparte las asignaturas para que ninguna se quede atrás, pero da más peso a las que tienen examen cerca.
- Alterna teoría con ejercicios; cada tema nuevo se repasa a los pocos días (repaso espaciado).
- En los últimos días antes de un examen, programa repasos y un simulacro de examen.
- Bloques de 25 a 90 minutos. No superes las horas diarias indicadas.
- Cada bloque tiene una tarea concreta y accionable (qué hacer exactamente), no vaguedades.
Responde SOLO con JSON válido.`;

export async function generatePlan({ extraNotes = "" } = {}) {
  const s = store.get();
  const today = store.isoDate();
  const upcoming = s.exams.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const lastExam = upcoming.length ? upcoming[upcoming.length - 1].date : null;
  let horizon = 14;
  if (lastExam) horizon = Math.min(28, Math.max(7, store.daysBetween(today, lastExam) + 1));
  const end = store.addDays(today, horizon - 1);

  const studyDates = [];
  for (let i = 0; i < horizon; i++) {
    const d = store.addDays(today, i);
    if (s.settings.days.includes(store.parseDate(d).getDay())) studyDates.push(d);
  }
  if (!studyDates.length) throw new Error("Elige al menos un día de estudio en Ajustes.");

  const subjects = s.subjects
    .map((x) => {
      const weak = weakSummary(x.id);
      return `- id "${x.id}": ${x.name}. Temario: ${x.topics || "(sin detallar)"}${weak ? `. Según sus evaluaciones le cuesta: ${weak} (dale repasos extra)` : ""}`;
    })
    .join("\n");
  const exams = upcoming.length
    ? upcoming
        .map((e) => `- ${e.date} (${DAY_NAMES[store.parseDate(e.date).getDay()]}): ${e.title || "Examen"} de ${store.subjectById(e.subjectId)?.name || e.subjectId}${e.topics ? `. Entra: ${e.topics}` : ""}`)
        .join("\n")
    : "- No hay exámenes registrados: haz un plan de seguimiento continuo de todas las asignaturas.";

  // Lo ya estudiado ayuda a no repetir y a continuar donde se quedó.
  const done = (s.plan?.blocks || [])
    .filter((b) => b.done)
    .slice(-25)
    .map((b) => `- ${b.date}: ${store.subjectById(b.subjectId)?.name || b.subjectId} · ${b.topic}`)
    .join("\n");

  const prompt = `Estudiante: ${s.settings.context}.
Hoy es ${today} (${DAY_NAMES[store.parseDate(today).getDay()]}).
Planifica desde ${today} hasta ${end}.
Días de estudio disponibles (usa SOLO estas fechas): ${studyDates.join(", ")}.
Tiempo por día: unas ${s.settings.hoursPerDay} horas, empezando hacia las ${s.settings.startTime}.

Asignaturas:
${subjects}

Exámenes:
${exams}
${done ? `\nYa ha estudiado recientemente:\n${done}\n` : ""}${extraNotes ? `\nPeticiones del estudiante: ${extraNotes}\n` : ""}
Devuelve este JSON:
{
  "resumen": "2-3 frases explicando la estrategia del plan",
  "bloques": [
    {
      "fecha": "YYYY-MM-DD",
      "hora": "HH:MM",
      "asignatura": "uno de los ids de arriba",
      "tema": "tema concreto, corto",
      "minutos": 45,
      "tipo": "teoria | ejercicios | repaso | practica | simulacro",
      "tarea": "qué hacer exactamente en este bloque, 1-2 frases"
    }
  ]
}`;

  const result = await generateJSON({ apiKey: s.settings.apiKey, model: s.settings.model, system: SYSTEM, prompt });
  const ids = new Set(s.subjects.map((x) => x.id));
  const allowed = new Set(studyDates);
  const blocks = (Array.isArray(result.bloques) ? result.bloques : [])
    .filter((b) => b && ids.has(b.asignatura) && allowed.has(b.fecha))
    .map((b) => ({
      id: store.uid(),
      date: b.fecha,
      start: /^\d{1,2}:\d{2}$/.test(b.hora || "") ? b.hora.padStart(5, "0") : s.settings.startTime,
      subjectId: b.asignatura,
      topic: String(b.tema || "Estudio").slice(0, 120),
      minutes: Math.min(120, Math.max(15, Math.round(Number(b.minutos) || 45))),
      kind: KINDS.includes(b.tipo) ? b.tipo : "ejercicios",
      task: String(b.tarea || "").slice(0, 400),
      done: false,
    }))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  if (!blocks.length) throw new Error("Gemini no devolvió un plan utilizable. Vuelve a intentarlo.");

  store.update((st) => {
    // Conserva lo pasado y lo ya hecho; sustituye lo pendiente desde hoy.
    const kept = (st.plan?.blocks || []).filter((b) => b.date < today || b.done);
    st.plan = {
      createdAt: new Date().toISOString(),
      summary: String(result.resumen || ""),
      until: end,
      blocks: [...kept, ...blocks].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
    };
  });
}

export const KIND_LABEL = {
  teoria: "Teoría",
  ejercicios: "Ejercicios",
  repaso: "Repaso",
  practica: "Práctica",
  simulacro: "Simulacro",
};
