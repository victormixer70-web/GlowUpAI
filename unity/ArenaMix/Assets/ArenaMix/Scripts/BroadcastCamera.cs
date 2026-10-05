using UnityEngine;

namespace ArenaMix
{
    /// <summary>
    /// TV-style camera from the main stand: follows the ball along the pitch, leans towards where
    /// play is going and pushes in a little when the ball is near you.
    /// </summary>
    public class BroadcastCamera : MonoBehaviour
    {
        public MatchManager match;
        public float height = 11.5f;
        public float distance = 19f;
        public float fov = 30f;
        public float lookHeight = 0.6f;
        public float maxX = 999f;            // how far along the pitch the camera may travel
        public bool avoidGeometry;           // stay in front of the stadium model (its mesh colliders)

        Vector3 vel, lookVel, look;

        void Start()
        {
            var cam = GetComponent<Camera>();
            if (cam != null) { cam.fieldOfView = fov; cam.nearClipPlane = 0.3f; cam.farClipPlane = 3000f; }
            if (match != null && match.Ball != null) look = match.Ball.transform.position;
            Snap();
        }

        Vector3 Want(out Vector3 lookAt)
        {
            Vector3 b = match.Ball.transform.position;
            Vector3 bv = match.Ball.Body.GetVelocity().Flat();
            float hx = Mathf.Min(match.length * 0.5f - 5f, maxX);
            float x = Mathf.Clamp(b.x + bv.x * 0.3f, -hx, hx);
            float z = b.z * 0.3f;
            float lx = Mathf.Clamp(b.x + bv.x * 0.3f, -match.length * 0.5f + 4f, match.length * 0.5f - 4f);
            lookAt = new Vector3(lx, lookHeight, b.z * 0.7f - 1f);
            var pos = new Vector3(x, height, -match.width * 0.5f - distance + z);
            if (avoidGeometry)
            {
                // something of the stadium between the play and the camera: move in front of it
                Vector3 d = pos - lookAt;
                float best = d.magnitude;
                foreach (var h in Physics.RaycastAll(lookAt, d.normalized, best, ~0, QueryTriggerInteraction.Ignore))
                    if (h.collider is MeshCollider && h.distance < best) best = h.distance;
                if (best < d.magnitude) pos = lookAt + d.normalized * Mathf.Max(4f, best - 0.8f);
            }
            return pos;
        }

        void Snap()
        {
            if (match == null || match.Ball == null) return;
            transform.position = Want(out look);
            transform.LookAt(look);
        }

        void LateUpdate()
        {
            if (match == null || match.Ball == null) return;
            Vector3 want = Want(out Vector3 la);
            transform.position = Vector3.SmoothDamp(transform.position, want, ref vel, 0.35f, Mathf.Infinity, Time.unscaledDeltaTime);
            look = Vector3.SmoothDamp(look, la, ref lookVel, 0.25f, Mathf.Infinity, Time.unscaledDeltaTime);
            transform.LookAt(look);
        }
    }
}
