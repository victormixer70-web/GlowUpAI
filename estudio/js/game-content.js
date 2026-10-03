// Contenido de los minijuegos: generadores de preguntas con su explicación.
// Las opciones incorrectas reproducen los errores típicos de cada tema.

const rand = (n) => Math.floor(Math.random() * n);
const between = (a, b) => a + rand(b - a + 1);
const pick = (arr) => arr[rand(arr.length)];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pregunta tipo test: quita opciones repetidas, baraja y localiza la correcta.
function choice({ concept, prompt, answer, wrong, explanation, expr, code, lang, max = 4 }) {
  const opts = [answer];
  for (const w of wrong) {
    if (opts.length >= max) break;
    if (w !== undefined && w !== null && !opts.includes(w)) opts.push(w);
  }
  // Red de seguridad: si las trampas coincidían con la respuesta, añade números cercanos.
  const num = String(answer).match(/^(`?)(-?\d+)(`?)$/);
  for (let k = 1; num && opts.length < Math.min(max, 4); k++) {
    for (const v of [Number(num[2]) + k, Number(num[2]) - k]) {
      const cand = `${num[1]}${v}${num[3]}`;
      if (opts.length < Math.min(max, 4) && !opts.includes(cand)) opts.push(cand);
    }
  }
  const options = shuffle(opts);
  return { type: "choice", concept, prompt, expr, code, lang, options, answer: options.indexOf(answer), answerText: answer, explanation };
}

const m = (tex) => `$${tex}$`; // fórmula en línea
const paren = (n) => (n < 0 ? `(${n})` : `${n}`);

// ================================================================ Cálculo

const pw = (n) => (n === 1 ? "x" : `x^{${n}}`);
const term = (c, body) => (c === 1 ? body : c === -1 ? `-${body}` : `${c}${body}`);

function derivBasic() {
  const items = [
    ["\\sin x", "\\cos x", ["-\\cos x", "-\\sin x", "\\sin x"], "$(\\sin x)' = \\cos x$."],
    ["\\cos x", "-\\sin x", ["\\sin x", "-\\cos x", "\\cos x"], "$(\\cos x)' = -\\sin x$. ¡Ojo con el signo menos, es el error más típico!"],
    ["e^{x}", "e^{x}", ["x\\,e^{x-1}", "e^{x-1}", "\\ln x"], "La exponencial es su propia derivada: $(e^x)' = e^x$. No se aplica la regla de la potencia porque la variable está en el exponente."],
    ["\\ln x", "\\dfrac{1}{x}", ["\\dfrac{1}{x^{2}}", "e^{x}", "x"], "$(\\ln x)' = \\dfrac{1}{x}$ (para $x > 0$)."],
    ["\\sqrt{x}", "\\dfrac{1}{2\\sqrt{x}}", ["\\dfrac{1}{\\sqrt{x}}", "2\\sqrt{x}", "\\dfrac{\\sqrt{x}}{2}"], "Escribe $\\sqrt{x} = x^{1/2}$ y aplica la potencia: $\\tfrac12 x^{-1/2} = \\dfrac{1}{2\\sqrt{x}}$."],
    ["\\dfrac{1}{x}", "-\\dfrac{1}{x^{2}}", ["\\ln x", "\\dfrac{1}{x^{2}}", "-\\dfrac{1}{x}"], "Escribe $\\tfrac1x = x^{-1}$: su derivada es $-1\\cdot x^{-2} = -\\dfrac{1}{x^2}$."],
  ];
  const [f, d, wrong, rule] = pick(items);
  return { f, d, wrong, why: rule, concept: "Derivadas básicas" };
}

function derivPower() {
  const c = between(1, 9);
  const n = between(2, 6);
  const f = term(c, pw(n));
  const d = term(c * n, pw(n - 1));
  return {
    f,
    d,
    wrong: [term(c, pw(n - 1)), term(c * n, pw(n)), `\\dfrac{${c}}{${n + 1}}x^{${n + 1}}`, term(c * (n - 1), pw(n - 1))],
    why: `Regla de la potencia: $(x^n)' = n\\,x^{n-1}$ (baja el exponente y réstale 1). Aquí: $${c === 1 ? "" : `${c}\\cdot `}${n}\\,${pw(n - 1)} = ${d}$.`,
    concept: "Regla de la potencia",
  };
}

function derivSum() {
  const p = derivPower();
  const b = pick([
    ["\\sin x", "\\cos x", "-\\cos x"],
    ["\\cos x", "-\\sin x", "\\sin x"],
    ["e^{x}", "e^{x}", "x\\,e^{x-1}"],
  ]);
  return {
    f: `${p.f} + ${b[0]}`,
    d: `${p.d} + ${b[1]}`,
    wrong: [`${p.d} + ${b[2]}`, `${p.wrong[0]} + ${b[1]}`, `${p.wrong[1]} + ${b[1]}`],
    why: `La derivada de una suma es la suma de las derivadas: $(${p.f})' = ${p.d}$ y $(${b[0]})' = ${b[1]}$.`,
    concept: "Derivada de una suma",
  };
}

function derivChain() {
  const a = between(2, 9);
  const b = between(1, 9);
  const n = between(2, 5);
  const items = [
    () => ({ f: `\\sin(${a}x)`, d: `${a}\\cos(${a}x)`, wrong: [`\\cos(${a}x)`, `-${a}\\cos(${a}x)`, `${a}\\sin(${a}x)`], why: `Regla de la cadena: $(\\sin u)' = \\cos u \\cdot u'$. Con $u = ${a}x$, $u' = ${a}$. Error típico: olvidar multiplicar por la derivada de dentro.` }),
    () => ({ f: `\\cos(${a}x)`, d: `-${a}\\sin(${a}x)`, wrong: [`${a}\\sin(${a}x)`, `-\\sin(${a}x)`, `-${a}\\cos(${a}x)`], why: `$(\\cos u)' = -\\sin u \\cdot u'$ con $u = ${a}x$: queda $-${a}\\sin(${a}x)$.` }),
    () => ({ f: `e^{${a}x}`, d: `${a}e^{${a}x}`, wrong: [`e^{${a}x}`, `${a}x\\,e^{${a}x-1}`, `\\dfrac{1}{${a}}e^{${a}x}`], why: `$(e^{u})' = e^{u}\\cdot u'$. Con $u = ${a}x$ sale $${a}e^{${a}x}$. Dividir entre ${a} sería integrar, no derivar.` }),
    () => {
      const d = `${n * a}(${a}x+${b})${n - 1 === 1 ? "" : `^{${n - 1}}`}`;
      return {
        f: `(${a}x+${b})^{${n}}`,
        d,
        wrong: [`${n}(${a}x+${b})${n - 1 === 1 ? "" : `^{${n - 1}}`}`, `${n * a}(${a}x+${b})^{${n}}`, `${a}(${a}x+${b})${n - 1 === 1 ? "" : `^{${n - 1}}`}`],
        why: `Potencia de una función: $(u^n)' = n\\,u^{n-1}\\,u'$. Con $u = ${a}x+${b}$, $u' = ${a}$: $${n}\\cdot ${a}\\,(${a}x+${b})^{${n - 1}} = ${d}$.`,
      };
    },
    () => ({ f: `\\ln(${a}x+${b})`, d: `\\dfrac{${a}}{${a}x+${b}}`, wrong: [`\\dfrac{1}{${a}x+${b}}`, `\\dfrac{${a}}{x}`, `${a}\\ln(${a}x+${b})`], why: `$(\\ln u)' = \\dfrac{u'}{u}$. Con $u = ${a}x+${b}$: $\\dfrac{${a}}{${a}x+${b}}$.` }),
    () => ({ f: "e^{x^{2}}", d: "2x\\,e^{x^{2}}", wrong: ["e^{x^{2}}", "x^{2}e^{x^{2}-1}", "2e^{x^{2}}"], why: "$(e^{u})' = e^{u}u'$ con $u = x^2$, $u' = 2x$." }),
    () => ({ f: "\\sin(x^{2})", d: "2x\\cos(x^{2})", wrong: ["\\cos(x^{2})", "\\cos(2x)", "2x\\sin(x^{2})"], why: "$(\\sin u)' = \\cos u\\cdot u'$ con $u = x^2$: $2x\\cos(x^2)$. El argumento del coseno no cambia." }),
  ];
  return { ...pick(items)(), concept: "Regla de la cadena" };
}

function integralBasic() {
  const n = between(1, 5);
  const k = between(1, 4);
  const c = k * (n + 1);
  const items = [
    () => ({
      f: term(c, pw(n)),
      d: `${term(k, pw(n + 1))} + C`,
      wrong: [`${term(c * n, pw(n - 1 || 1))} + C`, `${term(c, pw(n + 1))} + C`, `${term(k, pw(n))} + C`],
      why: `$\\int x^n\\,dx = \\dfrac{x^{n+1}}{n+1} + C$: sube el exponente y divide entre el nuevo. Aquí $\\dfrac{${c}}{${n + 1}}x^{${n + 1}} = ${term(k, pw(n + 1))}$. Derivar (bajar el exponente) es el error típico.`,
    }),
    () => ({ f: "\\cos x", d: "\\sin x + C", wrong: ["-\\sin x + C", "\\cos x + C", "-\\cos x + C"], why: "$\\int \\cos x\\,dx = \\sin x + C$, porque $(\\sin x)' = \\cos x$." }),
    () => ({ f: "\\sin x", d: "-\\cos x + C", wrong: ["\\cos x + C", "-\\sin x + C", "\\sin x + C"], why: "$\\int \\sin x\\,dx = -\\cos x + C$, porque $(-\\cos x)' = \\sin x$. ¡El signo!" }),
    () => ({ f: "\\dfrac{1}{x}", d: "\\ln|x| + C", wrong: ["-\\dfrac{1}{x^{2}} + C", "\\ln x^{2} + C", "e^{x} + C"], why: "$\\int \\dfrac1x\\,dx = \\ln|x| + C$. La regla de la potencia no sirve para $n = -1$ (dividiría entre 0)." }),
  ];
  return { ...pick(items)(), concept: "Integrales inmediatas", integral: true };
}

