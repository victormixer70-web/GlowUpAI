using System.IO;
using UnityEditor;
using UnityEngine;

namespace ArenaMix.EditorTools
{
    /// <summary>
    /// Import settings for everything under Assets/ArenaMix, applied automatically:
    /// characters and Mixamo animations as Humanoid (so any clip plays on any character),
    /// looping for the run/idle cycles, motion kept in place (the game moves the players),
    /// and the right texture types for the grass normal map, the sky and the generated sprites.
    /// </summary>
    public class ArenaMixImporter : AssetPostprocessor
    {
        public const string Root = "Assets/ArenaMix";

        // clips that repeat while they play
        static readonly string[] Loops =
        {
            "offensive idle", "jog forward", "jog backward", "jog strafe left", "jog strafe right",
            "goalkeeper idle", "goalkeeper sidestep", "goalkeeper sidestep (2)"
        };

        void OnPreprocessModel()
        {
            if (!assetPath.StartsWith(Root + "/")) return;
            var mi = assetImporter as ModelImporter;
            if (mi == null) return;
            if (assetPath.Contains("/Environment/Estadio/"))
            {
                // static stadium: readable for the mesh colliders, materials set by the setup
                mi.isReadable = true;
                mi.materialImportMode = ModelImporterMaterialImportMode.None;
                mi.importAnimation = false;
                mi.importCameras = false;
                mi.importLights = false;
                return;
            }
            bool isChar = assetPath.Contains("/Characters/"), isAnim = assetPath.Contains("/Animations/");
            if (!isChar && !isAnim) return;
            mi.animationType = ModelImporterAnimationType.Human;
            mi.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            mi.importCameras = false;
            mi.importLights = false;
            if (isChar)
            {
                mi.importAnimation = false;
                mi.materialImportMode = ModelImporterMaterialImportMode.ImportViaMaterialDescription;
            }
            else
            {
                mi.importAnimation = true;
                mi.importBlendShapes = false;
                mi.materialImportMode = ModelImporterMaterialImportMode.None;
            }
        }

        void OnPreprocessAnimation()
        {
            if (!assetPath.StartsWith(Root + "/Animations/")) return;
            var mi = assetImporter as ModelImporter;
            if (mi == null) return;
            string file = Path.GetFileNameWithoutExtension(assetPath);
            bool loop = System.Array.IndexOf(Loops, file) >= 0;
            var clips = mi.defaultClipAnimations;
            foreach (var c in clips)
            {
                c.name = file;
                c.loopTime = loop;
                c.loopPose = loop;
                // turning and height stay in the pose; travel over the ground is dropped (in place)
                c.lockRootRotation = true;
                c.keepOriginalOrientation = true;
                c.lockRootHeightY = true;
                c.keepOriginalPositionY = true;
                c.lockRootPositionXZ = false;
            }
            mi.clipAnimations = clips;
        }

        void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith(Root + "/")) return;
            var ti = assetImporter as TextureImporter;
            if (ti == null) return;
            string name = Path.GetFileNameWithoutExtension(assetPath).ToLowerInvariant();
            if (name.Contains("normal")) ti.textureType = TextureImporterType.NormalMap;
            if (assetPath.Contains("/Environment/new_football_map/")) { ti.maxTextureSize = 4096; ti.alphaIsTransparency = true; }
            if (assetPath.Contains("/Generated/"))
            {
                ti.alphaIsTransparency = true;
                ti.wrapMode = TextureWrapMode.Clamp;
                if (name.Contains("net")) ti.wrapMode = TextureWrapMode.Repeat;
            }
            if (assetPath.EndsWith(".hdr"))
            {
                ti.mipmapEnabled = false;
                ti.wrapModeU = TextureWrapMode.Repeat;
                ti.wrapModeV = TextureWrapMode.Clamp;
            }
        }
    }
}
