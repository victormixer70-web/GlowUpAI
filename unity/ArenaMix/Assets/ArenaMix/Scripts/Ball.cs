using UnityEngine;

namespace ArenaMix
{
    /// <summary>
    /// The match ball: real rigidbody physics (bounces off posts, boards and players), a curve from spin
    /// (Magnus effect) and close control: while a player owns it, it is steered just in front of their feet.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public class Ball : MonoBehaviour
    {
        public const float Radius = 0.11f;

        public Footballer Owner { get; private set; }
        public Keeper HeldBy { get; private set; }
        public Footballer LastTouch { get; private set; }
        public Rigidbody Body { get; private set; }

        float noPickup;
        Vector3 spin;

        void Awake()
        {
            Body = GetComponent<Rigidbody>();
            Body.mass = 0.43f;
            Body.SetDamping(0.12f, 0.6f);
            Body.interpolation = RigidbodyInterpolation.Interpolate;
            Body.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
        }

        public bool CanPickUp => noPickup <= 0f && Owner == null && HeldBy == null;

        public void SetOwner(Footballer f)
        {
            Owner = f;
            if (f != null) { LastTouch = f; HeldBy = null; Body.isKinematic = false; }
        }

        public void Hold(Keeper k)
        {
            Owner = null;
            HeldBy = k;
            spin = Vector3.zero;
            Body.isKinematic = true;
        }

        /// <summary>Strikes the ball. dir is flattened; lift is the upward speed; curve bends it left (+) or right (-).</summary>
        public void Kick(Footballer by, Vector3 dir, float speed, float lift, float curve)
        {
            Owner = null;
            HeldBy = null;
            Body.isKinematic = false;
            if (by != null) LastTouch = by;
            noPickup = 0.3f;
            dir = dir.Flat().normalized;
            Body.SetVelocity(dir * speed + Vector3.up * lift);
            spin = Vector3.up * curve;
            Body.angularVelocity = Vector3.Cross(Vector3.up, dir) * (speed / Radius) * 0.5f;
        }

        /// <summary>Free kick of the ball by the goalkeeper or a deflection.</summary>
        public void Release(Vector3 velocity)
        {
            Owner = null;
            HeldBy = null;
            Body.isKinematic = false;
            noPickup = 0.4f;
            spin = Vector3.zero;
            Body.SetVelocity(velocity);
        }

        public void ResetAt(Vector3 p)
        {
            Owner = null;
            HeldBy = null;
            Body.isKinematic = false;
            spin = Vector3.zero;
            Body.position = p;
            transform.position = p;
            Body.SetVelocity(Vector3.zero);
            Body.angularVelocity = Vector3.zero;
            noPickup = 0.2f;
        }

        void FixedUpdate()
        {
            float dt = Time.fixedDeltaTime;
            noPickup -= dt;
            if (HeldBy != null)
            {
                Body.MovePosition(HeldBy.HandsPosition);
                return;
            }
            if (Owner != null)
            {
                // close control: the ball rolls a stride ahead of the feet and follows every turn
                Vector3 pv = Owner.Velocity;
                Vector3 target = Owner.transform.position + Owner.transform.forward * (0.55f + pv.magnitude * 0.05f) + pv * 0.06f;
                target.y = Radius;
                Vector3 v = (target - Body.position) * 12f + pv;
                v.y = Mathf.Min(Body.GetVelocity().y, 0f);
                Body.SetVelocity(v);
                Body.angularVelocity = Vector3.Cross(Vector3.up, pv) / Radius;
                return;
            }
            // curve while in the air or rolling fast, fading with time
            Vector3 vel = Body.GetVelocity();
            if (spin.sqrMagnitude > 0.0001f && vel.sqrMagnitude > 4f)
            {
                Body.AddForce(Vector3.Cross(spin, vel) * 0.012f, ForceMode.VelocityChange);
                spin *= Mathf.Exp(-0.6f * dt);
            }
            // grass rolling resistance
            if (Body.position.y < Radius + 0.02f)
                Body.SetVelocity(new Vector3(vel.x * (1f - 0.55f * dt), vel.y, vel.z * (1f - 0.55f * dt)));
        }
    }
}
