using System.Collections.Generic;
using UnityEngine;

namespace ArenaMix
{
    /// <summary>
    /// A match of 1 vs 1 up to 4 vs 4 plus goalkeepers: builds a pitch sized for the mode, goals, boards
    /// and the stadium, spawns the players with their Mixamo characters, runs kick-offs, goals, the clock,
    /// the mode menu and the scoreboard (IMGUI HUD). Team 0 is you and attacks towards +x; team 1 is the CPU.
    /// You control one player of your team and switch automatically to the one nearest the play.
    /// </summary>
    [DefaultExecutionOrder(-40)]
    public class MatchManager : MonoBehaviour
    {
        [Header("Mode")]
        [Range(1, 4)] public int teamSize = 1;   // players per team besides the goalkeeper (saved in PlayerPrefs)
        public float matchSeconds = 180f;

        [Header("Pitch (metres, set from the mode)")]
        public float length = 40f;
        public float width = 26f;
        public float goalWidth = 5.5f;
        public float goalHeight = 2.2f;

        [Header("Characters (Mixamo FBX, imported as Humanoid)")]
        public GameObject[] characterModels;
        public RuntimeAnimatorController controller;
        public float characterHeight = 1.85f;

        [Header("Goal model (optional, Environment/porteria)")]
        public GameObject goalModel;

        [Header("Materials (created by ArenaMix > Preparar proyecto)")]
        public Material pitchLight, pitchDark, lineMat, postMat, netMat, boardMat, standMat, ballMat, ringMat;
        public Material seatMat, roofMat, glowMat, skinMat, apronMat;
        public Material glassMat, accentMat, tunnelMat, roofUnderMat, ribMat;

        [Header("Stadium")]
        [Tooltip("On: the real stadium photo (HDRI sky) behind the 3D pitch, like a TV picture. Off: the 3D stands with crowd.")]
        public bool photoStadium = false;

        [Header("Look")]
        public Color homeColor = new Color(1f, 0.54f, 0.24f);
        public Color awayColor = new Color(0.24f, 0.65f, 1f);

        public Ball Ball { get; private set; }
        public bool Playing => state == State.Play;
        public float HalfWidth => width * 0.5f;

        enum State { Menu, Kickoff, Play, Goal, End }
        State state = State.Menu;
        float stateTime, clock;
        int[] score = new int[2];
        readonly List<Footballer>[] teams = { new List<Footballer>(), new List<Footballer>() };
        readonly Keeper[] keepers = new Keeper[2];
        Footballer controlled;
        float switchLock;
        Transform selector;
        static bool menuShown;
        GameInput input;
        StadiumBuilder stadium;
        string flash; float flashTime;
        int lastScorer;

        // ---------------- public helpers ----------------
        /// <summary>Centre of the goal that team t defends (team 0 defends -x).</summary>
        public Vector3 GoalCenter(int t) => new Vector3(t == 0 ? -length * 0.5f : length * 0.5f, 0f, 0f);
        public IReadOnlyList<Footballer> Players(int team) => teams[team];
        public Footballer Controlled => controlled;
        public int Slot(Footballer f) => teams[f.Team].IndexOf(f);

        /// <summary>Pitch, goal and penalty area sizes for each mode: small for 1 vs 1, bigger with more players.</summary>
        public static void Dims(int n, out float L, out float W, out float gw, out float gh)
        {
            switch (Mathf.Clamp(n, 1, 4))
            {
                case 1: L = 40f; W = 26f; gw = 5.5f; gh = 2.2f; break;
                case 2: L = 52f; W = 34f; gw = 6.4f; gh = 2.3f; break;
                case 3: L = 64f; W = 42f; gw = 7.32f; gh = 2.44f; break;
                default: L = 76f; W = 50f; gw = 7.32f; gh = 2.44f; break;
            }
        }

        public Footballer NearestPlayer(int team, Vector3 p, Footballer except = null)
        {
            Footballer best = null; float bd = float.MaxValue;
            foreach (var f in teams[team])
            {
                if (f == except) continue;
                float d = (f.transform.position - p).Flat().sqrMagnitude;
                if (d < bd) { bd = d; best = f; }
            }
            return best;
        }

