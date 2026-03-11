import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Any authenticated user can fetch their team members for messaging

    // Super admin sees all users (minus other super admins)
    if (user.role === 'super_admin') {
      const allUsers = await base44.asServiceRole.entities.User.list();
      return Response.json(allUsers.filter(u => u.role !== 'super_admin'));
    }

    // Everyone else: filter by team_id
    const teamId = user.team_id;
    if (!teamId) return Response.json([]);

    const allUsers = await base44.asServiceRole.entities.User.list();
    const teamUsers = allUsers.filter(u => u.team_id === teamId && u.role !== 'super_admin');
    return Response.json(teamUsers);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Also handles update and remove via ?action= query param — reuse same deploy