function derivProduct() {
  const items = [
    { f: "x\\sin x", d: "\\sin x + x\\cos x", wrong: ["\\cos x", "x\\cos x", "\\sin x - x\\cos x"], why: "Regla del producto: $(uv)' = u'v + uv'$. Con $u = x$, $v = \\sin x$: $1\\cdot\\sin x + x\\cos x$. Error típico: multiplicar las derivadas ($1\\cdot\\cos x$)." },
    { f: "x\\,e^{x}", d: "e^{x}(x+1)", wrong: ["e^{x}", "x\\,e^{x}", "e^{x}(x-1)"], why: "$(uv)' = u'v + uv'$: $1\\cdot e^x + x e^x = e^x(x+1)$." },
    { f: "x\\ln x", d: "\\ln x + 1", wrong: ["\\dfrac{1}{x}", "\\ln x", "1"], why: "$(x\\ln x)' = 1\\cdot\\ln x + x\\cdot\\dfrac1x = \\ln x + 1$." },
    { f: "x^{2}e^{x}", d: "e^{x}(x^{2}+2x)", wrong: ["2x\\,e^{x}", "x^{2}e^{x}", "e^{x}(x^{2}+2)"], why: "$(x^2e^x)' = 2x\\,e^x + x^2e^x = e^x(x^2+2x)$." },
    { f: "e^{x}\\sin x", d: "e^{x}(\\sin x + \\cos x)", wrong: ["e^{x}\\cos x", "e^{x}(\\sin x - \\cos x)", "e^{x}\\sin x"], why: "$(e^x\\sin x)' = e^x\\sin x + e^x\\cos x$." },
    { f: "x^{2}\\cos x", d: "2x\\cos x - x^{2}\\sin x", wrong: ["-2x\\sin x", "2x\\cos x + x^{2}\\sin x", "2x\\sin x"], why: "$(x^2\\cos x)' = 2x\\cos x + x^2(-\\sin x)$." },
    { f: "\\dfrac{\\sin x}{x}", d: "\\dfrac{x\\cos x - \\sin x}{x^{2}}", wrong: ["\\cos x", "\\dfrac{\\sin x - x\\cos x}{x^{2}}", "\\dfrac{x\\cos x + \\sin x}{x^{2}}"], why: "Regla del cociente: $\\left(\\dfrac uv\\right)' = \\dfrac{u'v - uv'}{v^2}$. Primero la derivada del **numerador** por el denominador; si lo inviertes cambia el signo." },
    { f: "\\dfrac{x}{x+1}", d: "\\dfrac{1}{(x+1)^{2}}", wrong: ["\\dfrac{-1}{(x+1)^{2}}", "1", "\\dfrac{2x+1}{(x+1)^{2}}"], why: "$\\dfrac{1\\cdot(x+1) - x\\cdot 1}{(x+1)^2} = \\dfrac{1}{(x+1)^2}$." },
  ];
  const it = pick(items);
  return { ...it, concept: it.f.includes("dfrac") ? "Regla del cociente" : "Regla del producto" };
}

function derivCompound() {
  const items = [
    { f: "\\sin^{2}x", d: "2\\sin x\\cos x", wrong: ["\\cos^{2}x", "2\\cos x", "2\\sin x"], why: "$\\sin^2 x = (\\sin x)^2$: $(u^2)' = 2u\\,u'$ con $u = \\sin x$ → $2\\sin x\\cos x = \\sin 2x$." },
    { f: "\\ln(x^{2}+1)", d: "\\dfrac{2x}{x^{2}+1}", wrong: ["\\dfrac{1}{x^{2}+1}", "\\dfrac{2x}{x^{2}}", "2x\\ln(x^{2}+1)"], why: "$(\\ln u)' = u'/u$ con $u = x^2+1$, $u' = 2x$." },
    { f: "e^{\\sin x}", d: "\\cos x\\,e^{\\sin x}", wrong: ["e^{\\sin x}", "e^{\\cos x}", "\\sin x\\,e^{\\sin x - 1}"], why: "$(e^u)' = e^u u'$ con $u = \\sin x$." },
    { f: "\\sqrt{x^{2}+4}", d: "\\dfrac{x}{\\sqrt{x^{2}+4}}", wrong: ["\\dfrac{1}{2\\sqrt{x^{2}+4}}", "\\dfrac{2x}{\\sqrt{x^{2}+4}}", "2x\\sqrt{x^{2}+4}"], why: "$(\\sqrt u)' = \\dfrac{u'}{2\\sqrt u} = \\dfrac{2x}{2\\sqrt{x^2+4}} = \\dfrac{x}{\\sqrt{x^2+4}}$." },
    { f: "x\\,e^{2x}", d: "e^{2x}(1+2x)", wrong: ["2e^{2x}", "e^{2x}(1+x)", "2x\\,e^{2x}"], why: "Producto y cadena: $1\\cdot e^{2x} + x\\cdot 2e^{2x} = e^{2x}(1+2x)$." },
  ];
  return { ...pick(items), concept: "Cadena + producto" };
}

export function genDerivadas(level) {
  const pools = {
    1: [derivPower, derivPower, derivBasic, derivBasic, derivSum],
    2: [derivChain, derivChain, integralBasic, derivSum, derivBasic],
    3: [derivProduct, derivProduct, derivChain, integralBasic],
    4: [derivProduct, derivCompound, derivChain, integralBasic],
    5: [derivCompound, derivCompound, derivProduct, derivChain],
  };
  const it = pick(pools[Math.min(level, 5)])();
  return choice({
    concept: it.concept,
    prompt: it.integral ? "Calcula la integral:" : "Calcula la derivada:",
    expr: it.integral ? `$$\\int ${it.f}\\,dx$$` : `$$f(x) = ${it.f}$$`,
    answer: m(it.d),
    wrong: shuffle(it.wrong).map(m),
    explanation: it.why,
  });
}

// ================================================================ Álgebra

