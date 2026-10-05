using System.Collections.Generic;
using UnityEngine;

namespace ArenaMix
{
    /// <summary>
    /// A 1 vs 1 match with goalkeepers: builds the pitch, goals, boards and stands, spawns the players
    /// with their Mixamo characters, runs kick-offs, goals, the clock and the scoreboard (IMGUI HUD).
    /// Team 0 is you and attacks towards +x; team 1 is the CPU.
    /// </summary>
    [DefaultExecutionOrder(-40)]
    public class MatchManager : MonoBehaviour
    {
        [Header("Pitch (metres)")]
        public float length = 50f;
        public float width = 32f;
        public float goalWidth = 7.2f;
        public float goalHeight = 2.44f;
        public float matchSeconds = 180f;

        [Header("Characters (Mixamo FBX, imported as Humanoid)")]
        public GameObject[] characterModels;
        public RuntimeAnimatorController controller;
        public float characterHeight = 1.85f;

        [Header("Materials (created by ArenaMix > Preparar proyecto)")]
        public Material pitchLight, pitchDark, lineMat, postMat, netMat, boardMat, standMat, ballMat, ringMat;

        [Header("Look")]
        public Color homeColor = new Color(1f, 0.54f, 0.24f);
        public Color awayColor = new Color(0.24f, 0.65f, 1f);

        public Ball Ball { get; private set; }
        public bool Playing => state == State.Play;
        public float HalfWidth => width * 0.5f;

        enum State { Kickoff, Play, Goal, End }
        State state = State.Kickoff;
        float stateTime, clock;
        int[] score = new int[2];
        readonly Footballer[] field = new Footballer[2];
        readonly Keeper[] keepers = new Keeper[2];
        GameInput input;
        string flash; float flashTime;
        int lastScorer;

        // ---------------- public helpers ----------------
        /// <summary>Centre of the goal that team t defends (team 0 defends -x).</summary>
        public Vector3 GoalCenter(int t) => new Vector3(t == 0 ? -length * 0.5f : length * 0.5f, 0f, 0f);
        public Footballer FieldPlayer(int team) => field[team];

        public Vector3 ClampToField(Vector3 p, float margin)
        {
            p.x = Mathf.Clamp(p.x, -length * 0.5f - margin, length * 0.5f + margin);
            p.z = Mathf.Clamp(p.z, -width * 0.5f - margin, width * 0.5f + margin);
            p.y = 0f;
            return p;
        }

        public void Flash(string text, float time = 1.4f) { flash = text; flashTime = time; }

        // ---------------- setup ----------------
        void Awake()
        {
            Application.targetFrameRate = 60;
            EnsureMaterials();
            BuildPitch();
            BuildGoal(-1); BuildGoal(1);
            BuildBoardsAndStands();
            SpawnBall();
            input = GetComponent<GameInput>();
            if (input == null) input = gameObject.AddComponent<GameInput>();
            SpawnPlayers();
            clock = matchSeconds;
            Kickoff(0);
        }

        void EnsureMaterials()
        {
            Shader lit = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            Shader unlit = Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Unlit/Color");
            Material M(Material m, Shader s, Color c) { if (m != null) return m; var n = new Material(s); n.color = c; return n; }
            pitchLight = M(pitchLight, lit, new Color(0.09f, 0.48f, 0.11f));
            pitchDark = M(pitchDark, lit, new Color(0.07f, 0.41f, 0.09f));
            lineMat = M(lineMat, unlit, new Color(0.95f, 0.97f, 0.95f));
            postMat = M(postMat, lit, Color.white);
            netMat = M(netMat, unlit, new Color(1f, 1f, 1f, 0.5f));
            boardMat = M(boardMat, unlit, new Color(0.05f, 0.05f, 0.09f));
            standMat = M(standMat, lit, new Color(0.16f, 0.19f, 0.27f));
            ballMat = M(ballMat, lit, Color.white);
            if (ringMat == null)
            {
                ringMat = new Material(unlit);
                ringMat.mainTexture = RingTexture();
                ringMat.SetFloat("_AlphaClip", 1f);
                ringMat.SetFloat("_Cutoff", 0.5f);
                ringMat.EnableKeyword("_ALPHATEST_ON");
                ringMat.renderQueue = 2450;
            }
        }