        /// <summary>Distance from p to the nearest opponent of team.</summary>
        public float Pressure(int team, Vector3 p)
        {
            float bd = 99f;
            foreach (var f in teams[1 - team]) bd = Mathf.Min(bd, (f.transform.position - p).Flat().magnitude);
            return bd;
        }

        /// <summary>The teammate a pass in direction aim should go to (null when alone).</summary>
        public Footballer PassTarget(Footballer from, Vector3 aim)
        {
            Footballer best = null; float bs = float.MinValue;
            foreach (var f in teams[from.Team])
            {
                if (f == from) continue;
                Vector3 to = (f.transform.position - from.transform.position).Flat();
                float d = to.magnitude;
                float sc = Vector3.Dot(aim, to / Mathf.Max(0.1f, d)) * 3f - d / 25f + Mathf.Min(Pressure(from.Team, f.transform.position), 6f) * 0.12f;
                if (sc > bs) { bs = sc; best = f; }
            }
            return best;
        }

        /// <summary>The best-placed teammate to receive from a goalkeeper: free of markers, not too far.</summary>
        public Footballer OpenTeammate(int team, Vector3 from)
        {
            Footballer best = null; float bs = float.MinValue;
            foreach (var f in teams[team])
            {
                float sc = Mathf.Min(Pressure(team, f.transform.position), 8f) - (f.transform.position - from).Flat().magnitude / 12f;
                if (sc > bs) { bs = sc; best = f; }
            }
            return best;
        }

        /// <summary>True when an opponent stands in the way of a ground pass from a to b.</summary>
        public bool LaneBlocked(Footballer from, Vector3 a, Vector3 b)
        {
            Vector3 ab = (b - a).Flat();
            float len = ab.magnitude;
            if (len < 0.5f) return false;
            Vector3 dir = ab / len;
            foreach (var o in teams[1 - from.Team])
            {
                Vector3 ao = (o.transform.position - a).Flat();
                float t = Vector3.Dot(ao, dir);
                if (t < 1f || t > len - 0.5f) continue;
                if ((ao - dir * t).magnitude < 1.3f) return true;
            }
            return false;
        }

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
            teamSize = Mathf.Clamp(PlayerPrefs.GetInt("ArenaMix.TeamSize", teamSize), 1, 4);
            Dims(teamSize, out length, out width, out goalWidth, out goalHeight);
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
            // the mode menu shows when the game starts; after choosing, the scene reloads straight into the match
            if (!menuShown) { state = State.Menu; Time.timeScale = 1f; }
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
            seatMat = M(seatMat, lit, new Color(0.13f, 0.2f, 0.42f));
            roofMat = M(roofMat, lit, new Color(0.78f, 0.8f, 0.84f));
            glowMat = M(glowMat, unlit, new Color(1f, 0.98f, 0.92f));
            skinMat = M(skinMat, lit, new Color(0.78f, 0.58f, 0.44f));
            apronMat = M(apronMat, lit, new Color(0.06f, 0.3f, 0.08f));
            standMat = M(standMat, lit, new Color(0.55f, 0.56f, 0.58f));
            glassMat = M(glassMat, lit, new Color(0.16f, 0.22f, 0.28f));
            accentMat = M(accentMat, unlit, new Color(0.1f, 0.42f, 0.9f));
            tunnelMat = M(tunnelMat, lit, new Color(0.04f, 0.04f, 0.05f));
            roofUnderMat = M(roofUnderMat, lit, new Color(0.2f, 0.21f, 0.23f));
            ribMat = M(ribMat, lit, new Color(0.92f, 0.93f, 0.95f));
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
            float L = length, W = width, margin = 8f;
            // mowing stripes across the pitch, plus a margin around it
            int stripes = Mathf.Max(10, Mathf.RoundToInt((length + 16f) / 5.5f));
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
            gc.size = new Vector3(L + 80f, 1f, W + 80f);
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
            // arcs as short straight pieces
            void Arc(Vector3 c, float r, float from, float to, int seg)
            {
                for (int i = 0; i < seg; i++)
                {
                    float a0 = Mathf.Lerp(from, to, i / (float)seg), a1 = Mathf.Lerp(from, to, (i + 1) / (float)seg);
                    Line(c + new Vector3(Mathf.Cos(a0), 0, Mathf.Sin(a0)) * r, c + new Vector3(Mathf.Cos(a1), 0, Mathf.Sin(a1)) * r);
                }
            }
            void Spot(Vector3 c) => Arc(c, 0.11f, 0f, Mathf.PI * 2f, 6);
            // markings scaled to the pitch (regulation sizes on a full pitch)
            float areaD = Mathf.Min(16.5f, L * 0.157f), areaW = Mathf.Min(40.32f, W * 0.59f);
            float boxD = Mathf.Min(5.5f, L * 0.052f), boxW = Mathf.Min(18.32f, W * 0.27f);
            float spotD = areaD * 0.667f, circle = Mathf.Min(9.15f, W * 0.135f);
            foreach (float s in new[] { -1f, 1f })
            {
                float gx = hx * s, bx = gx - s * areaD, sx = gx - s * boxD, pb = areaW * 0.5f, ps = boxW * 0.5f;
                Line(new Vector3(gx, 0, -pb), new Vector3(bx, 0, -pb));
                Line(new Vector3(gx, 0, pb), new Vector3(bx, 0, pb));
                Line(new Vector3(bx, 0, -pb), new Vector3(bx, 0, pb));
                Line(new Vector3(gx, 0, -ps), new Vector3(sx, 0, -ps));
                Line(new Vector3(gx, 0, ps), new Vector3(sx, 0, ps));
                Line(new Vector3(sx, 0, -ps), new Vector3(sx, 0, ps));
                var spot = new Vector3(gx - s * spotD, 0, 0);
                Spot(spot);
                float half = Mathf.Acos(Mathf.Clamp01((areaD - spotD) / circle));   // the part of the circle outside the area
                float mid = s > 0 ? Mathf.PI : 0f;
                Arc(spot, circle, mid - half, mid + half, 16);
                // corner arcs
                Arc(new Vector3(gx, 0, -hz), 1f, s > 0 ? Mathf.PI * 0.5f : 0f, s > 0 ? Mathf.PI : Mathf.PI * 0.5f, 5);
                Arc(new Vector3(gx, 0, hz), 1f, s > 0 ? Mathf.PI : Mathf.PI * 1.5f, s > 0 ? Mathf.PI * 1.5f : Mathf.PI * 2f, 5);
            }
            // centre circle and spot
            Arc(Vector3.zero, circle, 0f, Mathf.PI * 2f, 64);
            Spot(Vector3.zero);
        }

