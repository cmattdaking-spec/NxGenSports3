import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/** Generate a player ID: first initial of last name (uppercase) + 3 random alphanumeric chars.
 *  e.g. "John Smith" → "S4F2" */
function generatePlayerId(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const initial = (lastName[0] || 'X').toUpperCase();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 3; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return initial + rand;
}

async function resolveInviteContext(base44: any, user: any, body: any) {
  const isSchoolSetupInvite = body.invite_type === 'school_setup';
  const teamId = (isSchoolSetupInvite ? body.team_id : user.team_id || body.team_id || '').trim();
  let schoolId = isSchoolSetupInvite ? (body.school_id || null) : (user.school_id || body.school_id || null);
  let schoolName = isSchoolSetupInvite ? (body.school_name || '') : (user.school_name || body.school_name || '');
  let schoolCode = isSchoolSetupInvite ? (body.school_code || '') : (user.school_code || body.school_code || '');

  if (teamId && (!schoolId || !schoolName || !schoolCode)) {
    const schools = await base44.asServiceRole.entities.School.filter({ team_id: teamId }, '-created_date', 1);
    const school = schools?.[0];

    if (school) {
      schoolId = schoolId || school.id;
      schoolName = schoolName || school.school_name || '';
      schoolCode = schoolCode || school.school_code || '';
    }
  }

  return {
    teamId,
    schoolId,
    schoolName,
    schoolCode,
  };
}

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
    const {
      email,
      coaching_role,
      assigned_positions,
      assigned_phases,
      assigned_sports,
      invite_type,
      first_name,
      last_name,
      child_player_id,
    } = body;

    const cleanedFirstName = first_name?.trim();
    const cleanedLastName = last_name?.trim();
    const fullName = [cleanedFirstName, cleanedLastName].filter(Boolean).join(' ');
    const { teamId, schoolId, schoolName, schoolCode } = await resolveInviteContext(base44, user, body);

    if (!email || !cleanedFirstName || !cleanedLastName || !teamId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (invite_type === 'parent' && !child_player_id) {
      return Response.json({ error: 'Child player ID is required for parent invites' }, { status: 400 });
    }

    // For player invites, generate a unique player_id from the player's last name initial
    const player_id = invite_type === 'player' && fullName
      ? generatePlayerId(fullName)
      : null;

    const effectiveSports = assigned_sports?.length
      ? assigned_sports
      : (user.assigned_sports?.length ? user.assigned_sports : ['football']);

    const effectiveCoachingRole = invite_type === 'player'
      ? 'player'
      : invite_type === 'parent'
        ? 'parent'
        : coaching_role;

    // Create the invite record
    await base44.asServiceRole.entities.Invite.create({
      email: email.trim(),
      team_id: teamId,
      school_id: schoolId,
      school_name: schoolName,
      school_code: schoolCode,
      coaching_role: effectiveCoachingRole,
      assigned_positions: assigned_positions || [],
      assigned_phases: assigned_phases || [],
      assigned_sports: effectiveSports,
      status: 'pending',
      invited_by: user.email,
      invite_type: invite_type || 'staff',
      first_name: cleanedFirstName,
      last_name: cleanedLastName,
      poc_name: fullName,
      child_player_id: child_player_id || null,
      player_id: player_id || null,
    });

    // Determine platform role — HC and AD get admin, everyone else gets user
    const platformRole = ['head_coach', 'athletic_director'].includes(effectiveCoachingRole) ? 'admin' : 'user';

    // Send the platform invite using the calling user's token (they must be admin)
    await base44.users.inviteUser(email.trim(), platformRole);

    return Response.json({ success: true, player_id: player_id || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});