        /// <summary>White ring on transparent, for the team marker under each player.</summary>
        public static Texture2D RingTexture()
        {
            const int n = 128;
            var t = new Texture2D(n, n, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp };
            var px = new Color32[n * n];
            for (int y = 0; y < n; y++)
                for (int x = 0; x < n; x++)
                {
                    float d = new Vector2(x + 0.5f - n * 0.5f, y + 0.5f - n * 0.5f).magnitude / (n * 0.5f);
                    px[y * n + x] = new Color32(255, 255, 255, (byte)(d > 0.74f && d < 0.96f ? 255 : 0));
                }
            t.SetPixels32(px);
            t.Apply();
            return t;
        }

        static GameObject Prim(PrimitiveType t, string name, Transform parent, Vector3 pos, Vector3 scale, Material mat, bool keepCollider = false)
        {
            var g = GameObject.CreatePrimitive(t);
            g.name = name;
            g.transform.SetParent(parent, false);
            g.transform.localPosition = pos;
            g.transform.localScale = scale;
            if (mat != null) g.GetComponent<Renderer>().sharedMaterial = mat;
            if (!keepCollider) Destroy(g.GetComponent<Collider>());
            return g;
        }

        void BuildPitch()
        {
            var root = new GameObject("Pitch").transform;
            float L = length, W = width, margin = 5f;
            // mowing stripes across the pitch, plus a margin around it
            int stripes = 10;
            float total = L + margin * 2f, sw = total / stripes;
            for (int i = 0; i < stripes; i++)
            {
                var q = Prim(PrimitiveType.Quad, "Stripe" + i, root, new Vector3(-total * 0.5f + sw * (i + 0.5f), 0f, 0f), new Vector3(sw, W + margin * 2f, 1f), i % 2 == 0 ? pitchLight : pitchDark);
                q.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
                q.GetComponent<Renderer>().receiveShadows = true;
            }
            // the ground the ball bounces on
            var ground = new GameObject("Ground");
            ground.transform.SetParent(root, false);
            var gc = ground.AddComponent<BoxCollider>();
            gc.center = new Vector3(0f, -0.5f, 0f);
            gc.size = new Vector3(L + 40f, 1f, W + 40f);
            Compat.SetBounce(gc, 0.45f, 0.6f);

            // lines
            float lw = 0.12f, y = 0.01f;
            void Line(Vector3 a, Vector3 b)
            {
                Vector3 d = b - a;
                var q = Prim(PrimitiveType.Quad, "Line", root, (a + b) * 0.5f + Vector3.up * y, new Vector3(lw, d.magnitude + lw, 1f), lineMat);
                q.transform.localRotation = Quaternion.LookRotation(Vector3.down, d.normalized);
                q.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            float hx = L * 0.5f, hz = W * 0.5f;
            Line(new Vector3(-hx, 0, -hz), new Vector3(hx, 0, -hz));
            Line(new Vector3(-hx, 0, hz), new Vector3(hx, 0, hz));
            Line(new Vector3(-hx, 0, -hz), new Vector3(-hx, 0, hz));
            Line(new Vector3(hx, 0, -hz), new Vector3(hx, 0, hz));
            Line(new Vector3(0, 0, -hz), new Vector3(0, 0, hz));
            foreach (float s in new[] { -1f, 1f })
            {
                float gx = hx * s, bx = gx - s * 11f, sx = gx - s * 4f;
                Line(new Vector3(gx, 0, -10f), new Vector3(bx, 0, -10f));
                Line(new Vector3(gx, 0, 10f), new Vector3(bx, 0, 10f));
                Line(new Vector3(bx, 0, -10f), new Vector3(bx, 0, 10f));
                Line(new Vector3(gx, 0, -5.5f), new Vector3(sx, 0, -5.5f));
                Line(new Vector3(gx, 0, 5.5f), new Vector3(sx, 0, 5.5f));
                Line(new Vector3(sx, 0, -5.5f), new Vector3(sx, 0, 5.5f));
            }
            // centre circle
            const int seg = 48;
            for (int i = 0; i < seg; i++)
            {
                float a0 = i * Mathf.PI * 2f / seg, a1 = (i + 1) * Mathf.PI * 2f / seg;
                Line(new Vector3(Mathf.Cos(a0), 0, Mathf.Sin(a0)) * 6f, new Vector3(Mathf.Cos(a1), 0, Mathf.Sin(a1)) * 6f);
            }
        }

        void BuildGoal(int side)
        {
            var root = new GameObject(side < 0 ? "GoalWest" : "GoalEast").transform;
            float gx = length * 0.5f * side, hw = goalWidth * 0.5f, h = goalHeight, depth = 1.8f, r = 0.06f;
            root.position = new Vector3(gx, 0f, 0f);
            foreach (float z in new[] { -hw, hw })
            {
                var p = Prim(PrimitiveType.Cylinder, "Post", root, new Vector3(0f, h * 0.5f, z), new Vector3(r * 2f, h * 0.5f, r * 2f), postMat, true);
                Compat.SetBounce(p.GetComponent<Collider>(), 0.6f, 0.2f);
            }
            var bar = Prim(PrimitiveType.Cylinder, "Crossbar", root, new Vector3(0f, h, 0f), new Vector3(r * 2f, hw + r, r * 2f), postMat, true);
            bar.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            Compat.SetBounce(bar.GetComponent<Collider>(), 0.6f, 0.2f);
            // net: back, sides and roof catch the ball softly
            float bx = side * depth;
            void Net(Vector3 c, Vector3 size, Quaternion rot)
            {
                var n = Prim(PrimitiveType.Cube, "Net", root, c, size, netMat, true);
                n.transform.localRotation = rot;
                Compat.SetBounce(n.GetComponent<Collider>(), 0.05f, 0.9f);
                n.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            Net(new Vector3(bx, h * 0.5f, 0f), new Vector3(0.04f, h, goalWidth), Quaternion.identity);
            Net(new Vector3(bx * 0.5f, h, 0f), new Vector3(depth, 0.04f, goalWidth), Quaternion.identity);
            Net(new Vector3(bx * 0.5f, h * 0.5f, -hw), new Vector3(depth, h, 0.04f), Quaternion.identity);
            Net(new Vector3(bx * 0.5f, h * 0.5f, hw), new Vector3(depth, h, 0.04f), Quaternion.identity);
            // goal trigger just behind the line
            var trig = new GameObject("GoalTrigger");
            trig.transform.SetParent(root, false);
            trig.transform.localPosition = new Vector3(side * (0.15f + depth * 0.5f), h * 0.5f, 0f);
            var bc = trig.AddComponent<BoxCollider>();
            bc.isTrigger = true;
            bc.size = new Vector3(depth - 0.1f, h - 0.05f, goalWidth - 0.1f);
            var gt = trig.AddComponent<GoalTrigger>();
            gt.match = this;
            gt.scoringTeam = side > 0 ? 0 : 1;
        }

        void BuildBoardsAndStands()
        {
            var root = new GameObject("Stadium").transform;
            float hx = length * 0.5f + 3f, hz = width * 0.5f + 2.5f, bh = 0.9f;
            // advertising boards: the ball bounces off them (arcade style, no throw-ins)
            void Board(Vector3 c, Vector3 s)
            {
                var b = Prim(PrimitiveType.Cube, "Board", root, c, s, boardMat, true);
                Compat.SetBounce(b.GetComponent<Collider>(), 0.55f, 0.3f);
            }
            Board(new Vector3(0f, bh * 0.5f, -hz), new Vector3(hx * 2f, bh, 0.2f));
            Board(new Vector3(0f, bh * 0.5f, hz), new Vector3(hx * 2f, bh, 0.2f));
            Board(new Vector3(-hx, bh * 0.5f, 0f), new Vector3(0.2f, bh, hz * 2f));
            Board(new Vector3(hx, bh * 0.5f, 0f), new Vector3(0.2f, bh, hz * 2f));
            // invisible walls above the boards so the ball never leaves the stadium
            void Wall(Vector3 c, Vector3 s)
            {
                var w = new GameObject("Wall");
                w.transform.SetParent(root, false);
                w.transform.localPosition = c;
                var bc = w.AddComponent<BoxCollider>();
                bc.size = s;
                Compat.SetBounce(bc, 0.5f, 0.3f);
            }
            Wall(new Vector3(0f, 8f, -hz - 0.3f), new Vector3(hx * 2f + 2f, 16f, 0.4f));
            Wall(new Vector3(0f, 8f, hz + 0.3f), new Vector3(hx * 2f + 2f, 16f, 0.4f));
            Wall(new Vector3(-hx - 0.3f, 8f, 0f), new Vector3(0.4f, 16f, hz * 2f + 2f));
            Wall(new Vector3(hx + 0.3f, 8f, 0f), new Vector3(0.4f, 16f, hz * 2f + 2f));
            Wall(new Vector3(0f, 16f, 0f), new Vector3(hx * 2f + 2f, 0.4f, hz * 2f + 2f));
            // stepped stands on the far side and behind both goals
            for (int i = 0; i < 9; i++)
            {
                float y = 0.6f + i * 0.75f, d = 2.5f + i * 1.1f;
                Prim(PrimitiveType.Cube, "StandFar", root, new Vector3(0f, y * 0.5f, hz + d), new Vector3(hx * 2f + 16f, y, 1.1f), standMat);
                Prim(PrimitiveType.Cube, "StandW", root, new Vector3(-hx - d, y * 0.5f, 0f), new Vector3(1.1f, y, hz * 2f), standMat);
                Prim(PrimitiveType.Cube, "StandE", root, new Vector3(hx + d, y * 0.5f, 0f), new Vector3(1.1f, y, hz * 2f), standMat);
            }
        }

        void SpawnBall()
        {
            var g = Prim(PrimitiveType.Sphere, "Ball", null, new Vector3(0f, Ball.Radius, 0f), Vector3.one * Ball.Radius * 2f, ballMat, true);
            Compat.SetBounce(g.GetComponent<Collider>(), 0.62f, 0.5f);
            g.AddComponent<Rigidbody>();
            Ball = g.AddComponent<Ball>();
        }

        GameObject Body(int modelIndex, Transform parent, Color ringColor)
        {
            if (characterModels != null && characterModels.Length > 0)
            {
                var src = characterModels[Mathf.Abs(modelIndex) % characterModels.Length];
                if (src != null)
                {
                    var m = Instantiate(src, parent);
                    m.transform.localPosition = Vector3.zero;
                    m.transform.localRotation = Quaternion.identity;
                    // same height for every character
                    var rs = m.GetComponentsInChildren<Renderer>();
                    if (rs.Length > 0)
                    {
                        Bounds b = rs[0].bounds;
                        foreach (var r in rs) b.Encapsulate(r.bounds);
                        if (b.size.y > 0.1f) m.transform.localScale *= characterHeight / b.size.y;
                    }
                    var anim = m.GetComponent<Animator>();
                    if (anim == null) anim = m.AddComponent<Animator>();
                    anim.runtimeAnimatorController = controller;
                    anim.applyRootMotion = false;
                    anim.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                    foreach (var r in rs) r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
                    AddRing(parent, ringColor);
                    return m;
                }
            }
            // no characters yet: a capsule stand-in
            var cap = Prim(PrimitiveType.Capsule, "Body", parent, new Vector3(0f, 0.9f, 0f), new Vector3(0.55f, 0.9f, 0.55f), null);
            cap.GetComponent<Renderer>().material.color = ringColor;
            AddRing(parent, ringColor);
            return cap;
        }

        void AddRing(Transform parent, Color c)
        {
            var q = Prim(PrimitiveType.Quad, "TeamRing", parent, new Vector3(0f, 0.02f, 0f), Vector3.one * 1.1f, ringMat);
            q.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            var r = q.GetComponent<Renderer>();
            var mpb = new MaterialPropertyBlock();
            mpb.SetColor("_BaseColor", c);
            mpb.SetColor("_Color", c);
            r.SetPropertyBlock(mpb);
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        }

        void SpawnPlayers()
        {
            int mine = PlayerPrefs.GetInt("ArenaMix.Char", 0);
            int n = characterModels != null ? Mathf.Max(1, characterModels.Length) : 1;
            for (int t = 0; t < 2; t++)
            {
                Color col = t == 0 ? homeColor : awayColor;
                // field player
                var fp = new GameObject(t == 0 ? "Tú" : "Rival");
                var body = Body(t == 0 ? mine : mine + 1, fp.transform, col);
                var f = fp.AddComponent<Footballer>();
                f.Init(this, t, t == 0, body.GetComponent<Animator>());
                if (t == 1) fp.AddComponent<RivalBrain>().Init(this, f);
                field[t] = f;
                // goalkeeper
                var gk = new GameObject(t == 0 ? "Portero" : "Portero rival");
                var kb = Body(mine + 2 + t, gk.transform, Color.Lerp(col, Color.yellow, 0.6f));
                var k = gk.AddComponent<Keeper>();
                k.Init(this, t, GoalCenter(t).x, kb.GetComponent<Animator>());
                keepers[t] = k;
            }
            var cam = Camera.main;
            if (cam != null)
            {
                var bc = cam.GetComponent<BroadcastCamera>();
                if (bc == null) bc = cam.gameObject.AddComponent<BroadcastCamera>();
                bc.match = this;
            }
        }

        // ---------------- flow ----------------
        void Kickoff(int team)
        {
            state = State.Kickoff;
            stateTime = 0f;
            Time.timeScale = 1f;
            Ball.ResetAt(new Vector3(0f, Ball.Radius, 0f));
            for (int t = 0; t < 2; t++)
            {
                float s = t == 0 ? -1f : 1f;
                var f = field[t];
                f.ResetState();
                f.transform.position = new Vector3(s * (t == team ? 0.7f : 7f), 0f, 0f);
                f.transform.rotation = Quaternion.LookRotation(new Vector3(-s, 0f, 0f));
                keepers[t].ResetState();
            }
            Flash("¡A JUGAR!", 1.2f);
        }

        public void OnGoal(int scoringTeam)
        {
            if (state != State.Play) return;
            score[scoringTeam]++;
            lastScorer = scoringTeam;
            state = State.Goal;
            stateTime = 0f;
            Flash(scoringTeam == 0 ? "¡GOOOL!" : "GOL DEL RIVAL", 2.2f);
            Time.timeScale = 0.35f;
        }

        void Update()
        {
            float dt = Time.unscaledDeltaTime;
            stateTime += dt;
            flashTime -= dt;

            // your player follows the touch / keyboard controls
            if (input != null && field[0] != null)
            {
                field[0].Intent = Playing ? input.Current : new Intent();
                input.HasBall = field[0].HasBall;
                input.Charge = field[0].Charge;
            }

            switch (state)
            {
                case State.Kickoff:
                    if (stateTime > 1.2f) state = State.Play;
                    break;
                case State.Play:
                    clock -= Time.deltaTime;
                    if (clock <= 0f) { clock = 0f; state = State.End; stateTime = 0f; Time.timeScale = 1f; }
                    break;
                case State.Goal:
                    if (stateTime > 1.1f) Time.timeScale = 1f;
                    if (stateTime > 2.6f) Kickoff(1 - lastScorer);
                    break;
            }
            Separate();
        }

        // players don't walk through each other
        void Separate()
        {
            var all = new List<Transform>();
            foreach (var f in field) if (f != null) all.Add(f.transform);
            foreach (var k in keepers) if (k != null) all.Add(k.transform);
            for (int i = 0; i < all.Count; i++)
                for (int j = i + 1; j < all.Count; j++)
                {
                    Vector3 d = (all[j].position - all[i].position).Flat();
                    float m = d.magnitude;
                    if (m < 0.7f && m > 0.0001f)
                    {
                        Vector3 push = d / m * (0.7f - m) * 0.5f;
                        all[i].position -= push;
                        all[j].position += push;
                    }
                }
        }

        void Restart()
        {
            score[0] = score[1] = 0;
            clock = matchSeconds;
            Kickoff(0);
        }

        // ---------------- HUD ----------------
        void OnGUI()
        {
            float s = Mathf.Min(Screen.width, Screen.height) / 400f;
            var box = new GUIStyle(GUI.skin.box) { fontSize = Mathf.RoundToInt(18 * s), fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
            box.normal.textColor = Color.white;
            int m = Mathf.CeilToInt(clock) / 60, sec = Mathf.CeilToInt(clock) % 60;
            string txt = $"TÚ  {score[0]} - {score[1]}  CPU     {m}:{sec:00}";
            GUI.Box(new Rect(Screen.width * 0.5f - 130 * s, 8 * s, 260 * s, 34 * s), txt, box);

            if (flashTime > 0f && !string.IsNullOrEmpty(flash))
            {
                var big = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(44 * s), fontStyle = FontStyle.BoldAndItalic, alignment = TextAnchor.MiddleCenter };
                big.normal.textColor = new Color(1f, 0.85f, 0.25f, Mathf.Clamp01(flashTime * 2f));
                GUI.Label(new Rect(0, Screen.height * 0.25f, Screen.width, 80 * s), flash, big);
            }

            if (state == State.End)
            {
                var big = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(40 * s), fontStyle = FontStyle.BoldAndItalic, alignment = TextAnchor.MiddleCenter };
                big.normal.textColor = Color.white;
                string res = score[0] > score[1] ? "¡VICTORIA!" : score[0] < score[1] ? "DERROTA" : "EMPATE";
                GUI.Label(new Rect(0, Screen.height * 0.28f, Screen.width, 60 * s), res + $"   {score[0]} - {score[1]}", big);
                var btn = new GUIStyle(GUI.skin.button) { fontSize = Mathf.RoundToInt(20 * s), fontStyle = FontStyle.Bold };
                if (GUI.Button(new Rect(Screen.width * 0.5f - 110 * s, Screen.height * 0.5f, 220 * s, 50 * s), "JUGAR OTRA VEZ", btn)) Restart();
            }
        }
    }
}
