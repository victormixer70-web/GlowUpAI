using UnityEngine;

namespace ArenaMix
{
    /// <summary>Inside each goal: a ball entering it is a goal for the attacking team.</summary>
    public class GoalTrigger : MonoBehaviour
    {
        public MatchManager match;
        public int scoringTeam;

        void OnTriggerEnter(Collider other)
        {
            if (match != null && other.GetComponent<Ball>() != null) match.OnGoal(scoringTeam);
        }
    }
}