const mat = (rows) => `\\begin{pmatrix} ${rows.map((r) => r.join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
const nz = (a, b) => {
  let v = 0;
  while (v === 0) v = between(a, b);
  return v;
};

function qDet2() {
  const [a, b, c, d] = [between(-4, 9), between(-4, 9), between(-4, 9), between(-4, 9)];
  const det = a * d - b * c;
  return choice({
    concept: "Determinante 2×2",
    prompt: "Calcula el determinante:",
    expr: `$$\\det ${mat([[a, b], [c, d]])}$$`,
    answer: String(det),
    wrong: [String(a * d + b * c), String(b * c - a * d), String(a * c - b * d), String(det + 1)],
    explanation: `$\\det\\begin{pmatrix} a & b \\\\ c & d\\end{pmatrix} = ad - bc$: diagonal principal **menos** diagonal secundaria. $${paren(a)}\\cdot${paren(d)} - ${paren(b)}\\cdot${paren(c)} = ${a * d} - ${paren(b * c)} = ${det}$.`,
  });
}

function qTrace() {
  const n = pick([2, 3]);
  const A = Array.from({ length: n }, () => Array.from({ length: n }, () => between(-3, 9)));
  const tr = A.reduce((s, r, i) => s + r[i], 0);
  const all = A.flat().reduce((s, v) => s + v, 0);
  const prodDiag = A.reduce((p, r, i) => p * r[i], 1);
  const anti = A.reduce((s, r, i) => s + r[n - 1 - i], 0);
  return choice({
    concept: "Traza",
    prompt: "¿Cuál es la **traza** de la matriz?",
    expr: `$$${mat(A)}$$`,
    answer: String(tr),
    wrong: [String(all), String(prodDiag), String(anti), String(tr + 2)],
    explanation: `La traza es la **suma de la diagonal principal**: $${A.map((r, i) => paren(r[i])).join(" + ")} = ${tr}$.`,
  });
}

function qProductEntry() {
  const A = [[between(-3, 6), between(-3, 6)], [between(-3, 6), between(-3, 6)]];
  const B = [[between(-3, 6), between(-3, 6)], [between(-3, 6), between(-3, 6)]];
  const i = rand(2);
  const j = rand(2);
  const val = A[i][0] * B[0][j] + A[i][1] * B[1][j];
  return choice({
    concept: "Producto de matrices",
    prompt: `Si $C = AB$, ¿cuánto vale $c_{${i + 1}${j + 1}}$?`,
    expr: `$$A = ${mat(A)},\\quad B = ${mat(B)}$$`,
    answer: String(val),
    wrong: [String(A[i][j] * B[i][j]), String(A[i][0] * B[i][0] + A[i][1] * B[i][1]), String(A[0][j] * B[0][j] + A[1][j] * B[1][j]), String(val + 1)],
    explanation: `$c_{ij}$ = **fila $i$ de $A$ por columna $j$ de $B$**: $${paren(A[i][0])}\\cdot${paren(B[0][j])} + ${paren(A[i][1])}\\cdot${paren(B[1][j])} = ${val}$. Multiplicar elemento a elemento ($a_{ij}b_{ij}$) es un error típico.`,
  });
}

function qDet3() {
  const A = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => between(-2, 4)));
  const [[a, b, c], [d, e, f], [g, h, i]] = A;
  const m1 = e * i - f * h;
  const m2 = d * i - f * g;
  const m3 = d * h - e * g;
  const det = a * m1 - b * m2 + c * m3;
  return choice({
    concept: "Determinante 3×3",
    prompt: "Calcula el determinante (desarrolla por la primera fila o usa Sarrus):",
    expr: `$$\\det ${mat(A)}$$`,
    answer: String(det),
    wrong: [String(a * m1 + b * m2 + c * m3), String(a * e * i + b * f * g + c * d * h), String(-det), String(det + 2)],
    explanation: `Por la primera fila, con signos **+ − +**: $${paren(a)}\\cdot(${m1}) - ${paren(b)}\\cdot(${m2}) + ${paren(c)}\\cdot(${m3}) = ${det}$. Cada paréntesis es el menor 2×2 que queda al tachar la fila y la columna del elemento. Olvidar el signo menos del segundo término es el fallo más común.`,
  });
}

function qSystem() {
  let a, b, c, d, det;
  do {
    [a, b, c, d] = [nz(-3, 5), nz(-3, 5), nz(-3, 5), nz(-3, 5)];
    det = a * d - b * c;
  } while (det === 0);
  const x = between(-4, 5);
  const y = between(-4, 5);
  const e = a * x + b * y;
  const f = c * x + d * y;
  const eq = (p, q, r) => `${p === 1 ? "" : p === -1 ? "-" : p}x ${q < 0 ? "-" : "+"} ${Math.abs(q) === 1 ? "" : Math.abs(q)}y = ${r}`;
  const sol = (u, v) => `$x = ${u},\\ y = ${v}$`;
  return choice({
    concept: "Sistemas 2×2",
    prompt: "Resuelve el sistema:",
    expr: `$$\\begin{cases} ${eq(a, b, e)} \\\\ ${eq(c, d, f)} \\end{cases}$$`,
    answer: sol(x, y),
    wrong: [sol(y, x), sol(-x, y), sol(x, -y), sol(x + 1, y - 1)],
    explanation: `Por Cramer: $\\det = ${paren(a)}\\cdot${paren(d)} - ${paren(b)}\\cdot${paren(c)} = ${det}$, $x = \\dfrac{${e * d - b * f}}{${det}} = ${x}$, $y = \\dfrac{${a * f - e * c}}{${det}} = ${y}$. Comprueba siempre sustituyendo en las dos ecuaciones.`,
  });
}

function qInvertible() {
  const singular = Math.random() < 0.5;
  const a = between(1, 6);
  const b = between(-4, 6);
  const k = pick([2, 3, -2]);
  const [c, d] = singular ? [k * a, k * b] : [between(-4, 6), between(-4, 6)];
  const det = a * d - b * c;
  const inv = det !== 0;
  return choice({
    concept: "Matriz inversa",
    prompt: "¿Tiene inversa esta matriz?",
    expr: `$$${mat([[a, b], [c, d]])}$$`,
    answer: inv ? "Sí" : "No",
    wrong: [inv ? "No" : "Sí"],
    max: 2,
    explanation: `Una matriz cuadrada tiene inversa si y solo si su **determinante no es 0**. Aquí $\\det = ${paren(a)}\\cdot${paren(d)} - ${paren(b)}\\cdot${paren(c)} = ${det}$${!inv ? ": la segunda fila es múltiplo de la primera, así que las filas son linealmente dependientes" : ""}.`,
  });
}

function qEigen() {
  const n = pick([2, 3]);
  const diag = Array.from({ length: n }, () => between(-3, 7));
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (j < i ? 0 : j === i ? diag[i] : between(-4, 6))));
  const fmt = (vals) => `$\\lambda = ${[...vals].sort((p, q) => p - q).join(",\\ ")}$`;
  const anti = A.map((r, i) => r[n - 1 - i]);
  const firstRow = A[0];
  return choice({
    concept: "Valores propios",
    prompt: "¿Cuáles son los valores propios de esta matriz **triangular**?",
    expr: `$$${mat(A)}$$`,
    answer: fmt(diag),
    wrong: [fmt(anti), fmt(firstRow), fmt(diag.map((v) => -v))],
    explanation: `En una matriz triangular, $\\det(A - \\lambda I)$ es el producto de la diagonal: $${diag.map((v) => `(${v} - \\lambda)`).join("")}$. Por eso los valores propios son **los elementos de la diagonal**: ${fmt(diag)}.`,
  });
}

function qRank() {
  const r1 = [nz(-3, 4), between(-3, 4), between(-3, 4)];
  const kind = pick([1, 2, 2, 3]);
  let A;
  let why;
  if (kind === 1) {
    const k2 = pick([2, -1, 3]);
    const k3 = pick([-2, 2, 4]);
    A = [r1, r1.map((v) => v * k2), r1.map((v) => v * k3)];
    why = `Las filas 2 y 3 son múltiplos de la fila 1 ($F_2 = ${k2}F_1$, $F_3 = ${k3}F_1$): solo hay **una** fila independiente → rango 1.`;
  } else if (kind === 2) {
    let r2;
    do r2 = [between(-3, 4), between(-3, 4), between(-3, 4)];
    while (r2[0] * r1[1] === r2[1] * r1[0] && r2[1] * r1[2] === r2[2] * r1[1]);
    A = [r1, r2, r1.map((v, i) => v + r2[i])];
    why = "La fila 3 es la suma de las filas 1 y 2 ($F_3 = F_1 + F_2$), y las dos primeras no son proporcionales → rango 2. Haciendo $F_3 - F_1 - F_2$ queda una fila de ceros.";
  } else {
    do A = [r1, [between(-3, 4), between(-3, 4), between(-3, 4)], [between(-3, 4), between(-3, 4), between(-3, 4)]];
    while (det3(A) === 0);
    why = `Su determinante es $${det3(A)} \\neq 0$, así que las 3 filas son independientes → rango 3 (máximo).`;
  }
  return choice({
    concept: "Rango",
    prompt: "¿Cuál es el **rango** de la matriz?",
    expr: `$$${mat(A)}$$`,
    answer: String(kind),
    wrong: ["1", "2", "3"],
    max: 3,
    explanation: why,
  });
}

function det3(A) {
  const [[a, b, c], [d, e, f], [g, h, i]] = A;
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

function qDetProps() {
  const d = between(2, 5);
  const n = pick([2, 3]);
  const k = pick([2, 3]);
  const items = [
    () => choice({ concept: "Propiedades del determinante", prompt: `$A$ es ${n}×${n} y $\\det A = ${d}$. ¿Cuánto vale $\\det(${k}A)$?`, answer: String(k ** n * d), wrong: [String(k * d), String(d ** k), String(k + d)], explanation: `Multiplicar la matriz por $k$ multiplica **cada una de sus ${n} filas** por $k$, así que $\\det(kA) = k^{n}\\det A = ${k}^{${n}}\\cdot ${d} = ${k ** n * d}$.` }),
    () => choice({ concept: "Propiedades del determinante", prompt: `Si $\\det A = ${d}$, ¿cuánto vale $\\det(A^{-1})$?`, answer: m(`\\dfrac{1}{${d}}`), wrong: [m(`-${d}`), m(`${d}`), m(`${d * d}`)], explanation: `$\\det(A)\\det(A^{-1}) = \\det(I) = 1$, luego $\\det(A^{-1}) = \\dfrac{1}{\\det A} = \\dfrac1{${d}}$.` }),
    () => {
      const e = between(2, 4);
      return choice({ concept: "Propiedades del determinante", prompt: `$\\det A = ${d}$ y $\\det B = ${e}$. ¿Cuánto vale $\\det(AB)$?`, answer: String(d * e), wrong: [String(d + e), String(d * e * 2), String(d ** e)], explanation: `El determinante es multiplicativo: $\\det(AB) = \\det A\\cdot\\det B = ${d}\\cdot${e} = ${d * e}$. (Para la suma **no** funciona: $\\det(A+B) \\neq \\det A + \\det B$.)` });
    },
    () => choice({ concept: "Propiedades del determinante", prompt: `Si $\\det A = ${d}$, ¿cuánto vale $\\det(A^{T})$?`, answer: String(d), wrong: [String(-d), m(`\\dfrac1{${d}}`), String(d * d)], explanation: "Trasponer no cambia el determinante: $\\det(A^T) = \\det A$." }),
    () => choice({ concept: "Propiedades del determinante", prompt: `Si en $A$ (con $\\det A = ${d}$) **intercambias dos filas**, ¿qué determinante tiene la nueva matriz?`, answer: String(-d), wrong: [String(d), "0", String(2 * d)], explanation: "Intercambiar dos filas cambia el **signo** del determinante." }),
  ];
  return pick(items)();
}

export function genMatrices(level) {
  const pools = {
    1: [qDet2, qDet2, qTrace, qProductEntry],
    2: [qDet3, qSystem, qInvertible, qProductEntry, qDet2],
    3: [qDet3, qSystem, qEigen, qRank, qDetProps],
    4: [qRank, qEigen, qDetProps, qDet3, qSystem],
    5: [qRank, qEigen, qDetProps, qDet3],
  };
  return pick(pools[Math.min(level, 5)])();
}

// ================================================================ Fundamentos de computadores

const OPS = {
  AND: { tex: (a, b) => `${a} \\cdot ${b}`, word: "AND", f: (a, b) => a & b },
  OR: { tex: (a, b) => `${a} + ${b}`, word: "OR", f: (a, b) => a | b },
  XOR: { tex: (a, b) => `${a} \\oplus ${b}`, word: "XOR", f: (a, b) => a ^ b },
  NAND: { tex: (a, b) => `\\overline{${a} \\cdot ${b}}`, word: "NAND", f: (a, b) => 1 - (a & b) },
  NOR: { tex: (a, b) => `\\overline{${a} + ${b}}`, word: "NOR", f: (a, b) => 1 - (a | b) },
};

function randExpr(vars, level) {
  const ops = level <= 1 ? ["AND", "OR"] : level === 2 ? ["AND", "OR", "XOR"] : ["AND", "OR", "XOR", "NAND", "NOR"];
  const leaf = (name) => (Math.random() < (level <= 1 ? 0.25 : 0.35) ? { op: "NOT", a: { op: "VAR", name } } : { op: "VAR", name });
  if (vars.length === 2) return { op: pick(ops), a: leaf(vars[0]), b: leaf(vars[1]) };
  const inner = { op: pick(ops), a: leaf(vars[0]), b: leaf(vars[1]) };
  const [x, y] = Math.random() < 0.5 ? [inner, leaf(vars[2])] : [leaf(vars[2]), inner];
  return { op: pick(ops), a: x, b: y };
}

function evalExpr(n, v) {
  if (n.op === "VAR") return v[n.name];
  if (n.op === "NOT") return 1 - evalExpr(n.a, v);
  return OPS[n.op].f(evalExpr(n.a, v), evalExpr(n.b, v));
}

function texExpr(n, top = true) {
  if (n.op === "VAR") return n.name;
  if (n.op === "NOT") return `\\overline{${texExpr(n.a, false)}}`;
  const t = OPS[n.op].tex(texExpr(n.a, false), texExpr(n.b, false));
  return top || n.op === "NAND" || n.op === "NOR" ? t : `(${t})`;
}

function wordExpr(n, top = true) {
  if (n.op === "VAR") return n.name;
  if (n.op === "NOT") return `NOT ${wordExpr(n.a, false)}`;
  const t = `${wordExpr(n.a, false)} ${OPS[n.op].word} ${wordExpr(n.b, false)}`;
  return top ? t : `(${t})`;
}

// Pasos de evaluación, de dentro hacia fuera.
function steps(n, v, out = []) {
  if (n.op === "VAR") return out;
  steps(n.a, v, out);
  if (n.b) steps(n.b, v, out);
  const val = evalExpr(n, v);
  if (n.op === "NOT") out.push(`$${texExpr(n, true)} = \\overline{${evalExpr(n.a, v)}} = ${val}$`);
  else out.push(`$${texExpr(n, true)}$: ${OPS[n.op].word}(${evalExpr(n.a, v)}, ${evalExpr(n.b, v)}) = ${val}`);
  return out;
}

const GATE_RULES = "AND da 1 solo si **las dos** son 1; OR da 1 si **alguna** es 1; XOR da 1 si son **distintas**; NAND y NOR son AND y OR negadas; la barra encima es NOT.";

function allAssignments(vars) {
  return Array.from({ length: 2 ** vars.length }, (_, k) => Object.fromEntries(vars.map((name, i) => [name, (k >> (vars.length - 1 - i)) & 1])));
}

function qSwitches(level) {
  const vars = level <= 1 ? ["A", "B"] : ["A", "B", "C"];
  let e;
  let rows;
  do {
    e = randExpr(vars, level);
    rows = allAssignments(vars).map((a) => evalExpr(e, a));
  } while (rows.every((r) => r === rows[0]));
  const zero = Object.fromEntries(vars.map((x) => [x, 0]));
  const target = evalExpr(e, zero) === 1 ? 0 : 1;
  const sols = allAssignments(vars).filter((a) => evalExpr(e, a) === target);
  const ex = sols[rand(sols.length)];
  const exText = vars.map((x) => `${x} = ${ex[x]}`).join(", ");
  return {
    type: "switches",
    concept: "Puertas lógicas",
    prompt: target === 1 ? "Activa los interruptores para que la bombilla **se encienda** ($S = 1$)." : "Con todo a 0 la bombilla está encendida. Cambia los interruptores para que **se apague** ($S = 0$).",
    expr: `$$S = ${texExpr(e)}$$\n\n\`S = ${wordExpr(e)}\``,
    vars,
    target,
    evaluate: (vals) => evalExpr(e, vals),
    answerText: `por ejemplo ${exText}`,
    explanation: `${GATE_RULES}\n\nUna solución: **${exText}** →\n\n${steps(e, ex).map((x) => `- ${x}`).join("\n")}\n\nHay ${sols.length} de ${2 ** vars.length} combinaciones que valen.`,
  };
}

