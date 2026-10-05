using System.Collections.Generic;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace ArenaMix
{
    /// <summary>What a player wants to do this frame: filled by the touch/keyboard controls for you
    /// and by the AI for CPU players.</summary>
    public struct Intent
    {
        public Vector2 move;      // stick, -1..1 (x = right on screen, y = up on screen)
        public bool sprint;       // held
        public bool shootHeld;    // held: charging a shot
        public bool shootUp;      // released this frame: strike
        public bool actionDown;   // pressed this frame: skill move with the ball, slide tackle without it
    }

    /// <summary>
    /// Touch controls (floating joystick on the left half, CHUT / SPRINT / REGATE buttons on the right)
    /// plus keyboard for testing on the computer: WASD or arrows, Space to shoot, Shift to sprint, E for the action.
    /// Drawn with IMGUI so it needs no UI setup in the scene.
    /// </summary>
    public class GameInput : MonoBehaviour
    {
        public Intent Current;
        public bool HasBall;          // shows REGATE or ENTRADA on the action button
        public float Charge;          // 0..1, drawn around the shoot button

        struct Ptr { public int id; public Vector2 pos; public bool began; }

        readonly List<Ptr> ptrs = new List<Ptr>();
        readonly HashSet<int> prevIds = new HashSet<int>();
        int joyId = int.MinValue;
        Vector2 joyOrigin, joyPos;
        bool shootWas;
        Texture2D disc, ring;

        // buttons in screen units of the shorter side, measured from the bottom-right corner
        static readonly Vector3 BtnShoot = new Vector3(0.16f, 0.22f, 0.13f);
        static readonly Vector3 BtnSprint = new Vector3(0.40f, 0.13f, 0.085f);
        static readonly Vector3 BtnAction = new Vector3(0.12f, 0.50f, 0.085f);

        void Awake()
        {
            disc = MakeCircle(128, false);
            ring = MakeCircle(128, true);
        }

        float S => Mathf.Min(Screen.width, Screen.height);

        Vector2 BtnCenter(Vector3 b) => new Vector2(Screen.width - b.x * S, b.y * S);

        bool Inside(Vector2 p, Vector3 b) => (p - BtnCenter(b)).magnitude < b.z * S * 1.25f;

        void ReadPointers()
        {
            ptrs.Clear();
            var ids = new HashSet<int>();
#if ENABLE_INPUT_SYSTEM
            var ts = Touchscreen.current;
            if (ts != null)
            {
                foreach (var t in ts.touches)
                {
                    if (!t.press.isPressed) continue;
                    int id = t.touchId.ReadValue();
                    ids.Add(id);
                    ptrs.Add(new Ptr { id = id, pos = t.position.ReadValue(), began = !prevIds.Contains(id) });
                }
            }
            var ms = Mouse.current;
            if (ptrs.Count == 0 && ms != null && ms.leftButton.isPressed)
            {
                ids.Add(-1);
                ptrs.Add(new Ptr { id = -1, pos = ms.position.ReadValue(), began = !prevIds.Contains(-1) });
            }
#else
            for (int i = 0; i < Input.touchCount; i++)
            {
                var t = Input.GetTouch(i);
                if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled) continue;
                ids.Add(t.fingerId);
                ptrs.Add(new Ptr { id = t.fingerId, pos = t.position, began = !prevIds.Contains(t.fingerId) });
            }
            if (ptrs.Count == 0 && Input.GetMouseButton(0))
            {
                ids.Add(-1);
                ptrs.Add(new Ptr { id = -1, pos = Input.mousePosition, began = !prevIds.Contains(-1) });
            }
#endif
            prevIds.Clear();
            foreach (var id in ids) prevIds.Add(id);
        }

        void Update()
        {
            ReadPointers();
            var it = new Intent();
            bool shoot = false;

            // joystick: appears where the thumb lands on the left half of the screen
            bool joyAlive = false;
            foreach (var p in ptrs)
            {
                if (p.id == joyId) { joyAlive = true; joyPos = p.pos; }
                else if (p.began && joyId == int.MinValue && p.pos.x < Screen.width * 0.45f)
                {
                    joyId = p.id; joyOrigin = p.pos; joyPos = p.pos; joyAlive = true;
                }
            }
            if (!joyAlive) joyId = int.MinValue;
            if (joyId != int.MinValue)
            {
                Vector2 d = (joyPos - joyOrigin) / (S * 0.11f);
                it.move = Vector2.ClampMagnitude(d, 1f);
            }

            foreach (var p in ptrs)
            {
                if (p.id == joyId) continue;
                if (Inside(p.pos, BtnShoot)) shoot = true;
                if (Inside(p.pos, BtnSprint)) it.sprint = true;
                if (p.began && Inside(p.pos, BtnAction)) it.actionDown = true;
            }

#if ENABLE_INPUT_SYSTEM
            var kb = Keyboard.current;
            if (kb != null)
            {
                Vector2 k = Vector2.zero;
                if (kb.aKey.isPressed || kb.leftArrowKey.isPressed) k.x -= 1;
                if (kb.dKey.isPressed || kb.rightArrowKey.isPressed) k.x += 1;
                if (kb.sKey.isPressed || kb.downArrowKey.isPressed) k.y -= 1;
                if (kb.wKey.isPressed || kb.upArrowKey.isPressed) k.y += 1;
                if (k != Vector2.zero) it.move = k.normalized;
                if (kb.leftShiftKey.isPressed) it.sprint = true;
                if (kb.eKey.wasPressedThisFrame) it.actionDown = true;
                bool sk = kb.spaceKey.isPressed;
                if (sk) shoot = true;
            }
#else
            Vector2 k = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            if (k != Vector2.zero) it.move = Vector2.ClampMagnitude(k, 1f);
            if (Input.GetKey(KeyCode.LeftShift)) it.sprint = true;
            if (Input.GetKeyDown(KeyCode.E)) it.actionDown = true;
            if (Input.GetKey(KeyCode.Space)) shoot = true;
#endif
            it.shootHeld = shoot;
            it.shootUp = shootWas && !shoot;
            shootWas = shoot;
            Current = it;
        }

        void OnGUI()
        {
            if (Event.current.type != EventType.Repaint) return;
            float s = S;
            // joystick
            Vector2 baseC = joyId != int.MinValue ? joyOrigin : new Vector2(s * 0.24f, s * 0.26f);
            float jr = s * 0.11f;
            DrawCircle(disc, baseC, jr, new Color(0.04f, 0.04f, 0.08f, 0.45f));
            DrawCircle(ring, baseC, jr, new Color(1f, 1f, 1f, 0.25f));
            Vector2 knob = baseC + Current.move * jr;
            DrawCircle(disc, knob, jr * 0.48f, new Color(0.13f, 0.83f, 0.93f, 0.9f));
            // buttons
            Button(BtnShoot, "CHUT", new Color(0.96f, 0.96f, 0.98f, 0.92f), Current.shootHeld);
            if (Charge > 0f)
            {
                Vector2 c = BtnCenter(BtnShoot);
                DrawCircle(ring, c, BtnShoot.z * s * (1.05f + 0.25f * Charge), Color.Lerp(new Color(0.3f, 0.9f, 0.4f), new Color(1f, 0.35f, 0.2f), Charge));
            }
            Button(BtnSprint, "SPRINT", new Color(0.13f, 0.83f, 0.93f, 0.92f), Current.sprint);
            Button(BtnAction, HasBall ? "REGATE" : "ENTRADA", HasBall ? new Color(0.33f, 0.85f, 0.56f, 0.92f) : new Color(1f, 0.45f, 0.45f, 0.92f), false);
        }

        void Button(Vector3 b, string label, Color col, bool down)
        {
            Vector2 c = BtnCenter(b);
            float r = b.z * S * (down ? 0.92f : 1f);
            DrawCircle(disc, c, r, col);
            var st = new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.BoldAndItalic, fontSize = Mathf.RoundToInt(r * 0.42f) };
            st.normal.textColor = new Color(0.04f, 0.04f, 0.08f);
            GUI.Label(ScreenRect(c, r), label, st);
        }

        static Rect ScreenRect(Vector2 c, float r) => new Rect(c.x - r, Screen.height - c.y - r, r * 2, r * 2);

        static void DrawCircle(Texture2D tex, Vector2 c, float r, Color col)
        {
            var old = GUI.color;
            GUI.color = col;
            GUI.DrawTexture(ScreenRect(c, r), tex);
            GUI.color = old;
        }

        static Texture2D MakeCircle(int n, bool outline)
        {
            var t = new Texture2D(n, n, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp };
            var px = new Color32[n * n];
            float h = n * 0.5f;
            for (int y = 0; y < n; y++)
                for (int x = 0; x < n; x++)
                {
                    float d = Mathf.Sqrt((x + 0.5f - h) * (x + 0.5f - h) + (y + 0.5f - h) * (y + 0.5f - h)) / h;
                    float a = Mathf.Clamp01((1f - d) * h * 0.5f);
                    if (outline) a *= Mathf.Clamp01((d - 0.86f) * h * 0.5f);
                    px[y * n + x] = new Color32(255, 255, 255, (byte)(a * 255));
                }
            t.SetPixels32(px);
            t.Apply();
            return t;
        }
    }
}
