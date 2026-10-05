using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace ArenaMix.EditorTools
{
    /// <summary>
    /// One click: menu ArenaMix > Preparar proyecto. Re-imports the characters and animations with the
    /// right settings, builds the animator controller (run blend tree + shots, tackles, keeper dives...),
    /// creates the materials and the match scene, and opens it ready to press Play.
    /// </summary>
    public static class ArenaMixSetup
    {
        const string Root = ArenaMixImporter.Root;
        const string Gen = Root + "/Generated";

        // character files in Assets/ArenaMix/Characters (first one is yours by default)
        static readonly string[] Characters = { "Ty", "Big_Vegas", "Sporty_Granny" };

        [MenuItem("ArenaMix/Preparar proyecto (crear escena del partido)", priority = 1)]
        public static void Setup()
        {
            try
            {
                EditorUtility.DisplayProgressBar("ArenaMix", "Importando personajes y animaciones...", 0.1f);
                Directory.CreateDirectory(Gen);
                AssetDatabase.ImportAsset(Root + "/Characters", ImportAssetOptions.ImportRecursive | ImportAssetOptions.ForceUpdate);
                AssetDatabase.ImportAsset(Root + "/Animations", ImportAssetOptions.ImportRecursive | ImportAssetOptions.ForceUpdate);
                AssetDatabase.Refresh();

                EditorUtility.DisplayProgressBar("ArenaMix", "Creando el controlador de animaciones...", 0.4f);
                var controller = BuildController();

                EditorUtility.DisplayProgressBar("ArenaMix", "Creando materiales...", 0.6f);
                var mats = BuildMaterials();

                EditorUtility.DisplayProgressBar("ArenaMix", "Creando la escena del partido...", 0.8f);
                BuildScene(controller, mats);

                PlayerSettings.productName = "ARENA MIX";
                PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
                PlayerSettings.allowedAutorotateToPortrait = false;
                PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
                PlayerSettings.allowedAutorotateToLandscapeLeft = true;
                PlayerSettings.allowedAutorotateToLandscapeRight = true;
                AssetDatabase.SaveAssets();
                Debug.Log("ArenaMix: listo. Pulsa Play para jugar el partido 1 contra 1.");
                EditorUtility.DisplayDialog("ArenaMix", "Listo. Se ha abierto la escena Partido.\n\nPulsa Play para jugar.\n\nTeclado: WASD o flechas para moverte, Espacio para chutar (mantén para más fuerza), Shift para esprintar, E para regate o entrada.", "Vale");
            }
            finally
            {
                EditorUtility.ClearProgressBar();
            }
        }

        // ---------------- animations ----------------
        static AnimationClip Clip(string file)
        {
            string path = $"{Root}/Animations/{file}.fbx";
            var clip = AssetDatabase.LoadAllAssetsAtPath(path).OfType<AnimationClip>().FirstOrDefault(c => !c.name.StartsWith("__preview__"));
            if (clip == null) Debug.LogWarning("ArenaMix: falta la animación " + path);
            return clip;
        }

        static AnimatorController BuildController()
        {
            string path = Gen + "/Footballer.controller";
            AssetDatabase.DeleteAsset(path);
            var ac = AnimatorController.CreateAnimatorControllerAtPath(path);
            ac.AddParameter("MoveX", AnimatorControllerParameterType.Float);
            ac.AddParameter("MoveZ", AnimatorControllerParameterType.Float);
            ac.AddParameter("AnimSpeed", AnimatorControllerParameterType.Float);
            ac.AddParameter("Keeper", AnimatorControllerParameterType.Bool);
            var ps = ac.parameters;
            foreach (var p in ps) if (p.name == "AnimSpeed") p.defaultFloat = 1f;
            ac.parameters = ps;

            var sm = ac.layers[0].stateMachine;
            var loco = Tree(ac, "Locomotion", "offensive idle", "jog forward", "jog backward", "jog strafe left", "jog strafe right");
            var gk = Tree(ac, "KeeperLoco", "goalkeeper idle", "jog forward", "jog backward", "goalkeeper sidestep", "goalkeeper sidestep (2)");
            sm.defaultState = loco;
            sm.states = sm.states.Select(s =>
            {
                if (s.state == loco) s.position = new Vector3(300, 0, 0);
                if (s.state == gk) s.position = new Vector3(300, 120, 0);
                return s;
            }).ToArray();

            var toGk = loco.AddTransition(gk);
            toGk.hasExitTime = false; toGk.duration = 0.1f;
            toGk.AddCondition(AnimatorConditionMode.If, 0f, "Keeper");
            var toField = gk.AddTransition(loco);
            toField.hasExitTime = false; toField.duration = 0.1f;
            toField.AddCondition(AnimatorConditionMode.IfNot, 0f, "Keeper");

            // one-shot actions, started from code with CrossFade; they return to running when they end
            (string state, string file, float exit)[] actions =
            {
                ("Shoot", "strike foward jog", 0.72f),
                ("Pass", "kick soccerball (2)", 0.9f),
                ("Tackle", "soccer tackle (2)", 0.62f),
                ("DiveL", "goalkeeper diving save", 0.62f),
                ("DiveR", "goalkeeper diving save (2)", 0.62f),
                ("Catch", "goalkeeper catch (2)", 0.9f),
                ("GKThrow", "goalkeeper overhand throw", 0.7f),
                ("GKKick", "goalkeeper drop kick", 0.7f),
            };
            int row = 0;
            foreach (var a in actions)
            {
                var st = sm.AddState(a.state, new Vector3(600, row++ * 60, 0));
                st.motion = Clip(a.file);
                foreach (var dest in new[] { (loco, false), (gk, true) })
                {
                    var t = st.AddTransition(dest.Item1);
                    t.hasExitTime = true; t.exitTime = a.exit; t.duration = 0.18f;
                    t.AddCondition(dest.Item2 ? AnimatorConditionMode.If : AnimatorConditionMode.IfNot, 0f, "Keeper");
                }
            }
            EditorUtility.SetDirty(ac);
            return ac;
        }

        static AnimatorState Tree(AnimatorController ac, string name, string idle, string fwd, string back, string left, string right)
        {
            var state = ac.CreateBlendTreeInController(name, out BlendTree tree, 0);
            tree.blendType = BlendTreeType.FreeformDirectional2D;
            tree.blendParameter = "MoveX";
            tree.blendParameterY = "MoveZ";
            tree.AddChild(Clip(idle), Vector2.zero);
            tree.AddChild(Clip(fwd), new Vector2(0f, 1f));
            tree.AddChild(Clip(back), new Vector2(0f, -1f));
            tree.AddChild(Clip(left), new Vector2(-1f, 0f));
            tree.AddChild(Clip(right), new Vector2(1f, 0f));
            state.speedParameter = "AnimSpeed";
            state.speedParameterActive = true;
            return state;
        }

        // ---------------- materials ----------------
        class Mats { public Material pitchLight, pitchDark, line, post, net, board, stand, ball, ring, sky; }

        static Shader Lit => Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
        static Shader Unlit => Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Unlit/Texture");

        static Material Mat(string name, Shader shader, Color color)
        {
            string path = $"{Gen}/{name}.mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (m == null) { m = new Material(shader); AssetDatabase.CreateAsset(m, path); }
            m.shader = shader;
            m.color = color;
            EditorUtility.SetDirty(m);
            return m;
        }

        static void AlphaClip(Material m, bool doubleSided)
        {
            m.SetFloat("_AlphaClip", 1f);
            m.SetFloat("_Cutoff", 0.5f);
            m.EnableKeyword("_ALPHATEST_ON");
            m.renderQueue = (int)RenderQueue.AlphaTest;
            if (doubleSided) m.SetFloat("_Cull", 0f);
        }

        static Texture2D SavePng(string name, Texture2D tex)
        {
            string path = $"{Gen}/{name}.png";
            File.WriteAllBytes(path, tex.EncodeToPNG());
            AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceUpdate);
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }

        static Texture2D NetTexture()
        {
            const int n = 64;
            var t = new Texture2D(n, n, TextureFormat.RGBA32, false);
            var px = new Color32[n * n];
            for (int y = 0; y < n; y++)
                for (int x = 0; x < n; x++)
                    px[y * n + x] = (x < 4 || y < 4) ? new Color32(255, 255, 255, 255) : new Color32(255, 255, 255, 0);
            t.SetPixels32(px);
            t.Apply();
            return t;
        }

        static Mats BuildMaterials()
        {
            var m = new Mats();
            var grass = AssetDatabase.LoadAssetAtPath<Texture2D>(Root + "/Environment/grass_color.jpg");
            var grassN = AssetDatabase.LoadAssetAtPath<Texture2D>(Root + "/Environment/grass_normal.jpg");
            Material Pitch(string name, Color tint)
            {
                var p = Mat(name, Lit, tint);
                if (grass != null) { p.SetTexture("_BaseMap", grass); p.SetTextureScale("_BaseMap", new Vector2(2f, 14f)); }
                if (grassN != null) { p.SetTexture("_BumpMap", grassN); p.SetTextureScale("_BumpMap", new Vector2(2f, 14f)); p.SetFloat("_BumpScale", 0.6f); p.EnableKeyword("_NORMALMAP"); }
                p.SetFloat("_Smoothness", 0.12f);
                return p;
            }
            m.pitchLight = Pitch("PitchLight", new Color(0.42f, 1f, 0.36f));
            m.pitchDark = Pitch("PitchDark", new Color(0.34f, 0.86f, 0.3f));
            m.line = Mat("Lines", Unlit, new Color(0.96f, 0.98f, 0.96f));
            m.post = Mat("Posts", Lit, Color.white); m.post.SetFloat("_Smoothness", 0.7f);
            m.net = Mat("Net", Unlit, new Color(1f, 1f, 1f, 1f));
            m.net.SetTexture("_BaseMap", SavePng("net", NetTexture()));
            m.net.SetTextureScale("_BaseMap", new Vector2(14f, 14f));
            AlphaClip(m.net, true);
            m.board = Mat("Boards", Unlit, new Color(0.05f, 0.06f, 0.12f));
            m.stand = Mat("Stands", Lit, new Color(0.17f, 0.2f, 0.29f));
            m.ball = Mat("Ball", Lit, Color.white);
            var ballTex = AssetDatabase.LoadAssetAtPath<Texture2D>(Root + "/Environment/ball.png");
            if (ballTex != null) m.ball.SetTexture("_BaseMap", ballTex);
            m.ball.SetFloat("_Smoothness", 0.65f);
            m.ring = Mat("TeamRing", Unlit, Color.white);
            m.ring.SetTexture("_BaseMap", SavePng("ring", MatchManager.RingTexture()));
            AlphaClip(m.ring, false);
            var hdr = AssetDatabase.LoadAssetAtPath<Texture>(Root + "/Environment/stadium.hdr");
            m.sky = Mat("Sky", Shader.Find("Skybox/Panoramic"), Color.white);
            if (hdr != null) m.sky.SetTexture("_MainTex", hdr);
            m.sky.SetFloat("_Mapping", 1f);
            m.sky.SetFloat("_ImageType", 0f);
            m.sky.SetFloat("_Exposure", 1f);
            return m;
        }

        // ---------------- scene ----------------
        static void BuildScene(AnimatorController controller, Mats mats)
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            foreach (var go in scene.GetRootGameObjects())
            {
                var light = go.GetComponent<Light>();
                if (light != null && light.type == LightType.Directional)
                {
                    light.intensity = 1.35f;
                    light.color = new Color(1f, 0.96f, 0.9f);
                    light.shadows = LightShadows.Soft;
                    go.transform.rotation = Quaternion.Euler(52f, -35f, 0f);
                }
                var cam = go.GetComponent<Camera>();
                if (cam != null)
                {
                    cam.transform.position = new Vector3(0f, 14f, -31f);
                    cam.transform.rotation = Quaternion.Euler(28f, 0f, 0f);
                    cam.fieldOfView = 42f;
                }
            }
            RenderSettings.skybox = mats.sky;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.78f, 0.84f, 0.95f);
            RenderSettings.ambientEquatorColor = new Color(0.5f, 0.56f, 0.55f);
            RenderSettings.ambientGroundColor = new Color(0.22f, 0.32f, 0.2f);

            var match = new GameObject("Match");
            match.AddComponent<GameInput>();
            var mm = match.AddComponent<MatchManager>();
            mm.characterModels = Characters
                .Select(n => AssetDatabase.LoadAssetAtPath<GameObject>($"{Root}/Characters/{n}.fbx"))
                .Where(g => g != null).ToArray();
            mm.controller = controller;
            mm.pitchLight = mats.pitchLight; mm.pitchDark = mats.pitchDark; mm.lineMat = mats.line;
            mm.postMat = mats.post; mm.netMat = mats.net; mm.boardMat = mats.board; mm.standMat = mats.stand;
            mm.ballMat = mats.ball; mm.ringMat = mats.ring;
            if (mm.characterModels.Length == 0) Debug.LogWarning("ArenaMix: no encuentro los personajes en " + Root + "/Characters");

            string path = Gen + "/Partido.unity";
            EditorSceneManager.SaveScene(scene, path);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(path, true) };
        }
    }
}
