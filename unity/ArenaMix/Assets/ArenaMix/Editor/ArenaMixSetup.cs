using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

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

        /// <summary>Every model in Assets/ArenaMix/Characters (Ty first: he is yours by default).
        /// Drop more Mixamo characters (FBX for Unity, with skin) in that folder and run the menu again.</summary>
        static string[] Characters() => AssetDatabase.FindAssets("t:Model", new[] { Root + "/Characters" })
            .Select(AssetDatabase.GUIDToAssetPath)
            .Where(p => p.EndsWith(".fbx", System.StringComparison.OrdinalIgnoreCase))
            .OrderBy(p => Path.GetFileNameWithoutExtension(p) == "Ty" ? 0 : 1).ThenBy(p => p)
            .ToArray();

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
                foreach (var fbx in Characters()) CharacterMaterials(fbx);

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
                Debug.Log("ArenaMix: listo. Pulsa Play y elige el modo (1 vs 1 a 4 vs 4).");
                EditorUtility.DisplayDialog("ArenaMix", "Listo. Se ha abierto la escena Partido.\n\nPulsa Play para jugar.\n\nTeclado: WASD o flechas para moverte, Espacio para chutar (mantén para más fuerza), Shift para esprintar, E para regate o entrada, Q para pasar.", "Vale");
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
        class Mats { public Material pitchLight, pitchDark, line, post, net, board, stand, ball, ring, sky, seat, roof, glow, skin, apron, glass, accent, tunnel, roofUnder, rib; }

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
            m.pitchLight = Pitch("PitchLight", new Color(0.62f, 0.95f, 0.5f));
            m.pitchDark = Pitch("PitchDark", new Color(0.5f, 0.8f, 0.4f));
            m.apron = Pitch("Apron", new Color(0.36f, 0.6f, 0.3f));
            m.line = Mat("Lines", Unlit, new Color(0.96f, 0.98f, 0.96f));
            m.post = Mat("Posts", Lit, Color.white); m.post.SetFloat("_Smoothness", 0.7f);
            m.net = Mat("Net", Unlit, new Color(1f, 1f, 1f, 1f));
            m.net.SetTexture("_BaseMap", SavePng("net", NetTexture()));
            m.net.SetTextureScale("_BaseMap", new Vector2(14f, 14f));
            AlphaClip(m.net, true);
            // LED advertising boards
            m.board = Mat("Boards", Unlit, Color.white);
            var ads = AssetDatabase.LoadAssetAtPath<Texture2D>(Root + "/Environment/ads.png");
            if (ads != null) { m.board.SetTexture("_BaseMap", ads); m.board.SetTextureScale("_BaseMap", new Vector2(4f, 1f)); }
            // Orlando Stadium look: grey concrete, blue-grey seats, glass boxes with a blue stripe, dark roof with white ribs
            m.stand = Mat("Stands", Lit, new Color(0.6f, 0.6f, 0.61f));
            m.stand.SetFloat("_Smoothness", 0.12f);
            m.seat = Mat("Seats", Lit, new Color(0.25f, 0.31f, 0.42f));
            m.seat.SetFloat("_Smoothness", 0.4f);
            m.glass = Mat("BoxGlass", Lit, new Color(0.12f, 0.17f, 0.22f));
            m.glass.SetFloat("_Metallic", 0.6f); m.glass.SetFloat("_Smoothness", 0.9f);
            m.accent = Mat("BlueStripe", Unlit, new Color(0.1f, 0.45f, 0.95f));
            m.tunnel = Mat("Tunnels", Lit, new Color(0.03f, 0.03f, 0.04f));
            m.tunnel.SetFloat("_Smoothness", 0f);
            m.roof = Mat("Roof", Lit, new Color(0.3f, 0.31f, 0.33f));
            m.roof.SetFloat("_Metallic", 0.3f); m.roof.SetFloat("_Smoothness", 0.35f);
            m.roofUnder = Mat("RoofUnder", Lit, new Color(0.17f, 0.18f, 0.2f));
            m.roofUnder.SetFloat("_Smoothness", 0.2f);
            m.rib = Mat("RoofRibs", Lit, new Color(0.93f, 0.94f, 0.96f));
            m.rib.SetFloat("_Smoothness", 0.5f);
            m.glow = Mat("FloodlightStrip", Unlit, new Color(1f, 0.98f, 0.92f));
            m.skin = Mat("CrowdSkin", Lit, new Color(0.8f, 0.6f, 0.46f));
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
            // turn the photo so a long stand faces the TV camera (adjust Rotation on the Sky material if you like)
            m.sky.SetFloat("_Rotation", 90f);
            return m;
        }

        // ---------------- character materials ----------------
        static string Norm(string s) => new string(s.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray()).TrimEnd("0123456789".ToCharArray());

        static Texture2D FindTex(string[] paths, string key, string suffix)
        {
            foreach (var p in paths)
            {
                string f = Path.GetFileNameWithoutExtension(p);
                if (!f.EndsWith(suffix)) continue;
                if (Norm(f.Substring(0, f.Length - suffix.Length)) == key) return AssetDatabase.LoadAssetAtPath<Texture2D>(p);
            }
            return null;
        }

        /// <summary>
        /// Gives every material of a character a proper URP material with its texture: the PNGs in
        /// Characters/Textures/&lt;name&gt; (named after the material) or, for new characters, the textures
        /// embedded in the FBX, extracted on the first run.
        /// </summary>
        static void CharacterMaterials(string fbx)
        {
            var mi = AssetImporter.GetAtPath(fbx) as ModelImporter;
            if (mi == null) return;
            string name = Path.GetFileNameWithoutExtension(fbx);
            string texDir = $"{Root}/Characters/Textures/{name}";
            if (!AssetDatabase.IsValidFolder(texDir))
            {
                Directory.CreateDirectory(texDir);
                mi.ExtractTextures(texDir);
                AssetDatabase.Refresh();
            }
            var texPaths = AssetDatabase.FindAssets("t:Texture2D", new[] { texDir }).Select(AssetDatabase.GUIDToAssetPath).ToArray();
            string matDir = Gen + "/Characters";
            Directory.CreateDirectory(matDir);
            bool changed = false;
            foreach (var src in AssetDatabase.LoadAllAssetsAtPath(fbx).OfType<Material>().ToArray())
            {
                string key = Norm(src.name);
                Texture2D col = FindTex(texPaths, key, "_color");
                if (col == null) col = src.mainTexture as Texture2D;
                Texture2D nrm = FindTex(texPaths, key, "_normal");
                string lower = src.name.ToLowerInvariant();
                bool face = lower.Contains("eye") || lower.Contains("brow") || lower.Contains("mouth") || lower.Contains("lash");
                bool lens = lower.Contains("lens") || lower.Contains("glass");
                var m = Mat($"Characters/{name}_{src.name}", Lit, Color.white);
                if (col != null) m.SetTexture("_BaseMap", col);
                if (nrm != null) { m.SetTexture("_BumpMap", nrm); m.EnableKeyword("_NORMALMAP"); }
                m.SetFloat("_Smoothness", 0.28f);
                if (face) AlphaClip(m, false);
                if (lens) { m.color = new Color(1f, 1f, 1f, 0f); AlphaClip(m, false); }
                mi.AddRemap(new AssetImporter.SourceAssetIdentifier(src), m);
                changed = true;
            }
            if (changed) mi.SaveAndReimport();
        }

        /// <summary>
        /// A prefab of the character with its URP materials put on every renderer directly, so the textures
        /// show even if the FBX material remap did not take.
        /// </summary>
        static GameObject CharacterPrefab(string fbx)
        {
            var src = AssetDatabase.LoadAssetAtPath<GameObject>(fbx);
            if (src == null) return null;
            string name = Path.GetFileNameWithoutExtension(fbx);
            string texDir = $"{Root}/Characters/Textures/{name}";
            var texPaths = AssetDatabase.IsValidFolder(texDir)
                ? AssetDatabase.FindAssets("t:Texture2D", new[] { texDir }).Select(AssetDatabase.GUIDToAssetPath).ToArray()
                : new string[0];
            var inst = (GameObject)PrefabUtility.InstantiatePrefab(src);
            try
            {
                foreach (var r in inst.GetComponentsInChildren<Renderer>(true))
                {
                    var ms = r.sharedMaterials;
                    for (int i = 0; i < ms.Length; i++)
                    {
                        if (ms[i] == null) continue;
                        string mname = ms[i].name.Replace(" (Instance)", "");
                        if (mname.StartsWith(name + "_")) mname = mname.Substring(name.Length + 1);
                        string key = Norm(mname);
                        Texture2D col = FindTex(texPaths, key, "_color");
                        if (col == null) col = ms[i].HasProperty("_BaseMap") ? ms[i].GetTexture("_BaseMap") as Texture2D : ms[i].mainTexture as Texture2D;
                        Texture2D nrm = FindTex(texPaths, key, "_normal");
                        string lower = mname.ToLowerInvariant();
                        bool face = lower.Contains("eye") || lower.Contains("brow") || lower.Contains("mouth") || lower.Contains("lash");
                        bool lens = lower.Contains("lens") || lower.Contains("glass");
                        var m = Mat($"Characters/{name}_{mname}", Lit, Color.white);
                        if (col != null) m.SetTexture("_BaseMap", col);
                        else Debug.LogWarning($"ArenaMix: sin textura para {name} / {mname}");
                        if (nrm != null) { m.SetTexture("_BumpMap", nrm); m.EnableKeyword("_NORMALMAP"); }
                        m.SetFloat("_Smoothness", 0.28f);
                        if (face) AlphaClip(m, false);
                        if (lens) { m.color = new Color(1f, 1f, 1f, 0f); AlphaClip(m, false); }
                        ms[i] = m;
                    }
                    r.sharedMaterials = ms;
                }
                string path = $"{Gen}/Characters/{name}.prefab";
                return PrefabUtility.SaveAsPrefabAsset(inst, path);
            }
            finally
            {
                Object.DestroyImmediate(inst);
            }
        }

        // ---------------- image quality ----------------
        static void CameraQuality(Camera cam)
        {
            var data = cam.GetUniversalAdditionalCameraData();
            if (data == null) return;
            data.renderPostProcessing = true;
            data.antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            data.antialiasingQuality = AntialiasingQuality.High;
        }

        /// <summary>Film-like look: ACES tonemapping, soft bloom on the floodlights, a touch of contrast and vignette.</summary>
        static void PostFX()
        {
            string path = Gen + "/PostFX.asset";
            AssetDatabase.DeleteAsset(path);
            var profile = ScriptableObject.CreateInstance<VolumeProfile>();
            AssetDatabase.CreateAsset(profile, path);
            var tm = profile.Add<Tonemapping>(true); tm.mode.Override(TonemappingMode.ACES);
            var bloom = profile.Add<Bloom>(true); bloom.intensity.Override(0.45f); bloom.threshold.Override(1.05f); bloom.scatter.Override(0.65f);
            var ca = profile.Add<ColorAdjustments>(true); ca.postExposure.Override(0.35f); ca.contrast.Override(14f); ca.saturation.Override(6f);
            var vg = profile.Add<Vignette>(true); vg.intensity.Override(0.2f); vg.smoothness.Override(0.45f);
            foreach (var c in profile.components) { c.hideFlags = HideFlags.HideInInspector | HideFlags.HideInHierarchy; AssetDatabase.AddObjectToAsset(c, profile); }
            EditorUtility.SetDirty(profile);
            var go = new GameObject("PostFX");
            var vol = go.AddComponent<Volume>();
            vol.isGlobal = true;
            vol.priority = 10f;
            vol.sharedProfile = profile;
        }

        /// <summary>Longer, sharper shadows, HDR and 4x MSAA on the URP quality assets.</summary>
        static void PipelineQuality()
        {
            foreach (var guid in AssetDatabase.FindAssets("t:UniversalRenderPipelineAsset"))
            {
                var a = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(AssetDatabase.GUIDToAssetPath(guid));
                if (a == null) continue;
                bool mobile = a.name.ToLowerInvariant().Contains("mobile");
                a.supportsHDR = true;
                a.shadowDistance = mobile ? 70f : 110f;
                a.shadowCascadeCount = mobile ? 2 : 4;
                a.msaaSampleCount = mobile ? 2 : 4;
                EditorUtility.SetDirty(a);
            }
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
                    light.intensity = 1.15f;
                    light.color = new Color(1f, 0.96f, 0.9f);
                    light.shadows = LightShadows.Soft;
                    go.transform.rotation = Quaternion.Euler(52f, -35f, 0f);
                }
                var cam = go.GetComponent<Camera>();
                if (cam != null)
                {
                    // TV gantry in the main stand of the full-size stadium
                    cam.transform.position = new Vector3(0f, 24f, -70f);
                    cam.transform.rotation = Quaternion.Euler(18f, 0f, 0f);
                    cam.fieldOfView = 24f;
                    cam.farClipPlane = 3000f;
                    CameraQuality(cam);
                }
            }
            RenderSettings.skybox = mats.sky;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.78f, 0.84f, 0.95f);
            RenderSettings.ambientEquatorColor = new Color(0.5f, 0.56f, 0.55f);
            RenderSettings.ambientGroundColor = new Color(0.22f, 0.32f, 0.2f);
            // haze that blends the far grass into the stadium photo
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogColor = new Color(0.6f, 0.64f, 0.68f);
            RenderSettings.fogStartDistance = 250f;
            RenderSettings.fogEndDistance = 1400f;

            var match = new GameObject("Match");
            match.AddComponent<GameInput>();
            var mm = match.AddComponent<MatchManager>();
            mm.characterModels = Characters()
                .Select(CharacterPrefab)
                .Where(g => g != null).ToArray();
            mm.controller = controller;
            mm.pitchLight = mats.pitchLight; mm.pitchDark = mats.pitchDark; mm.lineMat = mats.line;
            mm.postMat = mats.post; mm.netMat = mats.net; mm.boardMat = mats.board; mm.standMat = mats.stand;
            mm.ballMat = mats.ball; mm.ringMat = mats.ring;
            mm.seatMat = mats.seat; mm.roofMat = mats.roof; mm.glowMat = mats.glow; mm.skinMat = mats.skin; mm.apronMat = mats.apron;
            mm.glassMat = mats.glass; mm.accentMat = mats.accent; mm.tunnelMat = mats.tunnel; mm.roofUnderMat = mats.roofUnder; mm.ribMat = mats.rib;
            PostFX();
            PipelineQuality();
            if (mm.characterModels.Length == 0) Debug.LogWarning("ArenaMix: no encuentro los personajes en " + Root + "/Characters");

            string path = Gen + "/Partido.unity";
            EditorSceneManager.SaveScene(scene, path);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(path, true) };
        }
    }
}