        void BuildGoal(int side)
        {
            var root = new GameObject(side < 0 ? "GoalWest" : "GoalEast").transform;
            float gx = length * 0.5f * side, hw = goalWidth * 0.5f, h = goalHeight, depth = 1.8f, r = 0.06f;
            root.position = new Vector3(gx, 0f, 0f);
            // the 3D goal model, fitted to this mode's goal size; the simple posts below stay as invisible colliders
            bool model = goalModel != null && FitGoalModel(root, side, ref depth);
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
            if (model)
                foreach (Transform c in root)
                    if (c.name == "Post" || c.name == "Crossbar" || c.name == "Net") c.GetComponent<Renderer>().enabled = false;
        }

        /// <summary>
        /// Places the goal model on the goal line: turned so the frame faces the pitch, scaled so the opening is
        /// goalWidth x goalHeight. Returns false if the model has nothing to show.
        /// </summary>
        bool FitGoalModel(Transform root, int side, ref float depth)
        {
            var holder = new GameObject("GoalModel").transform;
            holder.SetParent(root, false);
            var g = Instantiate(goalModel, holder);
            g.transform.localPosition = Vector3.zero;
            Bounds B(System.Func<Renderer, bool> pick)
            {
                Bounds b = new Bounds(); bool any = false;
                foreach (var r in g.GetComponentsInChildren<Renderer>())
                {
                    if (!pick(r)) continue;
                    if (!any) { b = r.bounds; any = true; } else b.Encapsulate(r.bounds);
                }
                return b;
            }
            bool IsFrame(Renderer r) => r.name.ToLowerInvariant().Contains("bar");
            var all = B(_ => true);
            if (all.size.sqrMagnitude < 1e-6f) { Destroy(holder.gameObject); return false; }
            // width along z
            if (all.size.x > all.size.z) { g.transform.localRotation = Quaternion.Euler(0f, 90f, 0f) * g.transform.localRotation; all = B(_ => true); }
            // the frame (posts and crossbar) at the front, facing the centre of the pitch
            var frame = B(IsFrame);
            if (frame.size.sqrMagnitude < 1e-6f) frame = all;
            float front = Mathf.Sign(frame.center.x - all.center.x);
            if (front != 0f && front != -side) { g.transform.localRotation = Quaternion.Euler(0f, 180f, 0f) * g.transform.localRotation; all = B(_ => true); frame = B(IsFrame); if (frame.size.sqrMagnitude < 1e-6f) frame = all; }
            // scale: opening = goal size, depth in proportion
            float sh = goalHeight / Mathf.Max(0.01f, frame.size.y), sw = goalWidth / Mathf.Max(0.01f, frame.size.z);
            holder.localScale = new Vector3(sh, sh, sw);
            all = B(_ => true); frame = B(IsFrame); if (frame.size.sqrMagnitude < 1e-6f) frame = all;
            // frame front on the goal line, standing on the grass, centred
            Vector3 off = new Vector3(root.position.x - (side > 0 ? frame.min.x : frame.max.x), -all.min.y, root.position.z - frame.center.z);
            holder.position += off;
            depth = Mathf.Clamp(all.size.x, 1.2f, 3f);
            foreach (var r in g.GetComponentsInChildren<Renderer>()) r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            foreach (var c in g.GetComponentsInChildren<Collider>()) Destroy(c);
            return true;
        }

