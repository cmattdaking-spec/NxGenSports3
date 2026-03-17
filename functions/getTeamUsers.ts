import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Any authenticated user can fetch their team members for messaging

    // Super admin: only sees users for schools explicitly assigned to them
    // (minus other super admins).
    if (user.role === 'super_admin') {
      const allSchools = await base44.asServiceRole.entities.School.list(
        '-created_date',
        500,
        0,
        ['team_id', 'super_admin_id'],
      );
      const myTeamIds = new Set(
        allSchools
          .filter((s: any) => !s.super_admin_id || s.super_admin_id === user.id)
          .map((s: any) => s.team_id)
          .filter(Boolean),
      );

      if (myTeamIds.size === 0) {
        return Response.json([]);
      }

      const allUsers = await base44.asServiceRole.entities.User.list();
      const scopedUsers = allUsers.filter((u: any) =>
        u.role !== 'super_admin' && u.team_id && myTeamIds.has(u.team_id)
      );

      return Response.json(scopedUsers);
    }

    // Everyone else: filter by team_id (school-level isolation)
    const teamId = user.team_id;
    if (!teamId) return Response.json([]);

    const allUsers = await base44.asServiceRole.entities.User.list();
    const teamUsers = allUsers.filter((u: any) => u.team_id === teamId && u.role !== 'super_admin');
    return Response.json(teamUsers);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Also handles update and remove via ?action= query param — reuse same deploy