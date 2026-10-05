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
        public float height = 14f;
        public float distance = 15f;
        public float fov = 42f;

        Vector3 vel, lookVel, look;

        void Start()
        {
            var cam = GetComponent<Camera>();
            if (cam != null) { cam.fieldOfView = fov; cam.nearClipPlane = 0.3f; cam.farClipPlane = 600f; }
            if (match != null && match.Ball != null) look = match.Ball.transform.position;
            Snap();
        }

        Vector3 Want(out Vector3 lookAt)
        {
            Vector3 b = match.Ball.transform.position;
            Vector3 bv = match.Ball.Body.GetVelocity().Flat();
            float hx = match.length * 0.5f - 9f;
            float x = Mathf.Clamp(b.x + bv.x * 0.25f, -hx, hx);
            float z = b.z * 0.35f;
            lookAt = new Vector3(x, 0.5f, b.z * 0.6f);
            return new Vector3(x, height, -match.width * 0.5f - distance + z);
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
