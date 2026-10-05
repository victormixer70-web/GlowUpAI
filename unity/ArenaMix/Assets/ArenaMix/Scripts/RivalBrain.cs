using UnityEngine;

namespace ArenaMix
{
    /// <summary>
    /// CPU field player: chases loose balls, dribbles at goal and around you, shoots from good positions
    /// and, without the ball, marks goal-side and slides in. Writes an <see cref="Intent"/> like the
    /// touch controls do, so it plays by exactly the same rules as you.
    /// </summary>
    [DefaultExecutionOrder(-50)]
    public class RivalBrain : MonoBehaviour
    {
        [Range(0f, 1f)] public float skill = 0.55f;

        MatchManager match;
        Footballer me;
        float shootHold = -1f, aimSide, dodgeSide = 1f, dodgeTimer;

        public void Init(MatchManager m, Footballer f)
        {
            match = m; me = f;
        }

        void Update()
        {
            if (match == null || me == null) return;
            float dt = Time.deltaTime;
            var it = new Intent();
            if (!match.Playing) { me.Intent = it; shootHold = -1f; return; }

            Ball ball = match.Ball;
            Vector3 pos = me.transform.position, bp = ball.transform.position;
            Footballer opp = match.FieldPlayer(1 - me.Team);
            Vector3 goal = match.GoalCenter(1 - me.Team), ownGoal = match.GoalCenter(me.Team);

            // finishing a charged shot
            if (shootHold >= 0f)
            {
                shootHold -= dt;
                it.shootHeld = shootHold > 0f;
                Vector3 g = (goal - pos).Flat().normalized;
                it.move = new Vector2(g.x * 0.2f, aimSide);
                me.Intent = it;
                if (shootHold < 0f) shootHold = -1f;
                return;
            }

            if (me.HasBall)
            {
                Vector3 toGoal = (goal - pos).Flat();
                float dg = toGoal.magnitude;
                Vector3 dir = toGoal.normalized;
                Vector3 toOpp = (opp.transform.position - pos).Flat();
                dodgeTimer -= dt;
                if (dodgeTimer <= 0f) { dodgeSide = Random.value < 0.5f ? -1f : 1f; dodgeTimer = Random.Range(0.8f, 1.6f); }
                if (toOpp.magnitude < 4.5f && Vector3.Dot(toOpp.normalized, dir) > 0.2f)
                    dir = (dir + Vector3.Cross(Vector3.up, toOpp.normalized) * dodgeSide * 1.3f).normalized;
                // keep away from the boards
                if (Mathf.Abs(pos.z) > match.HalfWidth - 3f) dir = (dir + new Vector3(0f, 0f, -Mathf.Sign(pos.z))).normalized;
                it.move = new Vector2(dir.x, dir.z);
                it.sprint = toOpp.magnitude > 3f && dg > 10f;
                if (toOpp.magnitude < 2.4f && Random.value < dt * (0.6f + skill)) it.actionDown = true;
                float rate = dg < 11f ? 2.8f : dg < 18f ? 0.9f : 0f;
                if (Random.value < dt * rate * (0.6f + skill))
                {
                    shootHold = Random.Range(0.2f, 0.75f);
                    aimSide = Random.value < 0.5f ? -0.9f : 0.9f;
                    it.shootHeld = true;
                }
            }
            else if (ball.Owner == opp)
            {
                // defend: stand goal-side of the ball carrier, then slide in
                Vector3 mark = opp.transform.position + (ownGoal - opp.transform.position).Flat().normalized * 1.3f;
                Vector3 d = (mark - pos).Flat();
                it.move = d.magnitude > 0.2f ? new Vector2(d.x, d.z).normalized * Mathf.Clamp01(d.magnitude) : Vector2.zero;
                it.sprint = d.magnitude > 3.5f;
                float db = (bp - pos).Flat().magnitude;
                if (db < 2.3f && Random.value < dt * (0.5f + skill * 1.2f)) it.actionDown = true;
            }
            else if (ball.HeldBy != null)
            {
                // goalkeeper has it: take position
                bool ours = ball.HeldBy.Team == me.Team;
                Vector3 spot = ours ? Vector3.Lerp(ownGoal, goal, 0.45f) : Vector3.Lerp(ownGoal, goal, 0.25f);
                spot.z = ours ? 6f : 0f;
                Vector3 d = (spot - pos).Flat();
                it.move = d.magnitude > 0.5f ? new Vector2(d.x, d.z).normalized : Vector2.zero;
            }
            else
            {
                // loose ball: go where it is going
                Vector3 tgt = bp + ball.Body.GetVelocity().Flat() * 0.35f;
                Vector3 d = (tgt - pos).Flat();
                it.move = d.magnitude > 0.1f ? new Vector2(d.x, d.z).normalized : Vector2.zero;
                it.sprint = d.magnitude > 5f;
            }
            me.Intent = it;
        }
    }
}