        void BuildBoardsAndStands()
        {
            var root = new GameObject("Stadium").transform;
            float hx = length * 0.5f + 4f, hz = width * 0.5f + 3f, bh = 0.9f;
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
            // the stadium bowl: stands, corners, roof and crowd
            // grass all the way to the horizon, where it melts into the stadium photo
            float apronSize = photoStadium ? 2400f : 30f;
            var apron = Prim(PrimitiveType.Quad, "Apron", root, new Vector3(0f, -0.02f, 0f), new Vector3(length + apronSize, width + apronSize, 1f), apronMat);
            apron.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            if (photoStadium)
            {
                var ar = apron.GetComponent<Renderer>();
                ar.material.SetTextureScale("_BaseMap", new Vector2((length + apronSize) / 3f, (width + apronSize) / 3f));
                ar.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                return;
            }
            stadium = new StadiumBuilder
            {
                concrete = standMat, seat = seatMat, glass = glassMat, accent = accentMat, dark = tunnelMat,
                roof = roofMat, roofUnder = roofUnderMat, ribs = ribMat, glow = glowMat, skin = skinMat,
                homeColors = new[] { homeColor, Color.Lerp(homeColor, Color.white, 0.25f), Color.Lerp(homeColor, Color.black, 0.3f) },
                awayColors = new[] { awayColor, Color.Lerp(awayColor, Color.white, 0.25f), Color.Lerp(awayColor, Color.black, 0.3f) }
            };
            stadium.Build(root, length * 0.5f + StandGap, width * 0.5f + StandGap);
        }

        /// <summary>Distance from the touchlines to the front of the stands.</summary>
        const float StandGap = 6f;

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
            for (int t = 0; t < 2; t++)
            {
                Color col = t == 0 ? homeColor : awayColor;
                for (int i = 0; i < teamSize; i++)
                {
                    var fp = new GameObject(t == 0 ? (i == 0 ? "Tú" : "Compañero " + i) : "Rival " + (i + 1));
                    var body = Body(mine + t + i * 2, fp.transform, col);
                    var f = fp.AddComponent<Footballer>();
                    f.Init(this, t, false, body.GetComponent<Animator>());
                    fp.AddComponent<TeamBrain>().Init(this, f);
                    teams[t].Add(f);
                }
                var gk = new GameObject(t == 0 ? "Portero" : "Portero rival");
                var kb = Body(mine + 5 + t, gk.transform, Color.Lerp(col, Color.yellow, 0.6f));
                var k = gk.AddComponent<Keeper>();
                k.Init(this, t, GoalCenter(t).x, kb.GetComponent<Animator>());
                keepers[t] = k;
            }
            // marker under the player you control
            var sel = Prim(PrimitiveType.Quad, "Selector", null, new Vector3(0f, 0.03f, 0f), Vector3.one * 1.7f, ringMat);
            sel.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            var sr = sel.GetComponent<Renderer>();
            var mpb = new MaterialPropertyBlock();
            mpb.SetColor("_BaseColor", new Color(1f, 0.9f, 0.2f));
            mpb.SetColor("_Color", new Color(1f, 0.9f, 0.2f));
            sr.SetPropertyBlock(mpb);
            sr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            selector = sel.transform;
            SetControlled(teams[0][0]);
            if (input != null) input.ShowPass = teamSize > 1;

