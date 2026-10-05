using UnityEngine;

namespace ArenaMix
{
    /// <summary>
    /// A field player, human or CPU: runs, dribbles, charges and strikes shots, does skill bursts and
    /// slide tackles, and drives the Mixamo animations (locomotion blend tree + one-shot actions).
    /// What it does each frame comes from <see cref="Intent"/>.
    /// </summary>
    public class Footballer : MonoBehaviour
    {
        [Header("Speeds (m/s)")]
        public float runSpeed = 5.4f;
        public float sprintSpeed = 7.6f;
        public float accel = 26f;
        public float turnSpeed = 900f;

        public int Team { get; private set; }
        public bool IsHuman { get; private set; }
        public Intent Intent;
        public Vector3 Velocity { get; private set; }
        public float Charge { get; private set; }
        public bool HasBall => match != null && match.Ball.Owner == this;

        MatchManager match;
        Animator anim;
        bool charging;
        float actionLock, stunned, burst, lunge, kickTimer, kickPower;
        Vector3 kickDir, lungeDir;
        float kickCurve, kickSpeed, kickLift;

        static readonly int MoveX = Animator.StringToHash("MoveX");
        static readonly int MoveZ = Animator.StringToHash("MoveZ");
        static readonly int AnimSpeed = Animator.StringToHash("AnimSpeed");
        static readonly int KeeperParam = Animator.StringToHash("Keeper");

        public void Init(MatchManager m, int team, bool human, Animator a)
        {
            match = m; Team = team; IsHuman = human; anim = a;
            if (anim != null) anim.SetBool(KeeperParam, false);
        }

        public void SetHuman(bool human) => IsHuman = human;

        public void Stun(float t)
        {
            stunned = Mathf.Max(stunned, t);
            charging = false;
            Charge = 0f;
        }

        public void ResetState()
        {
            Velocity = Vector3.zero;
            charging = false; Charge = 0f;
            actionLock = stunned = burst = lunge = 0f;
            kickTimer = -1f;
        }

        void Update()
        {
            if (match == null || !match.Playing) { Animate(Time.deltaTime); return; }
            float dt = Time.deltaTime;
            actionLock -= dt; stunned -= dt; burst -= dt;
            Ball ball = match.Ball;
            Vector3 pos = transform.position;
            Vector3 feetToBall = (ball.transform.position - pos).Flat();

            // ---------- movement ----------
            Vector3 want = new Vector3(Intent.move.x, 0f, Intent.move.y);
            float mag = Mathf.Clamp01(want.magnitude);
            float top = Intent.sprint ? sprintSpeed : runSpeed;
            if (HasBall) top *= 0.9f;
            if (burst > 0f) top += 2.6f;
            if (charging) top *= 0.55f;
            if (stunned > 0f) mag = 0f;
            Vector3 target = mag > 0.05f ? want.normalized * top * mag : Vector3.zero;
            if (lunge > 0f)
            {
                lunge -= dt;
                target = lungeDir * Mathf.Lerp(2f, 9f, lunge / 0.55f);
                Velocity = target;
                TryTackle(ball, feetToBall);
            }
            else if (actionLock > 0f && kickTimer > 0f) target *= 0.35f;
            Velocity = Vector3.MoveTowards(Velocity, target, (target.sqrMagnitude > Velocity.sqrMagnitude ? accel : accel * 1.3f) * dt);
            pos += Velocity * dt;
            pos = match.ClampToField(pos, 1.2f);
            transform.position = pos;

            // facing: where you move; otherwise towards the ball
            Vector3 face = mag > 0.1f && lunge <= 0f ? want : (HasBall ? transform.forward : feetToBall);
            if (face.sqrMagnitude > 0.0001f)
                transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(face.normalized), turnSpeed * dt);

            // ---------- ball ----------
            if (!HasBall && stunned <= 0f && lunge <= 0f && ball.CanPickUp && feetToBall.magnitude < 0.85f && ball.transform.position.y < 0.7f)
                ball.SetOwner(this);

            // charge and strike
            bool nearBall = HasBall || (ball.CanPickUp && feetToBall.magnitude < 1.5f);
            if (Intent.shootHeld && !charging && actionLock <= 0f && stunned <= 0f && nearBall)
            {
                charging = true; Charge = 0f;
            }
            if (charging)
            {
                Charge = Mathf.Min(1f, Charge + dt / 0.85f);
                if (!Intent.shootHeld) { Strike(); charging = false; }
                else if (!nearBall) { charging = false; Charge = 0f; }
            }
            if (kickTimer > 0f)
            {
                kickTimer -= dt;
                if (kickTimer <= 0f)
                {
                    Vector3 b = (ball.transform.position - transform.position).Flat();
                    if (b.magnitude < 1.9f && ball.HeldBy == null && (ball.Owner == null || ball.Owner == this))
                    {
                        ball.Kick(this, kickDir, kickSpeed, kickLift, kickCurve);
                    }
                    Charge = 0f;
                }
            }

