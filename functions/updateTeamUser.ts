import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['admin', 'super_admin', 'head_coach', 'athletic_director'];
    const effectiveRole = user.coaching_role || user.role;
    if (!allowedRoles.includes(user.role) && !allowedRoles.includes(effectiveRole)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, data } = await req.json();
    if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 });

    // Verify the target user belongs to the same team (unless super_admin)
    if (user.role !== 'super_admin') {
      const targetUser = await base44.asServiceRole.entities.User.get(userId);
      if (!targetUser || targetUser.team_id !== user.team_id) {
        return Response.json({ error: 'Forbidden: user not on your team' }, { status: 403 });
      }
    }

    await base44.asServiceRole.entities.User.update(userId, data);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});