function qEval(level) {
  const vars = level <= 1 ? ["A", "B"] : ["A", "B", "C"];
  const e = randExpr(vars, level);
  const v = Object.fromEntries(vars.map((x) => [x, rand(2)]));
  const out = evalExpr(e, v);
  return choice({
    concept: "Puertas lógicas",
    prompt: `Con ${vars.map((x) => `$${x} = ${v[x]}$`).join(", ")}, ¿cuánto vale $S$?`,
    expr: `$$S = ${texExpr(e)}$$`,
    answer: String(out),
    wrong: [String(1 - out)],
    max: 2,
    explanation: `${GATE_RULES}\n\n${steps(e, v).map((x) => `- ${x}`).join("\n")}`,
  });
}

const bin = (n, w = 0) => n.toString(2).padStart(w, "0");
const hex = (n) => `0x${n.toString(16).toUpperCase()}`;

function nearNumbers(n, max = 255) {
  const out = [];
  for (let k = 0; k < 8; k++) out.push(n ^ (1 << k));
  out.push(n + 1, n - 1, n * 2, n >> 1, n + 16, n - 16);
  return shuffle(out.filter((x) => x > 0 && x <= max && x !== n));
}

function weights(n) {
  const b = bin(n);
  return b
    .split("")
    .map((d, i) => `${d}\\cdot 2^{${b.length - 1 - i}}`)
    .join(" + ");
}

function qBase(level) {
  const max = level <= 1 ? 31 : level === 2 ? 127 : 255;
  const n = between(3, max);
  const modes = level <= 1 ? ["d2b", "b2d"] : ["d2b", "b2d", "d2h", "h2d", "b2h"];
  const mode = pick(modes);
  const near = nearNumbers(n);
  if (mode === "d2b")
    return choice({ concept: "Cambio de base", prompt: `Pasa a **binario** el número decimal **${n}**.`, answer: `\`${bin(n)}\``, wrong: near.map((x) => `\`${bin(x)}\``), explanation: `Divide entre 2 repetidamente y lee los restos de abajo arriba. Comprobación con los pesos: $${weights(n)} = ${n}$.` });
  if (mode === "b2d")
    return choice({ concept: "Cambio de base", prompt: `¿Qué número decimal es el binario \`${bin(n)}\`?`, answer: String(n), wrong: near.map(String), explanation: `Cada bit vale una potencia de 2 según su posición (empezando por $2^0$ a la derecha): $${weights(n)} = ${n}$.` });
  if (mode === "d2h")
    return choice({ concept: "Hexadecimal", prompt: `Pasa a **hexadecimal** el número **${n}**.`, answer: `\`${hex(n)}\``, wrong: near.map((x) => `\`${hex(x)}\``), explanation: `${n} = ${Math.floor(n / 16)}·16 + ${n % 16} → dígitos ${Math.floor(n / 16).toString(16).toUpperCase()} y ${(n % 16).toString(16).toUpperCase()} (A=10 … F=15) → **${hex(n)}**.` });
  if (mode === "h2d")
    return choice({ concept: "Hexadecimal", prompt: `¿Qué número decimal es \`${hex(n)}\`?`, answer: String(n), wrong: near.map(String), explanation: `Cada dígito hexadecimal vale una potencia de 16: ${Math.floor(n / 16)}·16 + ${n % 16} = ${n} (A=10, B=11, C=12, D=13, E=14, F=15).` });
  const b8 = bin(n, 8);
  return choice({ concept: "Hexadecimal", prompt: `Pasa a hexadecimal el binario \`${b8}\`.`, answer: `\`${hex(n)}\``, wrong: near.map((x) => `\`${hex(x)}\``), explanation: `Agrupa de 4 en 4 bits desde la derecha: \`${b8.slice(0, 4)}\` = ${parseInt(b8.slice(0, 4), 2).toString(16).toUpperCase()}, \`${b8.slice(4)}\` = ${parseInt(b8.slice(4), 2).toString(16).toUpperCase()} → **${hex(n)}**.` });
}

function qCa2() {
  const n = between(1, 100);
  const ca2 = bin((256 - n) & 255, 8);
  const ca1 = bin(255 - n, 8);
  const sm = bin(128 + n, 8);
  const plain = bin(n, 8);
  return choice({
    concept: "Complemento a 2",
    prompt: `Representa **−${n}** en complemento a 2 con 8 bits.`,
    answer: `\`${ca2}\``,
    wrong: [`\`${ca1}\``, `\`${sm}\``, `\`${plain}\``],
    explanation: `1) ${n} en binario: \`${plain}\`. 2) Invierte todos los bits (complemento a 1): \`${ca1}\`. 3) Suma 1: \`${ca2}\`. Comprobación: $-128 + ${(256 - n) & 127} = -${n}$. Las trampas eran el Ca1 (sin sumar 1) y signo-magnitud (\`${sm}\`).`,
  });
}

function qIdentity() {
  const items = [
    ["A + A \\cdot B", "A", ["B", "A \\cdot B", "1"], "Absorción: $A + AB = A(1 + B) = A\\cdot 1 = A$."],
    ["A \\cdot (A + B)", "A", ["B", "A + B", "0"], "Absorción: $A(A+B) = A + AB = A$."],
    ["\\overline{A \\cdot B}", "\\overline{A} + \\overline{B}", ["\\overline{A} \\cdot \\overline{B}", "A + B", "\\overline{A + B}"], "Ley de De Morgan: la negación de un producto es la suma de las negaciones."],
    ["\\overline{A + B}", "\\overline{A} \\cdot \\overline{B}", ["\\overline{A} + \\overline{B}", "A \\cdot B", "\\overline{A \\cdot B}"], "Ley de De Morgan: la negación de una suma es el producto de las negaciones."],
    ["A + \\overline{A}", "1", ["0", "A", "\\overline{A}"], "Complemento: una variable o su negada siempre vale 1."],
    ["A \\cdot \\overline{A}", "0", ["1", "A", "\\overline{A}"], "Complemento: una variable y su negada nunca son 1 a la vez."],
    ["A \\oplus A", "0", ["1", "A", "2A"], "XOR da 1 solo si las entradas son distintas; aquí son iguales."],
    ["A + 1", "1", ["A", "0", "\\overline{A}"], "Elemento dominante: OR con 1 siempre da 1."],
    ["\\overline{\\overline{A}}", "A", ["\\overline{A}", "0", "1"], "Doble negación: negar dos veces deja la variable igual."],
    ["A \\cdot B + A \\cdot \\overline{B}", "A", ["B", "1", "A \\cdot B"], "Sacando factor común: $A(B + \\overline{B}) = A \\cdot 1 = A$."],
  ];
  const [e, ans, wrong, why] = pick(items);
  return choice({ concept: "Álgebra de Boole", prompt: "Simplifica la expresión:", expr: `$$${e}$$`, answer: m(ans), wrong: wrong.map(m), explanation: why });
}

export function genCircuitos(level) {
  const pools = {
    1: [qSwitches, qSwitches, qEval, qBase],
    2: [qSwitches, qEval, qBase, qCa2],
    3: [qSwitches, qEval, qCa2, qIdentity, qBase],
    4: [qSwitches, qIdentity, qCa2, qBase, qEval],
    5: [qSwitches, qIdentity, qCa2, qIdentity],
  };
  return pick(pools[Math.min(level, 5)])(level);
}

// ================================================================ Programación

function code(lang, py, cpp) {
  return lang === "cpp" ? cpp : py;
}

