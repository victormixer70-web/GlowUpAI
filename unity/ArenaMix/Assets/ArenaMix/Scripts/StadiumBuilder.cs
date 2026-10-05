using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace ArenaMix
{
    /// <summary>
    /// Builds a full football stadium around the pitch: four two-tier stands joined by curved corners,
    /// a roof with floodlight strips, coloured seats, thousands of fans in both teams' colours and LED
    /// advertising boards. Everything is merged into a handful of meshes so it stays fast on phones.
    /// </summary>
    public class StadiumBuilder
    {
        // stand profile (depth from the front edge, height): lower tier, concourse, upper tier, back wall
        const int LowRows = 14, UpRows = 12;
        const float RowDepth = 0.82f, LowRise = 0.42f, UpRise = 0.62f, FrontWall = 1.1f;
        static float LowY(int r) => FrontWall + r * LowRise;
        static float UpBaseD => LowRows * RowDepth + 2.6f;
        static float UpBaseY => LowY(LowRows) + 2.8f;
        static float UpY(int r) => UpBaseY + r * UpRise;
        static float BackD => UpBaseD + UpRows * RowDepth;
        static float TopY => UpY(UpRows) + 1.4f;

        public Material concrete, seat, roof, glow, skin, ads;
        public Color[] homeColors, awayColors;
        public readonly List<Transform> crowdBlocks = new List<Transform>();

        /// <summary>half sizes of the rectangle where the stands start (front edge of each stand)</summary>
        float hx, hz;
        readonly System.Random rng = new System.Random(7);

        public void Build(Transform root, float halfX, float halfZ)
        {
            hx = halfX; hz = halfZ;
            var bowl = new MeshBuilder(2);    // 0 concrete, 1 seats
            var roofMb = new MeshBuilder(2);  // 0 roof, 1 light strips
            // straight stands: far (+z), near (-z), west (-x), east (+x)
            Side(bowl, roofMb, new Vector3(0, 0, hz), Quaternion.identity, hx * 2f);
            Side(bowl, roofMb, new Vector3(0, 0, -hz), Quaternion.Euler(0, 180, 0), hx * 2f);
            Side(bowl, roofMb, new Vector3(-hx, 0, 0), Quaternion.Euler(0, -90, 0), hz * 2f);
            Side(bowl, roofMb, new Vector3(hx, 0, 0), Quaternion.Euler(0, 90, 0), hz * 2f);
            // curved corners
            Corner(bowl, roofMb, new Vector3(hx, 0, hz), 0f);
            Corner(bowl, roofMb, new Vector3(-hx, 0, hz), 270f);
            Corner(bowl, roofMb, new Vector3(-hx, 0, -hz), 180f);
            Corner(bowl, roofMb, new Vector3(hx, 0, -hz), 90f);
            bowl.Create("Stands", root, concrete, seat);
            roofMb.Create("Roof", root, roof, glow, false);
            BuildCrowd(root);
        }

        // ---------- stand geometry ----------
        static List<Vector2> Profile()
        {
            var p = new List<Vector2> { new Vector2(0, 0), new Vector2(0, FrontWall) };
            for (int r = 0; r < LowRows; r++) { p.Add(new Vector2(r * RowDepth, LowY(r))); p.Add(new Vector2((r + 1) * RowDepth, LowY(r))); p.Add(new Vector2((r + 1) * RowDepth, LowY(r + 1))); }
            p.Add(new Vector2(UpBaseD - 0.6f, LowY(LowRows)));
            p.Add(new Vector2(UpBaseD - 0.6f, UpBaseY));
            p.Add(new Vector2(UpBaseD, UpBaseY));
            for (int r = 0; r < UpRows; r++) { p.Add(new Vector2(UpBaseD + r * RowDepth, UpY(r))); p.Add(new Vector2(UpBaseD + (r + 1) * RowDepth, UpY(r))); p.Add(new Vector2(UpBaseD + (r + 1) * RowDepth, UpY(r + 1))); }
            p.Add(new Vector2(BackD, TopY));
            p.Add(new Vector2(BackD + 0.6f, TopY));
            p.Add(new Vector2(BackD + 0.6f, 0));
            return p;
        }

        void Side(MeshBuilder mb, MeshBuilder rmb, Vector3 front, Quaternion rot, float len)
        {
            var prof = Profile();
            var m = Matrix4x4.TRS(front, rot, Vector3.one);
            Vector3 P(float x, Vector2 q) => m.MultiplyPoint3x4(new Vector3(x, q.y, q.x));
            float a = -len * 0.5f, b = len * 0.5f;
            for (int i = 0; i < prof.Count - 1; i++)
                mb.Quad(0, P(a, prof[i]), P(b, prof[i]), P(b, prof[i + 1]), P(a, prof[i + 1]), len / 4f);
            // seat strips on every tread
            for (int r = 0; r < LowRows; r++) SeatStrip(mb, m, a, b, r * RowDepth + 0.45f, LowY(r));
            for (int r = 0; r < UpRows; r++) SeatStrip(mb, m, a, b, UpBaseD + r * RowDepth + 0.45f, UpY(r));
            RoofSide(rmb, m, a, b);
            // fans
            var fans = new List<(Vector3 pos, float yaw)>();
            float yaw = rot.eulerAngles.y + 180f;
            for (int r = 1; r < LowRows; r++) for (float x = a + 0.4f; x < b - 0.3f; x += 0.62f) fans.Add((P(x, new Vector2(r * RowDepth + 0.5f, LowY(r))), yaw));
            for (int r = 0; r < UpRows; r++) for (float x = a + 0.4f; x < b - 0.3f; x += 0.64f) fans.Add((P(x, new Vector2(UpBaseD + r * RowDepth + 0.5f, UpY(r))), yaw));
            pendingFans.Add(fans);
        }

        void SeatStrip(MeshBuilder mb, Matrix4x4 m, float a, float b, float d, float y)
        {
            Vector3 P(float x, float dd, float yy) => m.MultiplyPoint3x4(new Vector3(x, yy, dd));
            mb.Quad(1, P(a, d - 0.15f, y + 0.42f), P(b, d - 0.15f, y + 0.42f), P(b, d + 0.25f, y + 0.42f), P(a, d + 0.25f, y + 0.42f), (b - a) / 0.62f);
            mb.Quad(1, P(a, d + 0.25f, y + 0.42f), P(b, d + 0.25f, y + 0.42f), P(b, d + 0.32f, y + 0.85f), P(a, d + 0.32f, y + 0.85f), (b - a) / 0.62f);
        }

        void RoofSide(MeshBuilder rmb, Matrix4x4 m, float a, float b)
        {
            Vector3 P(float x, float d, float y) => m.MultiplyPoint3x4(new Vector3(x, y, d));
            float y0 = TopY + 0.4f, y1 = TopY + 2.2f, front = 3f;
            rmb.Quad(0, P(a, BackD + 0.6f, y0), P(b, BackD + 0.6f, y0), P(b, front, y1), P(a, front, y1), (b - a) / 6f);   // top
            rmb.Quad(0, P(a, front, y1 - 0.5f), P(b, front, y1 - 0.5f), P(b, BackD + 0.6f, y0 - 0.5f), P(a, BackD + 0.6f, y0 - 0.5f), (b - a) / 6f); // underside
            rmb.Quad(0, P(a, front, y1), P(b, front, y1), P(b, front, y1 - 0.5f), P(a, front, y1 - 0.5f), 1f);                     // fascia
            rmb.Quad(1, P(a, front + 0.6f, y1 - 0.52f), P(b, front + 0.6f, y1 - 0.52f), P(b, front + 1.1f, y1 - 0.53f), P(a, front + 1.1f, y1 - 0.53f), 1f); // light strip
        }

        void Corner(MeshBuilder mb, MeshBuilder rmb, Vector3 c, float startDeg)
        {
            var prof = Profile();
            const int segs = 12;
            Vector3 P(float ang, Vector2 q) { float r = q.x; float t = (startDeg + ang) * Mathf.Deg2Rad; return c + new Vector3(Mathf.Sin(t) * r, q.y, Mathf.Cos(t) * r); }
            for (int s = 0; s < segs; s++)
            {
                float a0 = 90f * s / segs, a1 = 90f * (s + 1) / segs;
                for (int i = 0; i < prof.Count - 1; i++)
                    mb.Quad(0, P(a1, prof[i]), P(a0, prof[i]), P(a0, prof[i + 1]), P(a1, prof[i + 1]), 1f);
                float y0 = TopY + 0.4f, y1 = TopY + 2.2f;
                rmb.Quad(0, P(a1, new Vector2(BackD + 0.6f, y0)), P(a0, new Vector2(BackD + 0.6f, y0)), P(a0, new Vector2(3f, y1)), P(a1, new Vector2(3f, y1)), 1f);
                rmb.Quad(0, P(a1, new Vector2(3f, y1 - 0.5f)), P(a0, new Vector2(3f, y1 - 0.5f)), P(a0, new Vector2(BackD + 0.6f, y0 - 0.5f)), P(a1, new Vector2(BackD + 0.6f, y0 - 0.5f)), 1f);
            }
            var fans = new List<(Vector3, float)>();
            void Row(float rad, float y, float spacing)
            {
                int n = Mathf.FloorToInt(rad * Mathf.PI * 0.5f / spacing);
                for (int i = 0; i < n; i++)
                {
                    float ang = 90f * (i + 0.5f) / n;
                    fans.Add((P(ang, new Vector2(rad, y)), startDeg + ang + 180f));
                }
            }
            for (int r = 2; r < LowRows; r++) Row(r * RowDepth + 0.5f, LowY(r), 0.64f);
            for (int r = 0; r < UpRows; r++) Row(UpBaseD + r * RowDepth + 0.5f, UpY(r), 0.66f);
            pendingFans.Add(fans);
        }

        // ---------- crowd ----------
        readonly List<List<(Vector3 pos, float yaw)>> pendingFans = new List<List<(Vector3, float)>>();

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
                    if (rng.NextDouble() < 0.1) continue;
                    // your fans on the left half (x < 0), the rival's on the right, a few neutral shirts
                    bool homeSide = pos.x < 0f;
                    int c = rng.NextDouble() < 0.12 ? home + away + rng.Next(neutral) : (homeSide ? rng.Next(home) : home + rng.Next(away));
                    Fan(mb, pos, yaw, c, palette.Count, (float)rng.NextDouble());
                }
                var t = mb.Create("Crowd" + block++, root, mats);
                if (t != null) crowdBlocks.Add(t);
            }
        }

        void Fan(MeshBuilder mb, Vector3 p, float yaw, int shirt, int skinIdx, float rnd)
        {
            var q = Quaternion.Euler(0f, yaw + (rnd - 0.5f) * 20f, 0f);
            float s = 0.92f + rnd * 0.16f;
            bool armsUp = rnd > 0.8f;
            mb.Box(shirt, p + Vector3.up * 0.62f * s, q, new Vector3(0.42f, 0.56f, 0.26f) * s);                  // torso
            mb.Box(skinIdx, p + Vector3.up * 1.04f * s, q, new Vector3(0.2f, 0.24f, 0.21f) * s);                  // head
            if (armsUp)
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
                // both windings: stands are seen from every side
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
                int[][] faces = { new[] { 0, 3, 2, 1 }, new[] { 4, 5, 6, 7 }, new[] { 0, 4, 7, 3 }, new[] { 1, 2, 6, 5 }, new[] { 3, 7, 6, 2 }, new[] { 0, 1, 5, 4 } };
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

            public Transform Create(string name, Transform parent, params Material[] mats) => Create(name, parent, mats, true);

            public Transform Create(string name, Transform parent, Material a, Material b, bool shadows) => Create(name, parent, new[] { a, b }, shadows);

            Transform Create(string name, Transform parent, Material[] mats, bool shadows)
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
