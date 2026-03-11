import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * EnrollmentCheck — Auto-enrolls new users based on pending Invite records.
 * Runs on app mount and checks if current user has a matching invite.
 * If found, assigns team, role, and positions, then marks invite as accepted.
 */
export default function EnrollmentCheck({ children }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const performEnrollment = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setChecked(true);
          return;
        }

        // Look for pending invite matching this email
        const invites = await base44.entities.Invite.filter(
          { email: user.email, status: "pending" },
          "-created_date",
          1
        );

        // If user already has a team AND no pending invite for a different team, skip enrollment
        if (user.team_id && invites.length === 0) {
          setChecked(true);
          return;
        }

        // If user already has a team AND the pending invite is for the SAME team, just mark accepted
        if (user.team_id && invites.length > 0 && invites[0].team_id === user.team_id) {
          await base44.entities.Invite.update(invites[0].id, { status: "accepted" });
          setChecked(true);
          return;
        }

        if (invites.length > 0) {
          const invite = invites[0];

          // For school_setup invites, subscribed_sports governs what the school can access
          const effectiveSports = invite.invite_type === "school_setup"
            ? (invite.subscribed_sports?.length ? invite.subscribed_sports : invite.assigned_sports || ["football"])
            : (invite.assigned_sports?.length ? invite.assigned_sports : ["football"]);

          const adminRoles = ["head_coach", "athletic_director", "associate_head_coach", "offensive_coordinator", "defensive_coordinator", "special_teams_coordinator", "strength_conditioning_coordinator"];
          const platformRole = adminRoles.includes(invite.coaching_role) ? "admin" : "user";

          // Auto-assign team, role, positions, sports, and school code
          await base44.auth.updateMe({
            team_id: invite.team_id,
            school_name: invite.school_name || invite.team_id,
            school_code: invite.school_code || null,
            coaching_role: invite.coaching_role,
            assigned_positions: invite.assigned_positions || [],
            assigned_phases: invite.assigned_phases || [],
            assigned_sports: effectiveSports,
            role: platformRole,
            ...(invite.invite_type === "school_setup" && {
              mascot: invite.mascot || null,
              location_city: invite.location_city || null,
              location_state: invite.location_state || null,
            }),
          });

          // Mark invite as accepted
          await base44.entities.Invite.update(invite.id, { status: "accepted" });
        }
      } catch (err) {
        console.error("Enrollment check failed:", err);
      } finally {
        setChecked(true);
      }
    };

    performEnrollment();
  }, []);

  return checked ? children : null;
}