            // pass to a teammate
            if (Intent.passDown && HasBall && actionLock <= 0f && stunned <= 0f && !charging) Pass();

            // skill burst with the ball, slide tackle without it
            if (Intent.actionDown && actionLock <= 0f && stunned <= 0f)
            {
                if (HasBall)
                {
                    burst = 0.4f;
                    actionLock = 0.5f;
                }
                else
                {
                    lungeDir = (feetToBall.magnitude < 6f && feetToBall.sqrMagnitude > 0.01f ? feetToBall.normalized : transform.forward);
                    transform.rotation = Quaternion.LookRotation(lungeDir);
                    lunge = 0.55f;
                    actionLock = 0.95f;
                    Play("Tackle", 0.12f);
                }
            }
            Animate(dt);
        }

        void Strike()
        {
            kickPower = 0.3f + 0.7f * Charge;
            Vector3 dir = transform.forward;
            Vector3 goal = match.GoalCenter(1 - Team);
            Vector3 toGoal = (goal - transform.position).Flat();
            Vector3 stick = new Vector3(Intent.move.x, 0f, Intent.move.y);
            if (Vector3.Dot(dir, toGoal.normalized) > 0.25f && toGoal.magnitude < Mathf.Min(32f, match.length * 0.45f))
            {
                // towards goal: the stick picks the side of the net
                float gh = match.goalWidth * 0.5f;
                float side = Mathf.Clamp(stick.z * (gh - 0.55f) + Random.Range(-0.7f, 0.7f) * (1.2f - Charge) * gh / 3.66f, -(gh - 0.35f), gh - 0.35f);
                dir = (new Vector3(goal.x, 0f, side) - transform.position).Flat().normalized;
            }
            else if (stick.sqrMagnitude > 0.04f) dir = stick.normalized;
            kickDir = dir;
            kickSpeed = 13f + 19f * kickPower;
            kickLift = 0.8f + 5.2f * kickPower * kickPower;
            kickCurve = Vector3.Dot(Vector3.Cross(Vector3.up, dir), stick) * 5f;
            transform.rotation = Quaternion.LookRotation(dir);
            kickTimer = 0.14f;
            actionLock = 0.45f;
            Play("Shoot", 0.3f);
        }

        /// <summary>Pass to the teammate the stick (or the body) points at, along the ground if the lane is clear.</summary>
        void Pass()
        {
            Vector3 stick = new Vector3(Intent.move.x, 0f, Intent.move.y);
            Vector3 aim = stick.sqrMagnitude > 0.04f ? stick.normalized : transform.forward;
            Footballer mate = match.PassTarget(this, aim);
            if (mate == null) return;
            Vector3 lead = mate.transform.position + mate.Velocity * 0.45f;
            Vector3 to = (lead - transform.position).Flat();
            float dist = to.magnitude;
            kickDir = to.normalized;
            bool blocked = match.LaneBlocked(this, transform.position, lead);
            kickSpeed = Mathf.Clamp(6f + dist * 0.95f, 9f, 24f) * (blocked ? 0.8f : 1f);
            kickLift = blocked ? Mathf.Clamp(dist * 0.35f, 3f, 7f) : 0.3f;
            kickCurve = 0f;
            transform.rotation = Quaternion.LookRotation(kickDir);
            kickTimer = 0.1f;
            actionLock = 0.35f;
            Play("Pass", 0.35f);
        }

        /// <summary>CPU teammates call this to pass.</summary>
        public void PassTo(Vector3 dir) { Intent.move = new Vector2(dir.x, dir.z); Intent.passDown = true; }

        void TryTackle(Ball ball, Vector3 feetToBall)
        {
            if (feetToBall.magnitude > 1.3f || ball.HeldBy != null) return;
            Footballer victim = ball.Owner;
            if (victim == this) return;
            if (victim != null)
            {
                if (Random.value < 0.8f)
                {
                    victim.Stun(0.7f);
                    ball.Release(lungeDir * 5.5f + Vector3.up * 0.4f);
                }
                else Stun(0.5f);
            }
            else ball.Release(lungeDir * 7f + Vector3.up * 0.3f);
            lunge = Mathf.Min(lunge, 0.15f);
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
            anim.SetFloat(AnimSpeed, sp > 2.4f ? Mathf.Clamp(sp / 2.6f, 1f, 2.1f) : 1f);
        }
    }
}