const tracers = {
  sumRange(lang) {
    const a = between(0, 3);
    const b = between(a + 3, a + 6);
    let s = 0;
    for (let i = a; i < b; i++) s += i;
    const terms = Array.from({ length: b - a }, (_, k) => a + k);
    return {
      concept: "Bucles for",
      code: code(lang, `s = 0\nfor i in range(${a}, ${b}):\n    s += i\nprint(s)`, `int s = 0;\nfor (int i = ${a}; i < ${b}; i++) {\n    s += i;\n}\ncout << s << endl;`),
      out: String(s),
      wrong: [String(s + b), String(s - a), String(b - a)],
      why: `${lang === "cpp" ? `\`i < ${b}\`` : `\`range(${a}, ${b})\``} recorre ${a}, …, ${b - 1}: el ${b} **no** entra. Suma: ${terms.join(" + ")} = ${s}. Si incluyes el ${b} te sale ${s + b} (error típico).`,
    };
  },
  divMod(lang) {
    let a;
    let b;
    do {
      a = between(11, 59);
      b = between(2, 9);
    } while (a % b === 0);
    const q = Math.floor(a / b);
    const r = a % b;
    return {
      concept: "División entera y módulo",
      code: code(lang, `a = ${a}\nb = ${b}\nprint(a // b, a % b)`, `int a = ${a}, b = ${b};\ncout << a / b << " " << a % b << endl;`),
      out: `${q} ${r}`,
      wrong: [`${(a / b).toFixed(1)} ${r}`, `${r} ${q}`, `${q + 1} ${r}`],
      why: `${lang === "cpp" ? "En C++, `int / int` es división **entera**" : "En Python, `//` es la división **entera** (`/` daría decimales)"}: ${a} = ${b}·${q} + ${r}, así que el cociente es ${q} y el resto (\`%\`) es ${r}.`,
    };
  },
  ifChain(lang) {
    const x = pick([3, 5, 7, 10, 11, 4, 12]);
    const out = x > 10 ? "A" : x >= 5 ? "B" : "C";
    const py = `x = ${x}\nif x > 10:\n    print("A")\nelif x >= 5:\n    print("B")\nelse:\n    print("C")`;
    const cpp = `int x = ${x};\nif (x > 10) {\n    cout << "A";\n} else if (x >= 5) {\n    cout << "B";\n} else {\n    cout << "C";\n}`;
    return {
      concept: "Condicionales",
      code: code(lang, py, cpp),
      out,
      wrong: ["A", "B", "C", "BC"].filter((v) => v !== out),
      why: `Se comprueban las condiciones **en orden** y solo se ejecuta la primera que se cumple. ${x} > 10 es ${x > 10 ? "verdadero" : "falso"}${x > 10 ? "" : `; ${x} >= 5 es ${x >= 5 ? "verdadero" : "falso"}`} → ${out}. ${x === 10 ? "Ojo: 10 **no** es mayor que 10." : x === 5 ? "Ojo: `>=` incluye el 5." : ""}`,
    };
  },
  listIndex(lang) {
    const v = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 5);
    const i = between(0, 3);
    const last = lang === "cpp" ? "v[4]" : "v[-1]";
    const out = v[i] + v[4];
    return {
      concept: "Índices de listas y vectores",
      code: code(lang, `v = [${v.join(", ")}]\nprint(v[${i}] + v[-1])`, `int v[] = {${v.join(", ")}};\ncout << v[${i}] + v[4] << endl;`),
      out: String(out),
      wrong: [String((v[i - 1] ?? v[0]) + v[4]), String(v[i + 1] + v[4]), String(v[i] + v[3])],
      why: `Los índices empiezan en **0**: \`v[${i}]\` es el ${["primer", "segundo", "tercer", "cuarto"][i]} elemento (${v[i]}) y \`${last}\` es el último (${v[4]}). ${v[i]} + ${v[4]} = ${out}.`,
    };
  },
  countStep(lang) {
    const a = between(0, 4);
    const k = between(2, 4);
    const b = a + between(7, 14);
    const c = Math.ceil((b - a) / k);
    const vals = [];
    for (let i = a; i < b; i += k) vals.push(i);
    return {
      concept: "Bucles con paso",
      code: code(lang, `c = 0\nfor i in range(${a}, ${b}, ${k}):\n    c += 1\nprint(c)`, `int c = 0;\nfor (int i = ${a}; i < ${b}; i += ${k}) {\n    c++;\n}\ncout << c << endl;`),
      out: String(c),
      wrong: [String(c + 1), String(c - 1), String(b - a)],
      why: `i toma los valores ${vals.join(", ")} (de ${k} en ${k}, sin llegar a ${b}): son **${c}** vueltas.`,
    };
  },
  whileDouble(lang) {
    const L = between(10, 90);
    let x = 1;
    let n = 0;
    const seq = [1];
    while (x < L) {
      x *= 2;
      n++;
      seq.push(x);
    }
    return {
      concept: "Bucles while",
      code: code(lang, `x = 1\nn = 0\nwhile x < ${L}:\n    x *= 2\n    n += 1\nprint(n, x)`, `int x = 1, n = 0;\nwhile (x < ${L}) {\n    x *= 2;\n    n++;\n}\ncout << n << " " << x << endl;`),
      out: `${n} ${x}`,
      wrong: [`${n - 1} ${x / 2}`, `${n + 1} ${x * 2}`, `${n} ${L}`],
      why: `x vale ${seq.join(" → ")}. El bucle para cuando x ya **no** es menor que ${L}, es decir, con x = ${x}, después de ${n} vueltas.`,
    };
  },
  nested(lang) {
    const n = between(3, 6);
    const c = (n * (n - 1)) / 2;
    return {
      concept: "Bucles anidados",
      code: code(lang, `c = 0\nfor i in range(${n}):\n    for j in range(i):\n        c += 1\nprint(c)`, `int c = 0;\nfor (int i = 0; i < ${n}; i++) {\n    for (int j = 0; j < i; j++) {\n        c++;\n    }\n}\ncout << c << endl;`),
      out: String(c),
      wrong: [String(n * n), String((n * (n + 1)) / 2), String(n)],
      why: `El bucle interior da **i** vueltas en cada pasada: ${Array.from({ length: n }, (_, i) => i).join(" + ")} = ${c}. No es ${n}·${n}, porque j depende de i.`,
    };
  },
  boolExpr(lang) {
    const x = between(0, 6);
    const y = between(0, 4);
    const r = x > 3 && y < 2;
    const out = lang === "cpp" ? (r ? "1" : "0") : r ? "True" : "False";
    const wrong = lang === "cpp" ? [r ? "0" : "1", r ? "true" : "false", "Error"] : [r ? "False" : "True", r ? "1" : "0", r ? "true" : "false"];
    return {
      concept: "Expresiones lógicas",
      code: code(lang, `x = ${x}\ny = ${y}\nprint(x > 3 and y < 2)`, `int x = ${x}, y = ${y};\ncout << (x > 3 && y < 2) << endl;`),
      out,
      wrong,
      why: `${x} > 3 es ${x > 3 ? "verdadero" : "falso"} y ${y} < 2 es ${y < 2 ? "verdadero" : "falso"}; con ${lang === "cpp" ? "`&&`" : "`and`"} hacen falta los dos → ${r ? "verdadero" : "falso"}. ${lang === "cpp" ? "`cout` muestra los booleanos como **1 y 0** (salvo que uses `boolalpha`)." : "Python escribe `True`/`False` con mayúscula."}`,
    };
  },
  byValue(lang) {
    const a = between(2, 9);
    const ref = lang === "cpp" ? Math.random() < 0.5 : Math.random() < 0.4;
    const out = String(ref ? a * 2 : a);
    const py = ref ? `def doble(x):\n    return x * 2\n\na = ${a}\na = doble(a)\nprint(a)` : `def doble(x):\n    x = x * 2\n    return x\n\na = ${a}\ndoble(a)\nprint(a)`;
    const cpp = `void doble(int ${ref ? "&" : ""}x) {\n    x = x * 2;\n}\n\nint main() {\n    int a = ${a};\n    doble(a);\n    cout << a << endl;\n}`;
    return {
      concept: "Funciones y parámetros",
      code: code(lang, py, cpp),
      out,
      wrong: [String(ref ? a : a * 2), "0", lang === "cpp" ? String(a * 4) : "None"],
      why:
        lang === "cpp"
          ? ref
            ? "Con `int &x` el parámetro es una **referencia**: la función trabaja sobre la propia `a`, que pasa a valer el doble."
            : "Con `int x` el parámetro se pasa **por valor**: la función recibe una copia, así que `a` no cambia."
          : ref
            ? "La función **devuelve** el doble y se guarda con `a = doble(a)`."
            : "Dentro de la función, `x = x * 2` crea un valor nuevo solo para `x`. Como el resultado no se guarda (`doble(a)` sin asignar), `a` sigue igual.",
    };
  },
  recursion(lang) {
    const n = between(3, 5);
    const fact = Math.random() < 0.5;
    const val = fact ? [1, 1, 2, 6, 24, 120][n] : (n * (n + 1)) / 2;
    const op = fact ? "*" : "+";
    const base = fact ? 1 : 0;
    const py = `def f(n):\n    if n <= ${fact ? 1 : 0}:\n        return ${base}\n    return n ${op} f(n - 1)\n\nprint(f(${n}))`;
    const cpp = `int f(int n) {\n    if (n <= ${fact ? 1 : 0}) return ${base};\n    return n ${op} f(n - 1);\n}\n\nint main() {\n    cout << f(${n}) << endl;\n}`;
    const expand = Array.from({ length: n }, (_, k) => n - k).join(` ${fact ? "·" : "+"} `);
    return {
      concept: "Recursividad",
      code: code(lang, py, cpp),
      out: String(val),
      wrong: fact ? [String(val / n), String(val * (n + 1)), String((n * (n + 1)) / 2)] : [String(val - n), String(val + n + 1), String([1, 1, 2, 6, 24, 120][n])],
      why: `f(${n}) = ${n} ${fact ? "·" : "+"} f(${n - 1}) = … hasta el caso base f(${fact ? 1 : 0}) = ${base}. En total: ${expand}${fact ? "" : " + 0"} = ${val}.`,
    };
  },
  maxLoop(lang) {
    const v = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 5);
    const mx = Math.max(...v);
    return {
      concept: "Recorrer y acumular",
      code: code(lang, `v = [${v.join(", ")}]\nm = v[0]\nfor x in v:\n    if x > m:\n        m = x\nprint(m)`, `int v[] = {${v.join(", ")}};\nint m = v[0];\nfor (int i = 0; i < 5; i++) {\n    if (v[i] > m) m = v[i];\n}\ncout << m << endl;`),
      out: String(mx),
      wrong: [String(v[0]), String(v[4]), String(Math.min(...v))],
      why: `m empieza en el primer elemento y se actualiza cada vez que aparece uno mayor: el bucle calcula el **máximo**, ${mx}.`,
    };
  },
  whileEdge(lang) {
    const n = between(5, 11);
    let i = 0;
    while (i <= n) i += 2;
    return {
      concept: "Condiciones de parada",
      code: code(lang, `i = 0\nwhile i <= ${n}:\n    i += 2\nprint(i)`, `int i = 0;\nwhile (i <= ${n}) {\n    i += 2;\n}\ncout << i << endl;`),
      out: String(i),
      wrong: [String(i - 2), String(n), String(n + 1)],
      why: `i vale 0, 2, 4… El bucle sigue mientras i <= ${n}. El primer valor que lo incumple es ${i}, y eso es lo que se imprime (el bucle termina **después** de pasarse).`,
    };
  },
};

