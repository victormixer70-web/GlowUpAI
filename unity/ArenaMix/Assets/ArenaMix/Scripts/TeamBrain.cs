using UnityEngine;

namespace ArenaMix
{
    /// <summary>
    /// CPU field player for any mode, for your teammates and for the rivals. With the ball it dribbles at
    /// goal, dodges, passes to a free teammate when pressed and shoots from good positions. When its team has
    /// the ball it makes runs into space; when the other team has it, the nearest player presses and slides in
    /// while the rest hold a shape between the ball and their goal. It writes an <see cref="Intent"/> like the
    /// touch controls do, so it plays by exactly the same rules as you. It stays quiet while you control it.
    /// </summary>
    [DefaultExecutionOrder(-50)]
    public class TeamBrain : MonoBehaviour
    {
        [Range(0f, 1f)] public float skill = 0.55f;

        MatchManager match;
        Footballer me;
        float shootHold = -1f, aimSide, dodgeSide = 1f, dodgeTimer, passCooldown;

        public void Init(MatchManager m, Footballer f)
        {
            match = m; me = f;
        }

        static Vector2 Toward(Vector3 d, float slowRadius = 1f) =>
            d.magnitude > 0.2f ? new Vector2(d.x, d.z).normalized * Mathf.Clamp01(d.magnitude / slowRadius) : Vector2.zero;

