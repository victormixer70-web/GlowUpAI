/* =========================================================
   GlowCore: cerebro compartido entre GlowUp y J.A.R.V.I.S
   - Clave de Gemini
   - Elección automática del modelo (Google retira modelos con el tiempo)
   - Memoria de conversaciones compartida (localStorage, mismo origen)
   ========================================================= */
(function () {
  const KEY_STORAGE = 'gemini_api_key';
  const MEMORY_STORAGE = 'glowup_memory_v1';
  const MAX_CONVERSATIONS = 40;
  const MAX_MESSAGE_CHARS = 12000;
  const API = 'https://generativelanguage.googleapis.com/v1beta';

  // Respaldo por si no se puede consultar la lista de modelos
  const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash'];
  // Errores por los que merece la pena probar otro modelo: no existe o servidor saturado
  const RETRY_STATUS = [404, 429, 500, 503];

  const safeGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const safeSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
  const safeDel = k => { try { localStorage.removeItem(k); } catch {} };

  /* ---------- Clave ---------- */
  let models = null;

  function getKey() { return safeGet(KEY_STORAGE); }

  function askKey(message) {
    const current = getKey() || '';
    const k = prompt(message || 'Introduce tu API Key de Google Gemini (gratis en aistudio.google.com/apikey):', current);
    if (k && k.trim()) {
      safeSet(KEY_STORAGE, k.trim());
      models = null;
      return k.trim();
    }
    return current || null;
  }

  function forgetKey() { safeDel(KEY_STORAGE); models = null; }

  /* ---------- Modelos ---------- */
  // Pregunta a Google qué modelos Flash admite esta clave y los ordena del más nuevo al más antiguo
  async function getModels(key) {
    if (models) return models;
    let found = [];
    try {
      const res = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
      if (res.ok) {
        const { models: list = [] } = await res.json();
        const version = n => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1]) || 0;
        found = list
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''))
          .filter(n => /^gemini-[\d.]+-flash/.test(n) && !/image|tts|audio|live|embedding|thinking|exp/.test(n))
          .sort((a, b) => version(b) - version(a) || /lite|preview/.test(a) - /lite|preview/.test(b) || a.length - b.length);
      }
    } catch {}
    models = [...new Set([...found.slice(0, 4), ...FALLBACK_MODELS])];
    return models;
  }

  class AIError extends Error {
    constructor(status, detail) {
      super(friendly(status, detail));
      this.status = status;
      this.detail = detail;
    }
  }

  function friendly(status, detail) {
    if (/api key|api_key|credential|unregistered/i.test(detail || '') || status === 401 || status === 403) return 'Google rechaza la API Key. Revisa que sea válida (aistudio.google.com/apikey).';
    if (status === 429) return 'Se ha agotado la cuota gratuita de Gemini por ahora. Espera un minuto y vuelve a intentarlo.';
    if (status === 500 || status === 503) return 'Los servidores de Google están saturados. Inténtalo de nuevo en unos segundos.';
    if (!status) return 'No se puede conectar con Google. Comprueba la conexión a internet.';
    return `Gemini respondió con un error (${status}): ${detail}`;
  }

  /**
   * Llama a Gemini.
   * contents: [{ role: 'user'|'model', parts: [{ text } | { inlineData: { mimeType, data } }] }]
   * Devuelve el texto de la respuesta. Lanza AIError con un mensaje legible.
   */
  async function generate({ system, contents, maxTokens = 8192, temperature = 0.8, json = null, key = getKey() }) {
    if (!key) throw new AIError(401, 'API key missing');
    const generationConfig = { maxOutputTokens: maxTokens, temperature };
    if (json) { generationConfig.responseMimeType = 'application/json'; generationConfig.responseSchema = json; }
    const payload = { contents, generationConfig };
    if (system) payload.systemInstruction = { parts: [{ text: system }] };

    let lastErr = null;
    for (let round = 0; round < 2; round++) {
      if (round) await new Promise(r => setTimeout(r, 1500));
      for (const model of await getModels(key)) {
        let res, data;
        try {
          res = await fetch(`${API}/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify(payload),
          });
          data = await res.json().catch(() => ({}));
        } catch (e) {
          throw new AIError(0, e.message);
        }
        if (res.ok) {
          models = [model, ...models.filter(m => m !== model)];
          const text = data.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('').trim();
          if (!text) throw new AIError(200, data.promptFeedback?.blockReason ? 'Respuesta bloqueada: ' + data.promptFeedback.blockReason : 'Respuesta vacía');
          return text;
        }
        lastErr = new AIError(res.status, data.error?.message || res.statusText || 'sin detalle');
        // Si el esquema JSON no es compatible con el modelo, reintenta sin él
        if (res.status === 400 && json && /schema|mime/i.test(lastErr.detail)) {
          return generate({ system: system + '\n\nResponde SOLO con un objeto JSON válido, sin texto alrededor.', contents, maxTokens, temperature, json: null, key });
        }
        if (res.status === 400 && /api key/i.test(lastErr.detail)) forgetKey();
        if (!RETRY_STATUS.includes(res.status)) throw lastErr;
      }
    }
    throw lastErr;
  }

  /* ---------- Archivos ---------- */
  const MAX_FILE_BYTES = 15 * 1024 * 1024;

  // Convierte un File en una parte de Gemini (imágenes y PDF en base64, texto plano como texto)
  async function fileToPart(file) {
    if (file.size > MAX_FILE_BYTES) throw new Error(`«${file.name}» pesa más de 15 MB`);
    const isText = /^text\/|json|xml|csv|markdown/.test(file.type) || /\.(txt|md|csv|json)$/i.test(file.name);
    if (isText) return { text: `[Archivo adjunto: ${file.name}]\n${(await file.text()).slice(0, 200000)}` };
    if (!/^image\/|application\/pdf/.test(file.type)) throw new Error(`«${file.name}»: solo se admiten imágenes, PDF y texto`);
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(new Error('No se pudo leer ' + file.name));
      r.readAsDataURL(file);
    });
    return { inlineData: { mimeType: file.type, data } };
  }

  /* ---------- Memoria compartida ---------- */
  // Conversación: { id, title, source: 'glowup'|'jarvis', updated, messages: [{ role: 'user'|'model', text, display?, files? }] }
  function loadAll() {
    try { return JSON.parse(safeGet(MEMORY_STORAGE)) || []; } catch { return []; }
  }

  function saveAll(list) {
    list.sort((a, b) => b.updated - a.updated);
    let trimmed = list.slice(0, MAX_CONVERSATIONS);
    // Si no cabe en el almacenamiento, se van borrando las más antiguas
    while (trimmed.length && !safeSet(MEMORY_STORAGE, JSON.stringify(trimmed))) trimmed = trimmed.slice(0, -1);
  }

  function listConversations() { return loadAll(); }

  function getConversation(id) { return loadAll().find(c => c.id === id) || null; }

  function newConversation(source, title) {
    return { id: `${source}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, title: title || 'Nueva sesión', source, updated: Date.now(), messages: [] };
  }

  function saveConversation(conv) {
    const clean = {
      ...conv,
      updated: Date.now(),
      messages: conv.messages.map(m => ({ ...m, text: String(m.text || '').slice(0, MAX_MESSAGE_CHARS) })),
    };
    const list = loadAll().filter(c => c.id !== conv.id);
    list.push(clean);
    saveAll(list);
    return clean;
  }

  function deleteConversation(id) { saveAll(loadAll().filter(c => c.id !== id)); }

  // Avisa cuando otra pestaña (GlowUp o JARVIS) cambia la memoria
  function onMemoryChange(cb) {
    addEventListener('storage', e => { if (e.key === MEMORY_STORAGE) cb(); });
  }

  // Historial en formato Gemini (solo texto; los archivos no se guardan en memoria)
  function toContents(conv, limit = 16) {
    return conv.messages.slice(-limit).map(m => ({ role: m.role, parts: [{ text: m.text || '…' }] }));
  }

  /* ---------- Personalidad educativa compartida ---------- */
  const STUDY_GUIDE = `Eres un asistente educativo para estudiantes y profesores de cualquier nivel (primaria, ESO, bachillerato, FP, universidad y oposiciones).
- Con estudiantes: prioriza que entiendan el porqué; en ejercicios evaluables explica el razonamiento paso a paso en vez de dar solo la solución.
- Con profesores: material listo para usar en clase (formato claro, tiempos orientativos, soluciones).
- Adapta vocabulario y profundidad al nivel. Nunca inventes datos, fechas, fórmulas ni citas: si no estás seguro, dilo.
- Si hay fotos o PDF adjuntos (apuntes, exámenes, libros), úsalos como fuente principal e indica si algo no se lee bien.
Tipos de contenido: Resumen (ideas clave organizadas), Tarjetas de estudio (tabla pregunta/respuesta), Examen de práctica (preguntas variadas con soluciones y explicación al final), Plan de clase (objetivos, bloques con duración, actividades, recursos), Rúbrica (tabla de criterios y niveles), Corrección de texto (errores con corrección propuesta y valoración), Explicación paso a paso, Rutina de estudio semanal.
Formato: Markdown con encabezados ## por bloque, listas y tablas cuando convenga, sin relleno.`;

  window.GlowCore = {
    getKey, askKey, forgetKey, generate, AIError, fileToPart,
    listConversations, getConversation, newConversation, saveConversation, deleteConversation, onMemoryChange, toContents,
    STUDY_GUIDE,
  };
})();
