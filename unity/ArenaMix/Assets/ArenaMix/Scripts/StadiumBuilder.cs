using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace ArenaMix
{
    /// <summary>
    /// Builds a big two-tier football stadium around the pitch, styled after the Orlando Stadium photo:
    /// grey concrete bowl with blue-grey seats, a band of glass hospitality boxes and a blue stripe between
    /// the tiers, dark tunnel mouths in the lower tier, curved corners and a dark roof with white ribs and a
    /// wavy front edge lined with floodlights. Fans fill most seats in both teams' colours.
    /// Everything is merged into a handful of meshes so it stays fast.
    /// </summary>
    public class StadiumBuilder
    {
        // profile: lower tier, concourse with the glass boxes, upper tier, back wall
        const int LowRows = 22, UpRows = 18;
        const float RowDepth = 0.8f, LowRise = 0.45f, UpRise = 0.66f, FrontWall = 1.2f;
        static float LowY(int r) => FrontWall + r * LowRise;
        static float BoxD => LowRows * RowDepth + 1.4f;     // front of the glass boxes
        static float UpBaseD => BoxD + 1.6f;
        static float UpBaseY => LowY(LowRows) + 3.4f;
        static float UpY(int r) => UpBaseY + r * UpRise;
        static float BackD => UpBaseD + UpRows * RowDepth;
        static float TopY => UpY(UpRows) + 1.2f;
        const float RoofFront = 7f;

        /// <summary>Height of the lower-tier seating at a depth (metres back from the front of a stand).</summary>
        public static float StandHeightAt(float depth) => LowY(Mathf.Clamp(Mathf.CeilToInt(depth / RowDepth), 0, LowRows));
        const float VomSpacing = 16f, VomWidth = 3f;          // tunnel mouths in the lower tier
        const int VomRow0 = 8, VomRows = 4;

        // materials: bowl concrete, seats, glass boxes, blue stripe, dark tunnels; roof top, underside, ribs, light strip; crowd skin
        public Material concrete, seat, glass, accent, dark, roof, roofUnder, ribs, glow, skin;
        public Color[] homeColors, awayColors;
        [Range(0f, 1f)] public float crowdDensity = 0.72f;
        public readonly List<Transform> crowdBlocks = new List<Transform>();

        float hx, hz;
        readonly System.Random rng = new System.Random(7);
        readonly List<List<(Vector3 pos, float yaw)>> pendingFans = new List<List<(Vector3, float)>>();

        public void Build(Transform root, float halfX, float halfZ)
        {
            hx = halfX; hz = halfZ;
            var bowl = new MeshBuilder(5);   // 0 concrete, 1 seats, 2 glass, 3 accent, 4 dark
            var roofMb = new MeshBuilder(4); // 0 top, 1 underside, 2 ribs, 3 light strip
            Side(bowl, roofMb, new Vector3(0, 0, hz), Quaternion.identity, hx * 2f);
            Side(bowl, roofMb, new Vector3(0, 0, -hz), Quaternion.Euler(0, 180, 0), hx * 2f);
            Side(bowl, roofMb, new Vector3(-hx, 0, 0), Quaternion.Euler(0, -90, 0), hz * 2f);
            Side(bowl, roofMb, new Vector3(hx, 0, 0), Quaternion.Euler(0, 90, 0), hz * 2f);
            Corner(bowl, roofMb, new Vector3(hx, 0, hz), 0f);
            Corner(bowl, roofMb, new Vector3(-hx, 0, hz), 270f);
            Corner(bowl, roofMb, new Vector3(-hx, 0, -hz), 180f);
            Corner(bowl, roofMb, new Vector3(hx, 0, -hz), 90f);
            bowl.Create("Stands", root, true, concrete, seat, glass, accent, dark);
            roofMb.Create("Roof", root, true, roof, roofUnder, ribs, glow);
            BuildCrowd(root);
        }

        // ---------- profile ----------
        static List<Vector2> Profile()
        {
            var p = new List<Vector2> { new Vector2(0, 0), new Vector2(0, FrontWall) };
            for (int r = 0; r < LowRows; r++) { p.Add(new Vector2(r * RowDepth, LowY(r))); p.Add(new Vector2((r + 1) * RowDepth, LowY(r))); p.Add(new Vector2((r + 1) * RowDepth, LowY(r + 1))); }
            p.Add(new Vector2(BoxD, LowY(LowRows)));
            p.Add(new Vector2(BoxD, UpBaseY));
            p.Add(new Vector2(UpBaseD, UpBaseY));
            for (int r = 0; r < UpRows; r++) { p.Add(new Vector2(UpBaseD + r * RowDepth, UpY(r))); p.Add(new Vector2(UpBaseD + (r + 1) * RowDepth, UpY(r))); p.Add(new Vector2(UpBaseD + (r + 1) * RowDepth, UpY(r + 1))); }
            p.Add(new Vector2(BackD, TopY));
            p.Add(new Vector2(BackD + 0.6f, TopY));
            p.Add(new Vector2(BackD + 0.6f, 0));
            return p;
        }

        static float Wave(float s) => Mathf.Sin(s * Mathf.PI * 2f / 38f) * 1.6f;   // wavy roof edge

        bool InTunnel(float along, int row) => row >= VomRow0 && row < VomRow0 + VomRows && Mathf.Abs(Mathf.Repeat(along + VomSpacing * 0.5f, VomSpacing) - VomSpacing * 0.5f) < VomWidth * 0.5f + 0.3f;

        // ---------- straight stands ----------
        void Side(MeshBuilder mb, MeshBuilder rmb, Vector3 front, Quaternion rot, float len)
        {
            var prof = Profile();
            var m = Matrix4x4.TRS(front, rot, Vector3.one);
            Vector3 P(float x, float d, float y) => m.MultiplyPoint3x4(new Vector3(x, y, d));
            float a = -len * 0.5f, b = len * 0.5f;
            for (int i = 0; i < prof.Count - 1; i++)
                mb.Quad(0, P(a, prof[i].x, prof[i].y), P(b, prof[i].x, prof[i].y), P(b, prof[i + 1].x, prof[i + 1].y), P(a, prof[i + 1].x, prof[i + 1].y), len / 4f);
            // seats (rows of backs)
            for (int r = 0; r < LowRows; r++) SeatStrip(mb, m, a, b, r * RowDepth + 0.45f, LowY(r));
            for (int r = 0; r < UpRows; r++) SeatStrip(mb, m, a, b, UpBaseD + r * RowDepth + 0.45f, UpY(r));
            // glass hospitality boxes with mullions, blue stripe above them
            float gy0 = LowY(LowRows) + 0.5f, gy1 = UpBaseY - 0.9f;
            mb.Quad(2, P(a, BoxD - 0.02f, gy0), P(b, BoxD - 0.02f, gy0), P(b, BoxD - 0.02f, gy1), P(a, BoxD - 0.02f, gy1), len / 4f);
            for (float x = a; x <= b; x += 4f) mb.Quad(0, P(x - 0.08f, BoxD - 0.04f, gy0), P(x + 0.08f, BoxD - 0.04f, gy0), P(x + 0.08f, BoxD - 0.04f, gy1), P(x - 0.08f, BoxD - 0.04f, gy1), 1f);
            mb.Quad(3, P(a, BoxD - 0.03f, gy1 + 0.15f), P(b, BoxD - 0.03f, gy1 + 0.15f), P(b, BoxD - 0.03f, gy1 + 0.55f), P(a, BoxD - 0.03f, gy1 + 0.55f), len / 4f);
            // tunnel mouths
            for (float c = Mathf.Ceil(a / VomSpacing) * VomSpacing; c < b; c += VomSpacing)
            {
                if (c - VomWidth < a || c + VomWidth > b) continue;
                float d0 = VomRow0 * RowDepth, d1 = (VomRow0 + VomRows) * RowDepth;
                float y0 = LowY(VomRow0) - 0.1f, y1 = LowY(VomRow0 + VomRows) + 0.2f;
                mb.Quad(4, P(c - VomWidth * 0.5f, d0 - 0.05f, y0), P(c + VomWidth * 0.5f, d0 - 0.05f, y0), P(c + VomWidth * 0.5f, d1, y1), P(c - VomWidth * 0.5f, d1, y1), 1f);
            }
            Roof(rmb, (s, d, y) => P(s, d, y), a, b, true);
            // fans
            var fans = new List<(Vector3 pos, float yaw)>();
            float yaw = rot.eulerAngles.y + 180f;
            for (int r = 1; r < LowRows; r++) for (float x = a + 0.4f; x < b - 0.3f; x += 0.62f) if (!InTunnel(x, r)) fans.Add((P(x, r * RowDepth + 0.5f, LowY(r)), yaw));
            for (int r = 0; r < UpRows; r++) for (float x = a + 0.4f; x < b - 0.3f; x += 0.64f) fans.Add((P(x, UpBaseD + r * RowDepth + 0.5f, UpY(r)), yaw));
            pendingFans.Add(fans);
        }

        void SeatStrip(MeshBuilder mb, Matrix4x4 m, float a, float b, float d, float y)
        {
            Vector3 P(float x, float dd, float yy) => m.MultiplyPoint3x4(new Vector3(x, yy, dd));
            mb.Quad(1, P(a, d - 0.15f, y + 0.42f), P(b, d - 0.15f, y + 0.42f), P(b, d + 0.25f, y + 0.42f), P(a, d + 0.25f, y + 0.42f), (b - a) / 0.62f);
            mb.Quad(1, P(a, d + 0.25f, y + 0.42f), P(b, d + 0.25f, y + 0.42f), P(b, d + 0.32f, y + 0.85f), P(a, d + 0.32f, y + 0.85f), (b - a) / 0.62f);
        }

        /// <summary>Roof over a run of stand: P(along, depth, height). Segmented so the front edge can wave.</summary>
        void Roof(MeshBuilder rmb, System.Func<float, float, float, Vector3> P, float a, float b, bool ribsOn)
        {
            float y0 = TopY + 0.4f, y1 = TopY + 2.6f, back = BackD + 0.6f;
            int segs = Mathf.Max(1, Mathf.CeilToInt((b - a) / 3f));
            for (int i = 0; i < segs; i++)
            {
                float s0 = Mathf.Lerp(a, b, i / (float)segs), s1 = Mathf.Lerp(a, b, (i + 1) / (float)segs);
                float w0 = y1 + Wave(s0), w1 = y1 + Wave(s1);
                rmb.Quad(0, P(s0, back, y0), P(s1, back, y0), P(s1, RoofFront, w1), P(s0, RoofFront, w0), 1f);
                rmb.Quad(1, P(s0, RoofFront, w0 - 0.6f), P(s1, RoofFront, w1 - 0.6f), P(s1, back, y0 - 0.6f), P(s0, back, y0 - 0.6f), 1f);
                rmb.Quad(0, P(s0, RoofFront, w0), P(s1, RoofFront, w1), P(s1, RoofFront, w1 - 0.6f), P(s0, RoofFront, w0 - 0.6f), 1f);
                rmb.Quad(3, P(s0, RoofFront + 0.5f, w0 - 0.62f), P(s1, RoofFront + 0.5f, w1 - 0.62f), P(s1, RoofFront + 1.1f, w1 - 0.63f), P(s0, RoofFront + 1.1f, w0 - 0.63f), 1f);
            }
            if (!ribsOn) return;
            // white ribs under the roof, like the trusses in the photo
            for (float s = Mathf.Ceil(a / 7f) * 7f; s < b; s += 7f)
            {
                float w = y1 + Wave(s) - 0.62f;
                rmb.Quad(2, P(s - 0.18f, RoofFront + 0.2f, w - 0.02f), P(s + 0.18f, RoofFront + 0.2f, w - 0.02f), P(s + 0.18f, back, y0 - 0.62f), P(s - 0.18f, back, y0 - 0.62f), 1f);
            }
        }

        // ---------- corners ----------
        void Corner(MeshBuilder mb, MeshBuilder rmb, Vector3 c, float startDeg)
        {
            var prof = Profile();
            const int segs = 14;
            Vector3 P(float ang, float d, float y) { float t = (startDeg + ang) * Mathf.Deg2Rad; return c + new Vector3(Mathf.Sin(t) * d, y, Mathf.Cos(t) * d); }
            for (int s = 0; s < segs; s++)
            {
                float a0 = 90f * s / segs, a1 = 90f * (s + 1) / segs;
                for (int i = 0; i < prof.Count - 1; i++)
                    mb.Quad(0, P(a1, prof[i].x, prof[i].y), P(a0, prof[i].x, prof[i].y), P(a0, prof[i + 1].x, prof[i + 1].y), P(a1, prof[i + 1].x, prof[i + 1].y), 1f);
                float gy0 = LowY(LowRows) + 0.5f, gy1 = UpBaseY - 0.9f;
                mb.Quad(2, P(a1, BoxD - 0.02f, gy0), P(a0, BoxD - 0.02f, gy0), P(a0, BoxD - 0.02f, gy1), P(a1, BoxD - 0.02f, gy1), 1f);
                mb.Quad(3, P(a1, BoxD - 0.03f, gy1 + 0.15f), P(a0, BoxD - 0.03f, gy1 + 0.15f), P(a0, BoxD - 0.03f, gy1 + 0.55f), P(a1, BoxD - 0.03f, gy1 + 0.55f), 1f);
            }
            // roof: the "along" coordinate is the angle mapped to metres at the roof front, so the wave continues
            float arc = RoofFront * Mathf.PI * 0.5f;
            Roof(rmb, (s, d, y) => P(s / arc * 90f, d, y), 0f, arc, false);
            var fans = new List<(Vector3, float)>();
            void Row(float rad, float y, float spacing)
            {
                int n = Mathf.FloorToInt(rad * Mathf.PI * 0.5f / spacing);
                for (int i = 0; i < n; i++)
                {
                    float ang = 90f * (i + 0.5f) / n;
                    fans.Add((P(ang, rad, y), startDeg + ang + 180f));
                }
            }
            for (int r = 2; r < LowRows; r++) Row(r * RowDepth + 0.5f, LowY(r), 0.64f);
            for (int r = 0; r < UpRows; r++) Row(UpBaseD + r * RowDepth + 0.5f, UpY(r), 0.66f);
            pendingFans.Add(fans);
        }

        // ---------- crowd ----------
        void BuildCrowd(Transform root)
        {
            var palette = new List<Color>();
            palette.AddRange(homeColors);
            palette.AddRange(awayColors);
            palette.Add(new Color(0.12f, 0.13f, 0.18f));
            palette.Add(new Color(0.92f, 0.92f, 0.95f));
            int home = homeColors.Length, away = awayColors.Length, neutral = 2;
            var mats = new Material[palette.Count + 1];
            for (int i = 0; i < palette.Count; i++) { mats[i] = new Material(concrete.shader); mats[i].color = palette[i]; }
            mats[palette.Count] = skin;
            int block = 0;
            foreach (var list in pendingFans)
            {
                var mb = new MeshBuilder(mats.Length);
                foreach (var (pos, yaw) in list)
                {
                    if (rng.NextDouble() > crowdDensity) continue;
                    // your fans on the left half (x < 0), the rival's on the right, a few neutral shirts
                    bool homeSide = pos.x < 0f;
                    int c = rng.NextDouble() < 0.12 ? home + away + rng.Next(neutral) : (homeSide ? rng.Next(home) : home + rng.Next(away));
                    Fan(mb, pos, yaw, c, palette.Count, (float)rng.NextDouble());
                }
                var t = mb.Create("Crowd" + block++, root, true, mats);
                if (t != null) crowdBlocks.Add(t);
            }
        }

        void Fan(MeshBuilder mb, Vector3 p, float yaw, int shirt, int skinIdx, float rnd)
        {
            var q = Quaternion.Euler(0f, yaw + (rnd - 0.5f) * 20f, 0f);
            float s = 0.92f + rnd * 0.16f;
            mb.Box(shirt, p + Vector3.up * 0.62f * s, q, new Vector3(0.42f, 0.56f, 0.26f) * s);
            mb.Box(skinIdx, p + Vector3.up * 1.04f * s, q, new Vector3(0.2f, 0.24f, 0.21f) * s);
            if (rnd > 0.82f)
            {
                mb.Box(shirt, p + q * new Vector3(-0.25f, 1.12f, 0f) * s, q, new Vector3(0.1f, 0.48f, 0.1f) * s);
                mb.Box(shirt, p + q * new Vector3(0.25f, 1.12f, 0f) * s, q, new Vector3(0.1f, 0.48f, 0.1f) * s);
            }
        }

        // ---------- mesh helper ----------
        class MeshBuilder
        {
            readonly List<Vector3> v = new List<Vector3>();
            readonly List<Vector3> n = new List<Vector3>();
            readonly List<Vector2> uv = new List<Vector2>();
            readonly List<int>[] tris;

            public MeshBuilder(int submeshes)
            {
                tris = new List<int>[submeshes];
                for (int i = 0; i < submeshes; i++) tris[i] = new List<int>();
            }

            public void Quad(int sub, Vector3 a, Vector3 b, Vector3 c, Vector3 d, float uRepeat)
            {
                Vector3 nn = Vector3.Cross(b - a, d - a).normalized;
                int i = v.Count;
                v.Add(a); v.Add(b); v.Add(c); v.Add(d);
                n.Add(nn); n.Add(nn); n.Add(nn); n.Add(nn);
                uv.Add(new Vector2(0, 0)); uv.Add(new Vector2(uRepeat, 0)); uv.Add(new Vector2(uRepeat, 1)); uv.Add(new Vector2(0, 1));
                // both windings: the bowl is seen from every side
                tris[sub].AddRange(new[] { i, i + 2, i + 1, i, i + 3, i + 2, i, i + 1, i + 2, i, i + 2, i + 3 });
            }

            public void Box(int sub, Vector3 c, Quaternion q, Vector3 size)
            {
                Vector3 h = size * 0.5f;
                Vector3[] corners =
                {
                    new Vector3(-h.x, -h.y, -h.z), new Vector3(h.x, -h.y, -h.z), new Vector3(h.x, h.y, -h.z), new Vector3(-h.x, h.y, -h.z),
                    new Vector3(-h.x, -h.y, h.z), new Vector3(h.x, -h.y, h.z), new Vector3(h.x, h.y, h.z), new Vector3(-h.x, h.y, h.z)
                };
                // the bottom face is never seen
                int[][] faces = { new[] { 0, 3, 2, 1 }, new[] { 4, 5, 6, 7 }, new[] { 0, 4, 7, 3 }, new[] { 1, 2, 6, 5 }, new[] { 3, 7, 6, 2 } };
                foreach (var f in faces)
                {
                    int i = v.Count;
                    Vector3 a = c + q * corners[f[0]], b = c + q * corners[f[1]], cc = c + q * corners[f[2]], d = c + q * corners[f[3]];
                    Vector3 nn = Vector3.Cross(b - a, d - a).normalized;
                    v.Add(a); v.Add(b); v.Add(cc); v.Add(d);
                    n.Add(nn); n.Add(nn); n.Add(nn); n.Add(nn);
                    uv.Add(Vector2.zero); uv.Add(Vector2.right); uv.Add(Vector2.one); uv.Add(Vector2.up);
                    tris[sub].AddRange(new[] { i, i + 1, i + 2, i, i + 2, i + 3 });
                }
            }

            public Transform Create(string name, Transform parent, bool shadows, params Material[] mats)
            {
                if (v.Count == 0) return null;
                var mesh = new Mesh { name = name, indexFormat = IndexFormat.UInt32 };
                mesh.SetVertices(v);
                mesh.SetNormals(n);
                mesh.SetUVs(0, uv);
                mesh.subMeshCount = tris.Length;
                for (int i = 0; i < tris.Length; i++) mesh.SetTriangles(tris[i], i);
                mesh.RecalculateBounds();
                var go = new GameObject(name);
                go.transform.SetParent(parent, false);
                go.AddComponent<MeshFilter>().sharedMesh = mesh;
                var mr = go.AddComponent<MeshRenderer>();
                mr.sharedMaterials = mats;
                mr.shadowCastingMode = shadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
                return go.transform;
            }
        }
    }
}
