using UnityEngine;

namespace ArenaMix
{
    /// <summary>
    /// CPU goalkeeper: narrows the angle on the line between ball and goal, reads shots (with a human-like
    /// reaction delay), dives with the Mixamo diving-save clips, catches or parries, and restarts play
    /// with an overhand throw to a team-mate. Shots near the posts or very hard ones can beat him.
    /// </summary>
    public class Keeper : MonoBehaviour
    {
        [Range(0f, 1f)] public float skill = 0.7f;

        public int Team { get; private set; }
        public Vector3 HandsPosition => transform.position + Vector3.up * 1.15f + transform.forward * 0.35f;
        public Vector3 Velocity { get; private set; }

        MatchManager match;
        Animator anim;
        float goalX, facing;            // own goal line and which way the keeper faces (+1 / -1 on x)
        float diveTime, diveVel, recover, react = -1f, ignore, holdTime, throwTimer = -1f;
        Vector3 diveSide;

        static readonly int MoveX = Animator.StringToHash("MoveX");
        static readonly int MoveZ = Animator.StringToHash("MoveZ");
        static readonly int AnimSpeed = Animator.StringToHash("AnimSpeed");
        static readonly int KeeperParam = Animator.StringToHash("Keeper");

        public void Init(MatchManager m, int team, float goalLineX, Animator a)
        {
            match = m; Team = team; goalX = goalLineX; anim = a;
            facing = goalLineX < 0f ? 1f : -1f;
            if (anim != null) anim.SetBool(KeeperParam, true);
        }

        public void ResetState()
        {
            Velocity = Vector3.zero;
            diveTime = recover = ignore = holdTime = 0f;
            react = -1f; throwTimer = -1f;
            transform.position = new Vector3(goalX + facing * 0.8f, 0f, 0f);
            transform.rotation = Quaternion.LookRotation(new Vector3(facing, 0f, 0f));
        }

        void Update()
        {
            float dt = Time.deltaTime;
            if (match == null || !match.Playing) { Animate(dt); return; }
            Ball ball = match.Ball;
            Vector3 bp = ball.transform.position, bv = ball.Body.GetVelocity();
            Vector3 pos = transform.position;
            ignore -= dt; recover -= dt;

            // ---------- holding the ball: wait, then throw it out ----------
            if (ball.HeldBy == this)
            {
                Velocity = Vector3.zero;
                holdTime += dt;
                if (throwTimer < 0f && holdTime > 1.1f)
                {
                    throwTimer = 0.3f;
                    Play("GKThrow", 0.45f);
                }
                if (throwTimer > 0f)
                {
                    throwTimer -= dt;
                    if (throwTimer <= 0f) Distribute(ball);
                }
                Face((match.FieldPlayer(Team).transform.position - pos).Flat());
                Animate(dt);
                return;
            }
            holdTime = 0f; throwTimer = -1f;

            // ---------- diving ----------
            if (diveTime > 0f)
            {
                diveTime -= dt;
                pos += diveSide * diveVel * dt;
                diveVel = Mathf.MoveTowards(diveVel, 0f, 6f * dt);
                transform.position = ClampToGoal(pos);
                Velocity = Vector3.zero;
                TrySave(ball, bp, bv, true);
                if (diveTime <= 0f) recover = 0.55f;
                Animate(dt);
                return;
            }

            // ---------- positioning: on the line from the goal centre to the ball ----------
            Vector3 goalC = new Vector3(goalX, 0f, 0f);
            Vector3 toBall = (bp - goalC).Flat();
            float dist = toBall.magnitude;
            float advance = Mathf.Clamp(0.7f + (24f - dist) * 0.06f, 0.6f, 2.2f);
            Vector3 target = goalC + (dist > 0.01f ? toBall / dist : new Vector3(facing, 0f, 0f)) * advance;
            target.z = Mathf.Clamp(target.z, -3.1f, 3.1f);
            // loose ball close to goal: go and get it
            bool loose = ball.Owner == null && ball.HeldBy == null;
            if (loose && Mathf.Abs(bp.x - goalX) < 7f && Mathf.Abs(bp.z) < 8f && bv.magnitude < 6f) target = bp.Flat();
            Vector3 want = (target - pos).Flat();
            float maxSp = recover > 0f ? 0f : (want.magnitude > 2f ? 6f : 4.5f);
            Velocity = Vector3.MoveTowards(Velocity, Vector3.ClampMagnitude(want * 4f, maxSp), 30f * dt);
            pos += Velocity * dt;
            transform.position = ClampToGoal(pos);
            Face(toBall.sqrMagnitude > 0.01f ? toBall : new Vector3(facing, 0f, 0f));

            if (loose && (bp - transform.position).Flat().magnitude < 1.0f && bp.y < 1.8f && ignore <= 0f)
            {
                ball.Hold(this);
                Animate(dt);
                return;
            }

            // ---------- reading a shot ----------
            if (loose && ignore <= 0f && recover <= 0f)
            {
                float vx = bv.x;
                bool towards = vx * (goalX - bp.x) > 0f && Mathf.Abs(vx) > 5f;
                float t = towards ? (transform.position.x - bp.x) / vx : -1f;
                if (towards && t > 0f && t < 1.3f)
                {
                    float z = bp.z + bv.z * t, y = bp.y + bv.y * t - 4.9f * t * t;
                    if (Mathf.Abs(z) < 4.3f && y < 2.9f)
                    {
                        if (react < 0f) react = Mathf.Lerp(0.26f, 0.1f, skill) + Random.Range(0f, 0.08f);
                        react -= dt;
                        if (react <= 0f)
                        {
                            float dz = z - transform.position.z;
                            if (Mathf.Abs(dz) > 0.75f || y > 1.9f) Dive(dz, Mathf.Max(t, 0.25f));
                            react = -1f;
                        }
                    }
                }
                else react = -1f;
                TrySave(ball, bp, bv, false);
            }
            Animate(dt);
        }