        void Update()
        {
            if (match == null || me == null || me.IsHuman) { shootHold = -1f; return; }
            float dt = Time.deltaTime;
            passCooldown -= dt;
            var it = new Intent();
            if (!match.Playing) { me.Intent = it; shootHold = -1f; return; }

            Ball ball = match.Ball;
            Vector3 pos = me.transform.position, bp = ball.transform.position;
            Vector3 goal = match.GoalCenter(1 - me.Team), ownGoal = match.GoalCenter(me.Team);
            float L = match.length, hw = match.HalfWidth;
            int n = match.Players(me.Team).Count, slot = match.Slot(me);
            float lane = n <= 1 ? 0f : MatchManager.Formation(n, slot).y;

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

            Footballer owner = ball.Owner;
            if (me.HasBall)
            {
                Vector3 toGoal = (goal - pos).Flat();
                float dg = toGoal.magnitude;
                Vector3 dir = toGoal.normalized;
                Footballer opp = match.NearestPlayer(1 - me.Team, pos);
                Vector3 toOpp = opp != null ? (opp.transform.position - pos).Flat() : Vector3.one * 99f;
                dodgeTimer -= dt;
                if (dodgeTimer <= 0f) { dodgeSide = Random.value < 0.5f ? -1f : 1f; dodgeTimer = Random.Range(0.8f, 1.6f); }
                if (toOpp.magnitude < 4.5f && Vector3.Dot(toOpp.normalized, dir) > 0.2f)
                    dir = (dir + Vector3.Cross(Vector3.up, toOpp.normalized) * dodgeSide * 1.3f).normalized;
                // keep away from the boards
                if (Mathf.Abs(pos.z) > hw - 3f) dir = (dir + new Vector3(0f, 0f, -Mathf.Sign(pos.z))).normalized;
                it.move = new Vector2(dir.x, dir.z);
                it.sprint = toOpp.magnitude > 3f && dg > L * 0.2f;

                // pass when pressed, or to a teammate in a clearly better spot
                if (n > 1 && passCooldown <= 0f)
                {
                    Footballer best = null; float bestGain = 0f;
                    foreach (var mate in match.Players(me.Team))
                    {
                        if (mate == me) continue;
                        Vector3 mp = mate.transform.position;
                        float gain = dg - (goal - mp).Flat().magnitude;            // metres closer to goal
                        float free = match.Pressure(me.Team, mp);
                        if (free < 2.5f || match.LaneBlocked(me, pos, mp)) continue;
                        float sc = gain * 0.15f + Mathf.Min(free, 7f) * 0.3f;
                        if (sc > bestGain) { bestGain = sc; best = mate; }
                    }
                    bool pressed = toOpp.magnitude < 2.6f;
                    float rate = best == null ? 0f : (pressed ? 2.2f : 0.35f) * (0.5f + bestGain * 0.4f);
                    if (best != null && Random.value < dt * rate * (0.6f + skill))
                    {
                        Vector3 pd = (best.transform.position - pos).Flat().normalized;
                        it.move = new Vector2(pd.x, pd.z);
                        it.passDown = true;
                        passCooldown = 1.2f;
                        me.Intent = it;
                        return;
                    }
                }

                if (toOpp.magnitude < 2.4f && Random.value < dt * (0.6f + skill)) it.actionDown = true;
                float near = Mathf.Min(11f, L * 0.24f), far = Mathf.Min(18f, L * 0.36f);
                float shootRate = dg < near ? 2.8f : dg < far ? 0.9f : 0f;
                if (Random.value < dt * shootRate * (0.6f + skill))
                {
                    shootHold = Random.Range(0.2f, 0.75f);
                    aimSide = Random.value < 0.5f ? -0.9f : 0.9f;
                    it.shootHeld = true;
                }
            }
            else if (owner != null && owner.Team == me.Team)
            {
                // support: run ahead of the ball carrier into my lane
                Vector3 attack = (goal - ownGoal).Flat().normalized;
                Vector3 spot = owner.transform.position + attack * L * (slot % 2 == 0 ? 0.16f : 0.1f);
                spot.z = Mathf.Abs(lane) > 0.01f ? lane * hw * 0.75f : (owner.transform.position.z > 0f ? -hw * 0.4f : hw * 0.4f);
                spot = match.ClampToField(spot, -2.5f);
                Vector3 d = (spot - pos).Flat();
                it.move = Toward(d, 1.5f);
                it.sprint = d.magnitude > 6f;
            }
            else if (ball.HeldBy != null)
            {
                // a goalkeeper has it: take up a position
                bool ours = ball.HeldBy.Team == me.Team;
                Vector3 spot = ours ? Vector3.Lerp(ownGoal, goal, 0.42f) : Vector3.Lerp(ownGoal, goal, 0.22f + 0.1f * slot);
                spot.z = (Mathf.Abs(lane) > 0.01f ? lane : (ours ? 0.35f : 0f)) * hw;
                Vector3 d = (spot - pos).Flat();
                it.move = Toward(d, 1.5f);
            }
            else
            {
                // the other team has it, or it is loose: the nearest of us goes for it, the rest hold the shape
                Footballer chaser = match.NearestPlayer(me.Team, bp + ball.Body.GetVelocity().Flat() * 0.3f);
                bool iChase = chaser == me || (chaser != null && chaser.IsHuman && owner == null && n > 1 &&
                              match.NearestPlayer(me.Team, bp, chaser) == me && (bp - pos).Flat().magnitude < 6f);
                if (iChase || n == 1)
                {
                    if (owner != null)
                    {
                        // stand goal-side of the ball carrier, then slide in
                        Vector3 mark = owner.transform.position + (ownGoal - owner.transform.position).Flat().normalized * 1.3f;
                        Vector3 d = (mark - pos).Flat();
                        it.move = Toward(d);
                        it.sprint = d.magnitude > 3.5f;
                        float db = (bp - pos).Flat().magnitude;
                        if (db < 2.3f && Random.value < dt * (0.5f + skill * 1.2f)) it.actionDown = true;
                    }
                    else
                    {
                        Vector3 tgt = bp + ball.Body.GetVelocity().Flat() * 0.35f;
                        Vector3 d = (tgt - pos).Flat();
                        it.move = d.magnitude > 0.1f ? new Vector2(d.x, d.z).normalized : Vector2.zero;
                        it.sprint = d.magnitude > 5f;
                    }
                }
                else
                {
                    // shape: between the ball and our goal, in my lane, marking the nearest free attacker a little
                    Vector3 spot = Vector3.Lerp(ownGoal, bp, slot == n - 1 && n >= 3 ? 0.4f : 0.6f);
                    spot.z = Mathf.Lerp(lane * hw * 0.7f, bp.z, 0.3f);
                    Footballer threat = match.NearestPlayer(1 - me.Team, spot);
                    if (threat != null && threat != owner && (threat.transform.position - spot).Flat().magnitude < 8f)
                        spot = Vector3.Lerp(spot, threat.transform.position + (ownGoal - threat.transform.position).Flat().normalized * 1.5f, 0.6f);
                    spot = match.ClampToField(spot, -1.5f);
                    Vector3 d = (spot - pos).Flat();
                    it.move = Toward(d, 2f);
                    it.sprint = d.magnitude > 7f;
                }
            }
            me.Intent = it;
        }
    }
}