export function genTraza(level, { lang = "python" } = {}) {
  const pools = {
    1: ["sumRange", "divMod", "ifChain", "listIndex"],
    2: ["countStep", "whileDouble", "nested", "boolExpr", "whileEdge", "sumRange"],
    3: ["byValue", "recursion", "maxLoop", "nested", "boolExpr"],
    4: ["byValue", "recursion", "whileEdge", "countStep", "whileDouble"],
    5: ["recursion", "byValue", "nested", "whileDouble"],
  };
  const t = tracers[pick(pools[Math.min(level, 5)])](lang);
  return choice({
    concept: t.concept,
    prompt: "¿Qué muestra este programa por pantalla?",
    code: t.code,
    lang,
    answer: `\`${t.out}\``,
    wrong: t.wrong.map((w) => `\`${w}\``),
    explanation: t.why,
  });
}

// ================================================================ Programario de sistemas: misiones de terminal

const q = (s) => `["']?${s}["']?`; // texto con o sin comillas

export const TERMINAL_MISSIONS = [
  // Nivel 1: moverse y manejar archivos
  { id: "pwd", level: 1, concept: "Navegación", prompt: "¿En qué directorio estás? Muéstralo.", accept: [/^pwd$/], hint: "Son las iniciales de *print working directory*.", solution: "pwd", output: "/home/ana", explanation: "`pwd` muestra la ruta absoluta del directorio actual." },
  { id: "ls-a", level: 1, concept: "Listar archivos", prompt: "Lista los archivos del directorio actual, **incluidos los ocultos**.", accept: [/^ls -[a-zA-Z]*a[a-zA-Z]*$/, /^ls --all$/], hint: "Usa `ls` con la opción de *all*.", solution: "ls -a", output: ".  ..  .bashrc  apuntes  notas.txt", explanation: "Los archivos ocultos empiezan por punto (`.bashrc`). `ls -a` los muestra, y también `.` (directorio actual) y `..` (el padre)." },
  { id: "ls-l", level: 1, concept: "Listar archivos", prompt: "Lista el directorio en **formato largo** (permisos, dueño, tamaño y fecha).", accept: [/^ls -[a-zA-Z]*l[a-zA-Z]*$/], hint: "La opción es la `l` de *long*.", solution: "ls -l", output: "-rw-r--r-- 1 ana ana 120 oct  3 10:00 notas.txt", explanation: "`ls -l` muestra una línea por archivo con permisos, enlaces, dueño, grupo, tamaño, fecha y nombre. `ls -lh` pone los tamaños en K/M/G." },
  { id: "cd-home", level: 1, concept: "Navegación", prompt: "Vuelve a tu **directorio personal**.", accept: [/^cd$/, /^cd ~\/?$/, /^cd \$HOME$/, /^cd \/home\/ana\/?$/], hint: "`cd` solo, o `cd` con el símbolo que representa tu carpeta personal.", solution: "cd ~", explanation: "`cd` sin argumentos o `cd ~` te lleva a tu carpeta personal (`/home/ana`)." },
  { id: "cd-up", level: 1, concept: "Navegación", prompt: "Sube al **directorio padre**.", accept: [/^cd \.\.\/?$/], hint: "El directorio padre se escribe con dos puntos.", solution: "cd ..", explanation: "`..` es el directorio padre y `.` el actual. `cd ../..` sube dos niveles." },
  { id: "mkdir", level: 1, concept: "Crear archivos y carpetas", prompt: "Crea un directorio llamado **proyectos**.", accept: [/^mkdir (-p )?proyectos\/?$/], hint: "*make directory*.", solution: "mkdir proyectos", explanation: "`mkdir` crea directorios. Con `-p` crea también los padres que falten y no da error si ya existe." },
  { id: "mkdir-p", level: 1, concept: "Crear archivos y carpetas", prompt: "Crea de una vez las carpetas anidadas **a/b/c**.", accept: [/^mkdir -p a\/b\/c\/?$/, /^mkdir --parents a\/b\/c\/?$/], hint: "`mkdir` necesita una opción para crear los directorios padre.", solution: "mkdir -p a/b/c", explanation: "Sin `-p`, `mkdir a/b/c` falla porque `a` y `b` no existen. `-p` (*parents*) crea toda la ruta." },
  { id: "touch", level: 1, concept: "Crear archivos y carpetas", prompt: "Crea un archivo **vacío** llamado **notas.txt**.", accept: [/^touch notas\.txt$/, /^> ?notas\.txt$/, /^: ?> ?notas\.txt$/], hint: "El comando que también sirve para actualizar la fecha de un archivo.", solution: "touch notas.txt", explanation: "`touch` crea el archivo si no existe (y si existe, solo actualiza su fecha de modificación)." },
  { id: "cp", level: 1, concept: "Copiar, mover y borrar", prompt: "Copia **informe.txt** dentro de la carpeta **backup**.", accept: [/^cp informe\.txt backup\/?(informe\.txt)?$/], hint: "`cp origen destino`.", solution: "cp informe.txt backup/", explanation: "`cp origen destino`. Si el destino es una carpeta, el archivo se copia dentro con el mismo nombre." },
  { id: "cp-r", level: 1, concept: "Copiar, mover y borrar", prompt: "Copia la carpeta **fotos** entera (con todo su contenido) a **copia**.", accept: [/^cp -[a-zA-Z]*[rR][a-zA-Z]* fotos\/? copia\/?$/, /^cp --recursive fotos\/? copia\/?$/], hint: "Para copiar carpetas hace falta la opción recursiva.", solution: "cp -r fotos copia", explanation: "Sin `-r` (recursivo), `cp` se niega a copiar directorios. `cp -a` además conserva permisos y fechas." },
  { id: "mv", level: 1, concept: "Copiar, mover y borrar", prompt: "Renombra **viejo.txt** a **nuevo.txt**.", accept: [/^mv viejo\.txt nuevo\.txt$/], hint: "En Linux, renombrar es «mover» a otro nombre.", solution: "mv viejo.txt nuevo.txt", explanation: "`mv` mueve y también renombra: no existe un comando `rename` básico separado." },
  { id: "rm-r", level: 1, concept: "Copiar, mover y borrar", prompt: "Borra la carpeta **build** y todo su contenido.", accept: [/^rm -[a-zA-Z]*[rR][a-zA-Z]* build\/?$/, /^rm --recursive( --force)? build\/?$/], hint: "`rm` con la opción recursiva.", solution: "rm -r build", explanation: "`rm -r` borra carpetas con su contenido; `rm -rf` además no pregunta. ¡No hay papelera! `rmdir` solo borra carpetas vacías." },

  // Nivel 2: ver contenido y comodines
  { id: "cat", level: 2, concept: "Ver archivos", prompt: "Muestra el contenido completo de **saludo.txt**.", accept: [/^(cat|less|more) saludo\.txt$/], hint: "El comando más corto para concatenar y mostrar archivos.", solution: "cat saludo.txt", output: "¡Hola, mundo!", explanation: "`cat` muestra el archivo entero. Para archivos largos es mejor `less` (con `q` sales)." },
  { id: "head", level: 2, concept: "Ver archivos", prompt: "Muestra las **5 primeras** líneas de **datos.csv**.", accept: [/^head -(n ?)?5 datos\.csv$/, /^head datos\.csv -n ?5$/], hint: "`head` muestra el principio; con `-n` eliges cuántas líneas.", solution: "head -n 5 datos.csv", explanation: "`head` muestra 10 líneas por defecto; `-n 5` (o `-5`) cambia la cantidad." },
  { id: "tail-f", level: 2, concept: "Ver archivos", prompt: "Sigue **en directo** lo que se va escribiendo en **app.log**.", accept: [/^tail -[a-zA-Z]*f[a-zA-Z]* app\.log$/, /^tail -[fF] -n ?\d+ app\.log$/], hint: "`tail` con la opción de *follow*.", solution: "tail -f app.log", explanation: "`tail -f` se queda esperando y muestra las líneas nuevas según llegan. Sales con Ctrl+C." },
  { id: "wc", level: 2, concept: "Ver archivos", prompt: "Cuenta las **líneas** de **datos.csv**.", accept: [/^wc -l datos\.csv$/, /^wc -l ?< ?datos\.csv$/, /^cat datos\.csv \| wc -l$/], hint: "*word count*, con la opción de líneas.", solution: "wc -l datos.csv", output: "128 datos.csv", explanation: "`wc` cuenta líneas (`-l`), palabras (`-w`) y bytes (`-c`)." },
  { id: "glob-txt", level: 2, concept: "Comodines", prompt: "Lista solo los archivos que terminan en **.txt**.", accept: [/^ls (-[a-zA-Z]+ )?\*\.txt$/], hint: "El asterisco representa «cualquier cosa».", solution: "ls *.txt", explanation: "La shell sustituye `*.txt` por todos los nombres que acaban en `.txt` antes de ejecutar `ls`." },
  { id: "glob-q", level: 2, concept: "Comodines", prompt: "Lista los archivos **tema1.pdf**, **tema2.pdf**… (tema + un único carácter + .pdf).", accept: [/^ls (-[a-zA-Z]+ )?tema\?\.pdf$/, /^ls (-[a-zA-Z]+ )?tema\[0-9\]\.pdf$/], hint: "El comodín que representa **exactamente un** carácter.", solution: "ls tema?.pdf", explanation: "`?` encaja con un solo carácter: `tema1.pdf` sí, `tema10.pdf` no. `[0-9]` restringe a un dígito." },
  { id: "braces", level: 2, concept: "Comodines", prompt: "Crea a la vez las carpetas **src**, **docs** y **tests** usando llaves.", accept: [/^mkdir (-p )?\{src,docs,tests\}$/, /^mkdir (-p )?\{(src|docs|tests),(src|docs|tests),(src|docs|tests)\}$/], hint: "`mkdir {a,b,c}`.", solution: "mkdir {src,docs,tests}", explanation: "La expansión de llaves `{a,b,c}` genera una palabra por cada elemento: equivale a `mkdir src docs tests`." },
  { id: "man", level: 2, concept: "Ayuda", prompt: "Abre el **manual** del comando grep.", accept: [/^man grep$/], hint: "Tres letras, de *manual*.", solution: "man grep", explanation: "`man` muestra el manual completo (sales con `q`). Para un resumen rápido: `grep --help`." },

  // Nivel 3: permisos y búsquedas
  { id: "chmod-x", level: 3, concept: "Permisos", prompt: "Da permiso de **ejecución** al dueño de **script.sh**.", accept: [/^chmod (u\+x|\+x|a\+x|744|755|700) script\.sh$/], hint: "`chmod` con `u+x` (o `+x`).", solution: "chmod u+x script.sh", explanation: "`u` = dueño (*user*), `g` = grupo, `o` = otros, `a` = todos. `+x` añade ejecución; `-x` la quita." },
  { id: "chmod-755", level: 3, concept: "Permisos", prompt: "Pon a **script.sh** los permisos `rwxr-xr-x` en **octal**.", accept: [/^chmod 0?755 script\.sh$/], hint: "r=4, w=2, x=1. Suma cada grupo de tres.", solution: "chmod 755 script.sh", explanation: "`rwx` = 4+2+1 = 7, `r-x` = 4+0+1 = 5 → **755**: el dueño hace todo, el resto lee y ejecuta." },
  { id: "chmod-644", level: 3, concept: "Permisos", prompt: "Pon a **datos.txt** los permisos `rw-r--r--` en **octal**.", accept: [/^chmod 0?644 datos\.txt$/], hint: "rw- = 6, r-- = 4.", solution: "chmod 644 datos.txt", explanation: "`rw-` = 6 y `r--` = 4 → **644**, lo típico para un archivo normal." },
  { id: "chmod-600", level: 3, concept: "Permisos", prompt: "Haz que **clave.pem** solo la pueda leer y escribir su dueño (en octal).", accept: [/^chmod 0?600 clave\.pem$/], hint: "Dueño rw- y nada para grupo y otros.", solution: "chmod 600 clave.pem", explanation: "`600`: el dueño lee y escribe, nadie más tiene ningún permiso. SSH exige esto para las claves privadas." },
  { id: "chown", level: 3, concept: "Permisos", prompt: "Cambia el **propietario** de **web.conf** al usuario **ana**.", accept: [/^(sudo )?chown ana(:\w+)? web\.conf$/], hint: "*change owner*.", solution: "sudo chown ana web.conf", explanation: "`chown usuario archivo` cambia el dueño (normalmente hace falta `sudo`). `chown ana:alumnos` cambia también el grupo." },
  { id: "grep", level: 3, concept: "Buscar texto", prompt: "Busca las líneas que contienen **error** en **app.log**.", accept: [new RegExp(`^grep ${q("error")} app\\.log$`)], hint: "`grep patrón archivo`.", solution: "grep error app.log", output: "12:03 error: conexión rechazada", explanation: "`grep` muestra las líneas que contienen el patrón. Útiles: `-i` ignora mayúsculas, `-n` número de línea, `-v` invierte." },
  { id: "grep-i", level: 3, concept: "Buscar texto", prompt: "Busca **error** en **app.log** sin distinguir mayúsculas de minúsculas.", accept: [new RegExp(`^grep -[a-zA-Z]*i[a-zA-Z]* ${q("error")} app\\.log$`)], hint: "La opción de *ignore case*.", solution: "grep -i error app.log", explanation: "Con `-i` encuentra `error`, `Error` y `ERROR`." },
  { id: "grep-c", level: 3, concept: "Buscar texto", prompt: "Cuenta **cuántas líneas** de **app.log** contienen **error**.", accept: [new RegExp(`^grep -[a-zA-Z]*c[a-zA-Z]* ${q("error")} app\\.log$`), new RegExp(`^grep ${q("error")} app\\.log \\| wc -l$`)], hint: "`grep` tiene una opción para contar, o puedes encadenarlo con `wc -l`.", solution: "grep -c error app.log", output: "7", explanation: "`grep -c` cuenta las líneas que coinciden. Equivale a `grep error app.log | wc -l`." },
  { id: "grep-r", level: 3, concept: "Buscar texto", prompt: "Busca **TODO** en todos los archivos de la carpeta **src** (recursivamente).", accept: [new RegExp(`^grep -[a-zA-Z]*[rR][a-zA-Z]* ${q("TODO")} src\\/?$`)], hint: "`grep` con la opción recursiva y la carpeta al final.", solution: "grep -r TODO src/", explanation: "`-r` entra en todas las subcarpetas. `grep -rn` añade el número de línea, muy útil para programar." },
  { id: "find-name", level: 3, concept: "Buscar archivos", prompt: "Encuentra todos los archivos **.txt** desde el directorio actual hacia abajo.", accept: [/^find (\.\/? )?-name ("\*\.txt"|'\*\.txt'|\\\*\.txt)$/], hint: "`find . -name` con el patrón **entre comillas**.", solution: 'find . -name "*.txt"', explanation: "`find` recorre directorios. Las comillas evitan que la shell expanda `*.txt` antes de tiempo." },
  { id: "find-d", level: 3, concept: "Buscar archivos", prompt: "Encuentra los **directorios** llamados **node_modules** desde aquí.", accept: [/^find (\.\/? )?(-type d -name ["']?node_modules["']?|-name ["']?node_modules["']? -type d)$/], hint: "`find` con `-type d` y `-name`.", solution: "find . -type d -name node_modules", explanation: "`-type d` filtra directorios (`-type f`, archivos)." },
  { id: "df", level: 3, concept: "Sistema", prompt: "Muestra el **espacio libre** en los discos en formato legible.", accept: [/^df -[a-zA-Z]*h[a-zA-Z]*$/], hint: "*disk free* con la opción *human*.", solution: "df -h", explanation: "`df -h` muestra el uso de cada disco en K, M y G. Para el tamaño de una carpeta: `du -sh carpeta`." },
  { id: "du", level: 3, concept: "Sistema", prompt: "¿Cuánto **ocupa en total** la carpeta **videos**? (formato legible)", accept: [/^du -(sh|hs) videos\/?$/, /^du -s -h videos\/?$/, /^du -h -s videos\/?$/], hint: "*disk usage* con `-s` (resumen) y `-h`.", solution: "du -sh videos", output: "4,2G	videos", explanation: "`du -s` da solo el total y `-h` lo hace legible." },

  // Nivel 4: redirecciones, tuberías, procesos, comprimir
  { id: "redir", level: 4, concept: "Redirecciones", prompt: "Guarda la salida de `ls` en **lista.txt** (sobrescribiendo).", accept: [/^ls( -[a-zA-Z]+)? ?> ?lista\.txt$/], hint: "El operador `>`.", solution: "ls > lista.txt", explanation: "`>` envía la salida a un archivo y **borra** lo que hubiera. Para añadir al final se usa `>>`." },
  { id: "append", level: 4, concept: "Redirecciones", prompt: "**Añade** la línea **hola** al final de **log.txt** sin borrar lo que tiene.", accept: [new RegExp(`^echo ${q("hola")} ?>> ?log\\.txt$`)], hint: "`echo` y el operador de añadir.", solution: "echo hola >> log.txt", explanation: "`>>` añade al final; `>` lo habría sobrescrito." },
  { id: "stderr", level: 4, concept: "Redirecciones", prompt: "Ejecuta **./compilar.sh** y guarda **solo los errores** en **errores.txt**.", accept: [/^(\.\/compilar\.sh|bash compilar\.sh|sh compilar\.sh) 2> ?errores\.txt$/], hint: "Los errores salen por el canal 2.", solution: "./compilar.sh 2> errores.txt", explanation: "stdout es el canal 1 y stderr el 2. `2>` redirige solo los errores; `&>` o `> archivo 2>&1` redirigen ambos." },
  { id: "pipe-count", level: 4, concept: "Tuberías", prompt: "Cuenta cuántos archivos hay en el directorio actual usando `ls` y una **tubería**.", accept: [/^ls( -[a-zA-Z1]+)? \| wc -l$/], hint: "`ls | ...` con el contador de líneas.", solution: "ls | wc -l", output: "14", explanation: "La tubería `|` conecta la salida de `ls` con la entrada de `wc -l`, que cuenta las líneas (una por archivo)." },
  { id: "sort-uniq", level: 4, concept: "Tuberías", prompt: "Muestra **nombres.txt** ordenado y **sin duplicados**.", accept: [/^sort nombres\.txt \| uniq$/, /^sort -u nombres\.txt$/, /^cat nombres\.txt \| sort \| uniq$/, /^cat nombres\.txt \| sort -u$/], hint: "Ordena y luego quita repetidos (o una opción de `sort` lo hace todo).", solution: "sort nombres.txt | uniq", explanation: "`uniq` solo elimina repeticiones **consecutivas**, por eso va después de `sort`. `sort -u` hace las dos cosas." },
  { id: "ps-grep", level: 4, concept: "Procesos", prompt: "Muestra los procesos que contienen **python**.", accept: [new RegExp(`^ps (aux|-ef|-aux|ax) \\| grep ${q("python")}$`), /^pgrep (-[a-z]+ )?python$/], hint: "Lista todos los procesos y filtra con `grep`.", solution: "ps aux | grep python", explanation: "`ps aux` lista todos los procesos y `grep` filtra. `pgrep -a python` hace lo mismo más limpio." },
  { id: "kill", level: 4, concept: "Procesos", prompt: "Termina el proceso con PID **4242**.", accept: [/^kill (-(9|15|KILL|TERM|SIGKILL|SIGTERM) )?4242$/], hint: "`kill` seguido del PID.", solution: "kill 4242", explanation: "`kill` envía la señal TERM (15), que pide terminar ordenadamente. `kill -9` fuerza la muerte; úsalo solo si lo otro no funciona." },
  { id: "bg", level: 4, concept: "Procesos", prompt: "Ejecuta **./servidor.sh** en **segundo plano**.", accept: [/^(\.\/servidor\.sh|bash servidor\.sh|sh servidor\.sh) ?&$/, /^nohup (\.\/servidor\.sh|bash servidor\.sh) ?&$/], hint: "Termina el comando con un símbolo especial.", solution: "./servidor.sh &", explanation: "`&` al final lanza el proceso en segundo plano y te devuelve el prompt. `jobs` los lista y `fg` lo trae al frente." },
  { id: "top", level: 4, concept: "Procesos", prompt: "Muestra los procesos y el uso de CPU **en tiempo real**.", accept: [/^(top|htop|btop)$/], hint: "Tres letras.", solution: "top", explanation: "`top` (o `htop`, más cómodo) se actualiza continuamente. Sales con `q`." },
  { id: "tar-c", level: 4, concept: "Comprimir", prompt: "Comprime la carpeta **proyecto** en **proyecto.tar.gz**.", accept: [/^tar -?(?=[a-z]*c)(?=[a-z]*z)(?=[a-z]*f)[cvzf]+ proyecto\.tar\.gz proyecto\/?$/], hint: "`tar` con c (crear), z (gzip) y f (archivo).", solution: "tar -czf proyecto.tar.gz proyecto", explanation: "**c**rear, g**z**ip, **f**ile (el nombre va justo después). Para extraer: `tar -xzf`." },
  { id: "tar-x", level: 4, concept: "Comprimir", prompt: "Extrae **backup.tar.gz** en el directorio actual.", accept: [/^tar -?(?=[a-z]*x)(?=[a-z]*f)[xvzf]+ backup\.tar\.gz$/], hint: "Igual que para crear, pero con x (extraer).", solution: "tar -xzf backup.tar.gz", explanation: "`x` = extraer. Con `-C carpeta` extraes en otro sitio y con `t` solo listas el contenido." },
  { id: "and", level: 4, concept: "Encadenar comandos", prompt: "Entra en **build** y, **solo si lo consigue**, ejecuta **make**.", accept: [/^cd build\/? ?&& ?make$/], hint: "El operador que ejecuta el segundo comando solo si el primero tiene éxito.", solution: "cd build && make", explanation: "`&&` ejecuta el siguiente solo si el anterior terminó bien (código 0). `||` hace lo contrario: solo si falla. `;` ejecuta siempre." },

  // Nivel 5: scripts de Bash
  { id: "var", level: 5, concept: "Bash: variables", prompt: "Crea una variable **nombre** con el valor **Ana**.", accept: [/^nombre=["']?Ana["']?$/], hint: "Sin espacios alrededor del `=`.", solution: 'nombre="Ana"', explanation: "En Bash **no puede haber espacios** alrededor del `=`: `nombre = Ana` intentaría ejecutar un comando llamado `nombre`." },
  { id: "echo-var", level: 5, concept: "Bash: variables", prompt: "Muestra **Hola,** seguido del valor de la variable **nombre**.", accept: [/^echo "Hola,? \$\{?nombre\}?"$/, /^echo Hola,? \$\{?nombre\}?$/], hint: "Usa comillas dobles y `$` delante del nombre de la variable.", solution: 'echo "Hola, $nombre"', output: "Hola, Ana", explanation: "Con comillas **dobles** se sustituye la variable. Con simples (`'Hola, $nombre'`) se escribiría literalmente `$nombre`." },
  { id: "subst", level: 5, concept: "Bash: variables", prompt: "Guarda en la variable **hoy** la salida del comando **date**.", accept: [/^hoy=("?\$\(date( [^)]*)?\)"?|`date`)$/], hint: "Sustitución de comandos: `$( … )`.", solution: "hoy=$(date)", explanation: "`$(comando)` se sustituye por lo que imprime el comando. La forma antigua con comillas invertidas también funciona." },
  { id: "status", level: 5, concept: "Bash: variables especiales", prompt: "Muestra el **código de salida** del último comando ejecutado.", accept: [/^echo "?\$\?"?$/], hint: "Una variable especial formada por `$` y un signo de interrogación.", solution: "echo $?", output: "0", explanation: "`$?` vale 0 si el último comando tuvo éxito y otro número si falló." },
  { id: "shebang", level: 5, concept: "Bash: scripts", prompt: "Escribe la **primera línea** de un script de Bash (el *shebang*).", accept: [/^#! ?\/(usr\/)?bin\/bash$/, /^#! ?\/usr\/bin\/env bash$/], hint: "Empieza por `#!` seguido de la ruta de bash.", solution: "#!/bin/bash", explanation: "El shebang indica qué intérprete ejecuta el script. `#!/usr/bin/env bash` busca bash en el PATH (más portable)." },
  { id: "args", level: 5, concept: "Bash: argumentos", prompt: "Dentro de un script, muestra **el primer argumento** que ha recibido.", accept: [/^echo "?\$\{?1\}?"?$/], hint: "Los argumentos son `$1`, `$2`…", solution: 'echo "$1"', explanation: "`$1` es el primer argumento, `$#` el número de argumentos, `$@` todos y `$0` el nombre del script." },
  { id: "nargs", level: 5, concept: "Bash: argumentos", prompt: "Muestra **cuántos argumentos** ha recibido el script.", accept: [/^echo "?\$#"?$/], hint: "`$` seguido de almohadilla.", solution: "echo $#", explanation: "`$#` es el número de argumentos. Se usa para comprobar que el usuario ha pasado los datos necesarios." },
  { id: "arith", level: 5, concept: "Bash: aritmética", prompt: "Muestra el resultado de **7 + 5** usando la expansión aritmética de Bash.", accept: [/^echo "?\$\(\( ?7 ?\+ ?5 ?\)\)"?$/], hint: "`$(( … ))`.", solution: "echo $((7 + 5))", output: "12", explanation: "`$(( ))` evalúa operaciones con enteros: `+ - * / %`. `echo 7 + 5` imprimiría el texto tal cual." },
  { id: "for", level: 5, concept: "Bash: bucles", prompt: "En una línea, un bucle **for** que muestre los números del **1 al 5**.", accept: [/^for (\w+) in (1 2 3 4 5|\{1\.\.5\}|\$\(seq 1 5\)|`seq 1 5`) ?; ?do echo "?\$\{?\1\}?"? ?; ?done$/, /^for \(\( ?(\w+) ?= ?1 ?; ?\1 ?<= ?5 ?; ?(\1\+\+|\+\+\1|\1 ?\+= ?1) ?\)\) ?; ?do echo "?\$\{?\1\}?"? ?; ?done$/], hint: "`for i in {1..5}; do …; done`.", solution: "for i in {1..5}; do echo $i; done", output: "1\n2\n3\n4\n5", explanation: "`{1..5}` genera 1 2 3 4 5. La estructura es `for var in lista; do comandos; done`." },
  { id: "if-file", level: 5, concept: "Bash: condicionales", prompt: "En una línea: si existe el archivo **config.txt**, muestra **existe**.", accept: [/^if \[\[? -[ef] "?config\.txt"? \]\]? ?; ?then echo ["']?existe["']? ?; ?fi$/, /^\[\[? -[ef] "?config\.txt"? \]\]? && echo ["']?existe["']?$/], hint: "`if [ -f archivo ]; then …; fi` (¡espacios dentro de los corchetes!).", solution: "if [ -f config.txt ]; then echo existe; fi", explanation: "`-f` comprueba que existe y es un archivo; `-e` que existe; `-d` que es un directorio. Los espacios dentro de `[ ]` son obligatorios." },
  { id: "test-gt", level: 5, concept: "Bash: condicionales", prompt: "Escribe la **condición** (entre corchetes) que comprueba si la variable **n** es **mayor que 10**.", accept: [/^\[ "?\$n"? -gt 10 \]$/, /^\[\[ "?\$n"? -gt 10 \]\]$/, /^\(\( ?n ?> ?10 ?\)\)$/], hint: "Para números se usa `-gt` (*greater than*).", solution: '[ "$n" -gt 10 ]', explanation: "Dentro de `[ ]`, `>` sería una **redirección**. Para números: `-eq -ne -lt -le -gt -ge`. En `(( ))` sí se puede usar `>`." },
  { id: "chmod-run", level: 5, concept: "Bash: scripts", prompt: "Haz ejecutable **script.sh** y ejecútalo, en **una línea** con `&&`.", accept: [/^chmod (u?\+x|7[0-7][0-7]) script\.sh && \.\/script\.sh$/], hint: "Primero `chmod`, luego `./script.sh`.", solution: "chmod +x script.sh && ./script.sh", explanation: "Hace falta permiso de ejecución y `./` delante, porque el directorio actual no está en el PATH." },
  { id: "func", level: 5, concept: "Bash: funciones", prompt: "Define en una línea una función **saluda** que muestre **hola**.", accept: [/^(function )?saluda ?\(\) ?\{ ?echo ["']?hola["']? ?; ?\}$/, /^function saluda ?\{ ?echo ["']?hola["']? ?; ?\}$/], hint: "`nombre() { comandos; }` (el `;` antes de `}` es obligatorio en una línea).", solution: "saluda() { echo hola; }", explanation: "Las funciones se llaman como cualquier comando (`saluda`) y reciben argumentos en `$1`, `$2`… En una línea hace falta `;` antes de la llave final." },
  { id: "read", level: 5, concept: "Bash: entrada", prompt: "Pide al usuario su nombre y guárdalo en la variable **nombre**.", accept: [/^read (-p ["'][^"']*["'] )?nombre$/, /^read -r (-p ["'][^"']*["'] )?nombre$/], hint: "El comando que lee una línea de la entrada.", solution: 'read -p "¿Nombre? " nombre', explanation: "`read` lee lo que escribe el usuario y lo guarda en la variable. `-p` muestra un mensaje antes." },
];