        void Dive(float dz, float timeToBall)
        {
            diveSide = new Vector3(0f, 0f, Mathf.Sign(dz));
            float need = Mathf.Abs(dz) / timeToBall;
            diveVel = Mathf.Min(need * 1.05f, Mathf.Lerp(4.2f, 6.2f, skill));
            diveTime = 0.75f;
            // dive to the keeper's own left or right
            bool right = Vector3.Dot(transform.right, diveSide) > 0f;
            Play(right ? "DiveR" : "DiveL", 0.29f);
        }

        void TrySave(Ball ball, Vector3 bp, Vector3 bv, bool diving)
        {
            if (ball.Owner != null || ball.HeldBy != null || ignore > 0f) return;
            Vector3 a, b;
            if (diving) { a = transform.position + Vector3.up * 0.4f; b = a + diveSide * 1.9f + Vector3.up * 0.5f; }
            else { a = transform.position + Vector3.up * 0.25f; b = transform.position + Vector3.up * 2.15f; }
            Vector3 ab = b - a;
            float k = Mathf.Clamp01(Vector3.Dot(bp - a, ab) / ab.sqrMagnitude);
            float d = (bp - (a + ab * k)).magnitude;
            if (d > (diving ? 0.55f : 0.5f)) return;
            float sp = bv.magnitude;
            float chance = Mathf.Lerp(0.97f, 0.5f, Mathf.InverseLerp(12f, 30f, sp)) * Mathf.Lerp(0.8f, 1.05f, skill) * (diving ? Mathf.Lerp(1f, 0.75f, k) : 1f);
            ignore = 0.35f;
            if (Random.value > chance) return; // fumbled: the ball carries on
            if (sp < 19f && bp.y < 2.1f && Random.value < (diving ? 0.35f : 0.7f))
            {
                ball.Hold(this);
                Play("Catch", 0.35f);
                diveTime = Mathf.Min(diveTime, 0.2f);
            }
            else
            {
                // parry out wide and up, away from goal
                Vector3 outV = new Vector3(-bv.x * 0.25f + facing * 3f, Mathf.Abs(bv.y) * 0.3f + 2.5f, bv.z * 0.3f + (bp.z >= transform.position.z ? 1f : -1f) * 4f);
                ball.Release(outV);
                match.Flash("¡PARADÓN!");
            }
        }

        void Distribute(Ball ball)
        {
            Footballer mate = match.FieldPlayer(Team);
            Vector3 to = (mate.transform.position + mate.Velocity * 0.5f - transform.position).Flat();
            float dist = Mathf.Max(4f, to.magnitude);
            float h = Mathf.Clamp(dist * 1.1f, 8f, 17f);
            ball.Release(to.normalized * h + Vector3.up * Mathf.Clamp(dist * 0.18f, 2f, 5f));
            ignore = 0.6f;
        }

        Vector3 ClampToGoal(Vector3 p)
        {
            float lo = facing > 0 ? goalX + 0.2f : goalX - 7f, hi = facing > 0 ? goalX + 7f : goalX - 0.2f;
            p.x = Mathf.Clamp(p.x, lo, hi);
            p.z = Mathf.Clamp(p.z, -6f, 6f);
            p.y = 0f;
            return p;
        }

        void Face(Vector3 dir)
        {
            if (dir.sqrMagnitude < 0.0001f) return;
            transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(dir.normalized), 600f * Time.deltaTime);
        }

        void Play(string state, float startNormalized)
        {
            if (anim != null) anim.CrossFade(state, 0.08f, 0, startNormalized);
        }

        void Animate(float dt)
        {
            if (anim == null) return;
            Vector3 lv = transform.InverseTransformDirection(Velocity);
            float sp = Velocity.magnitude;
            Vector2 d = sp > 0.05f ? new Vector2(lv.x, lv.z).normalized * Mathf.Clamp01(sp / 1.2f) : Vector2.zero;
            anim.SetFloat(MoveX, d.x, 0.08f, dt);
            anim.SetFloat(MoveZ, d.y, 0.08f, dt);
            anim.SetFloat(AnimSpeed, sp > 2.4f ? Mathf.Clamp(sp / 2.6f, 1f, 1.8f) : 1f);
        }
    }
}
