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

    // Super admins can update any non-super-admin user.
    if (user.role === 'super_admin') {
      const targetUser = await base44.asServiceRole.entities.User.get(userId);
      if (!targetUser || targetUser.role === 'super_admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      await base44.asServiceRole.entities.User.update(userId, data);
      return Response.json({ success: true });
    }

    // Everyone else: enforce school and role-based scoping
    const targetUser = await base44.asServiceRole.entities.User.get(userId);
    if (!targetUser || targetUser.team_id !== user.team_id) {
      return Response.json({ error: 'Forbidden: user not on your team' }, { status: 403 });
    }

    // Parent users without team assignment can only be edited by superadmins
    if (targetUser.coaching_role === 'parent' && !targetUser.team_id) {
      return Response.json({ error: 'Forbidden: parent users must be assigned to a team by a superadmin before they can be edited' }, { status: 403 });
    }

    const targetCoachRole = targetUser.coaching_role || targetUser.role;

    // Head Coach: can only manage staff for their own programs (sports) at their school.
    // They may NOT edit athletic directors, super admins, or other head coaches.
    if (effectiveRole === 'head_coach') {
      const isTargetAD = targetCoachRole === 'athletic_director';
      const isTargetHC = targetCoachRole === 'head_coach';
      const isTargetSuperAdmin = targetUser.role === 'super_admin';

      if (isTargetAD || isTargetHC || isTargetSuperAdmin) {
        return Response.json({ error: 'Forbidden: cannot modify this user' }, { status: 403 });
      }

      const mySports = new Set((user.assigned_sports || []) as string[]);
      const targetSports = new Set((targetUser.assigned_sports || []) as string[]);

      // If both parties have sport assignments, require at least one shared sport.
      if (mySports.size > 0 && targetSports.size > 0) {
        const hasOverlap = Array.from(targetSports).some(s => mySports.has(s));
        if (!hasOverlap) {
          return Response.json({ error: 'Forbidden: user is not in your program' }, { status: 403 });
        }
      }
    }

    // Athletic Directors and admins can manage all staff at their school (team_id)
    // except super admins.
    if (targetUser.role === 'super_admin') {
      return Response.json({ error: 'Forbidden: cannot modify super admin' }, { status: 403 });
    }

    await base44.asServiceRole.entities.User.update(userId, data);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});