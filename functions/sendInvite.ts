import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['admin', 'head_coach', 'athletic_director'];
    const effectiveRole = user.coaching_role || user.role;
    if (!allowedRoles.includes(user.role) && !allowedRoles.includes(effectiveRole)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { email, coaching_role, team_id, school_name, school_code, assigned_positions, assigned_phases, assigned_sports, invite_type, poc_name, child_player_id } = body;

    if (!email || !team_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (invite_type === 'parent' && !child_player_id) {
      return Response.json({ error: 'Child player ID is required for parent invites' }, { status: 400 });
    }

    // Create the invite record
    await base44.asServiceRole.entities.Invite.create({
      email: email.trim(),
      team_id,
      school_name,
      school_code,
      coaching_role: invite_type === 'player' ? 'player' : coaching_role,
      assigned_positions: assigned_positions || [],
      assigned_phases: assigned_phases || [],
      assigned_sports: assigned_sports || ['football'],
      status: 'pending',
      invited_by: user.email,
      invite_type: invite_type || 'staff',
      poc_name: poc_name || '',
      child_player_id: child_player_id || null,
    });

    // Determine platform role — HC and AD get admin, everyone else gets user
    const platformRole = ['head_coach', 'athletic_director'].includes(coaching_role) ? 'admin' : 'user';

    // Send the platform invite using the calling user's token (they must be admin)
    await base44.users.inviteUser(email.trim(), platformRole);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});