            var cam = Camera.main;
            if (cam != null)
            {
                var bc = cam.GetComponent<BroadcastCamera>();
                if (bc == null) bc = cam.gameObject.AddComponent<BroadcastCamera>();
                bc.match = this;
                if (photoStadium) { bc.height = 6.5f; bc.distance = 13f; bc.fov = 38f; bc.lookHeight = 1.6f; }
                else
                {
                    // TV gantry in the lower tier of the main stand, a few rows up, so nothing blocks the view
                    float gantry = 4f + width * 0.2f;
                    bc.distance = StandGap + gantry;
                    bc.height = StadiumBuilder.StandHeightAt(gantry) + 4f;
                    bc.fov = 30f; bc.lookHeight = 0.6f;
                }
            }
        }

        void SetControlled(Footballer f)
        {
            if (f == controlled || f == null) return;
            if (controlled != null) { controlled.SetHuman(false); controlled.Intent = new Intent(); }
            controlled = f;
            f.SetHuman(true);
            switchLock = 0.35f;
        }

        /// <summary>Switch to the teammate who has the ball, or the one nearest to it when defending.</summary>
        void AutoSwitch(float dt)
        {
            switchLock -= dt;
            var team = teams[0];
            if (team.Count < 2 || controlled == null) return;
            var owner = Ball.Owner;
            if (owner != null && owner.Team == 0) { if (owner != controlled) SetControlled(owner); return; }
            if (switchLock > 0f || Ball.LastTouch == controlled && Ball.Body.GetVelocity().magnitude > 4f && owner == null) return;
            Vector3 bp = Ball.transform.position + Ball.Body.GetVelocity().Flat() * 0.3f;
            var near = NearestPlayer(0, bp);
            if (near != controlled && (near.transform.position - bp).Flat().magnitude + 2f < (controlled.transform.position - bp).Flat().magnitude)
                SetControlled(near);
        }

        // ---------------- flow ----------------
        void Kickoff(int team)
        {
            state = State.Kickoff;
            stateTime = 0f;
            Time.timeScale = 1f;
            Ball.ResetAt(new Vector3(0f, Ball.Radius, 0f));
            float circle = Mathf.Min(9.15f, width * 0.135f);
            for (int t = 0; t < 2; t++)
            {
                float s = t == 0 ? -1f : 1f;
                for (int i = 0; i < teams[t].Count; i++)
                {
                    var f = teams[t][i];
                    f.ResetState();
                    Vector2 fp = Formation(teamSize, i);
                    float x = fp.x * length * 0.5f;
                    if (i == 0) x = t == team ? 0.7f : Mathf.Max(x, circle + 0.8f);
                    else if (t != team) x = Mathf.Max(x, circle + 0.8f);
                    f.transform.position = new Vector3(s * x, 0f, fp.y * width * 0.5f);
                    f.transform.rotation = Quaternion.LookRotation(new Vector3(-s, 0f, 0f));
                }
                keepers[t].ResetState();
            }
            if (teams[0].Count > 0) { controlled = null; foreach (var f in teams[0]) f.SetHuman(false); SetControlled(teams[0][0]); }
            Flash("¡A JUGAR!", 1.2f);
        }

        /// <summary>Kick-off spot of player i (x: fraction of the half length back from the centre, y: fraction of the half width).</summary>
        public static Vector2 Formation(int n, int i)
        {
            switch (n)
            {
                case 2: return i == 0 ? new Vector2(0f, 0f) : new Vector2(0.45f, 0.35f);
                case 3: return i == 0 ? new Vector2(0f, 0f) : new Vector2(0.4f, i == 1 ? -0.45f : 0.45f);
                case 4: return i == 0 ? new Vector2(0f, 0f) : i == 3 ? new Vector2(0.62f, 0f) : new Vector2(0.32f, i == 1 ? -0.5f : 0.5f);
                default: return Vector2.zero;
            }
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
            if (Playing) AutoSwitch(Time.deltaTime);
            if (selector != null && controlled != null) selector.position = controlled.transform.position + Vector3.up * 0.03f;
            if (input != null && controlled != null)
            {
                controlled.Intent = Playing ? input.Current : new Intent();
                input.HasBall = controlled.HasBall;
                input.Charge = controlled.Charge;
            }

            switch (state)
            {
                case State.Menu:
                    break;
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
            foreach (var team in teams) foreach (var f in team) if (f != null) all.Add(f.transform);
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
            // the mode menu shows when the game starts; after choosing, the scene reloads straight into the match
            if (!menuShown) { state = State.Menu; Time.timeScale = 1f; }
        }

        // ---------------- HUD ----------------
        void OnGUI()
        {
            float s = Mathf.Min(Screen.width, Screen.height) / 400f;
            if (state == State.Menu) { ModeMenu(s, "ARENA MIX  ·  FÚTBOL"); return; }
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
                if (GUI.Button(new Rect(Screen.width * 0.5f - 230 * s, Screen.height * 0.5f, 220 * s, 50 * s), "JUGAR OTRA VEZ", btn)) Restart();
                if (GUI.Button(new Rect(Screen.width * 0.5f + 10 * s, Screen.height * 0.5f, 220 * s, 50 * s), "CAMBIAR MODO", btn)) { state = State.Menu; menuShown = false; }
            }
        }

        /// <summary>Choose 1 vs 1 up to 4 vs 4; a different mode rebuilds the stadium for its pitch size.</summary>
        void ModeMenu(float s, string title)
        {
            GUI.color = new Color(0f, 0f, 0f, 0.55f);
            GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.whiteTexture);
            GUI.color = Color.white;
            var big = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(34 * s), fontStyle = FontStyle.BoldAndItalic, alignment = TextAnchor.MiddleCenter };
            big.normal.textColor = Color.white;
            GUI.Label(new Rect(0, Screen.height * 0.16f, Screen.width, 50 * s), title, big);
            var small = new GUIStyle(big) { fontSize = Mathf.RoundToInt(15 * s), fontStyle = FontStyle.Normal };
            GUI.Label(new Rect(0, Screen.height * 0.16f + 48 * s, Screen.width, 26 * s), "Elige el modo", small);
            var btn = new GUIStyle(GUI.skin.button) { fontSize = Mathf.RoundToInt(22 * s), fontStyle = FontStyle.Bold };
            var sub = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(11 * s), alignment = TextAnchor.UpperCenter };
            sub.normal.textColor = new Color(1f, 1f, 1f, 0.75f);
            float w = 120 * s, h = 70 * s, gap = 14 * s, x0 = Screen.width * 0.5f - (w * 4 + gap * 3) * 0.5f, y = Screen.height * 0.45f;
            for (int n = 1; n <= 4; n++)
            {
                Dims(n, out float L, out float W, out _, out _);
                var r = new Rect(x0 + (n - 1) * (w + gap), y, w, h);
                if (n == teamSize) { GUI.color = new Color(1f, 0.85f, 0.3f); GUI.DrawTexture(new Rect(r.x - 3 * s, r.y - 3 * s, r.width + 6 * s, r.height + 6 * s), Texture2D.whiteTexture); GUI.color = Color.white; }
                if (GUI.Button(r, $"{n} vs {n}", btn)) StartMode(n);
                GUI.Label(new Rect(r.x, r.yMax + 4 * s, w, 20 * s), $"campo {L:0} × {W:0} m", sub);
            }
        }

        void StartMode(int n)
        {
            menuShown = true;
            if (n != teamSize)
            {
                PlayerPrefs.SetInt("ArenaMix.TeamSize", n);
                PlayerPrefs.Save();
                Time.timeScale = 1f;
                UnityEngine.SceneManagement.SceneManager.LoadScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene().buildIndex);
                return;
            }
            Restart();
        }
    }
}
