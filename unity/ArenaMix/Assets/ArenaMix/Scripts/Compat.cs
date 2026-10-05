using UnityEngine;

namespace ArenaMix
{
    /// <summary>
    /// Small helpers for the Unity 6 physics API renames (velocity -> linearVelocity, drag -> linearDamping,
    /// PhysicMaterial -> PhysicsMaterial), so gameplay code reads the same in every version.
    /// </summary>
    public static class Compat
    {
        public static Vector3 GetVelocity(this Rigidbody rb)
        {
#if UNITY_6000_0_OR_NEWER
            return rb.linearVelocity;
#else
            return rb.velocity;
#endif
        }

        public static void SetVelocity(this Rigidbody rb, Vector3 v)
        {
#if UNITY_6000_0_OR_NEWER
            rb.linearVelocity = v;
#else
            rb.velocity = v;
#endif
        }

        public static void SetDamping(this Rigidbody rb, float linear, float angular)
        {
#if UNITY_6000_0_OR_NEWER
            rb.linearDamping = linear;
            rb.angularDamping = angular;
#else
            rb.drag = linear;
            rb.angularDrag = angular;
#endif
        }

        /// <summary>Gives a collider a physics material with this bounce and friction.</summary>
        public static void SetBounce(Collider c, float bounciness, float friction)
        {
#if UNITY_6000_0_OR_NEWER
            var m = new PhysicsMaterial("ArenaMix") { bounciness = bounciness, dynamicFriction = friction, staticFriction = friction, bounceCombine = PhysicsMaterialCombine.Maximum, frictionCombine = PhysicsMaterialCombine.Average };
#else
            var m = new PhysicMaterial("ArenaMix") { bounciness = bounciness, dynamicFriction = friction, staticFriction = friction, bounceCombine = PhysicMaterialCombine.Maximum, frictionCombine = PhysicMaterialCombine.Average };
#endif
            c.sharedMaterial = m;
        }

        /// <summary>Flattens a vector onto the pitch (y = 0).</summary>
        public static Vector3 Flat(this Vector3 v) => new Vector3(v.x, 0f, v.z);
    }
}
