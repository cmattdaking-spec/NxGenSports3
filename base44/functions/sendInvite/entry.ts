import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/** Safely stringify a value for error logging; returns '[unstringifiable]' on failure. */
function safeJsonStringify(value: unknown): string {
  try { return JSON.stringify(value); } catch { return '[unstringifiable]'; }
}

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

    const allowedRoles = ['admin', 'super_admin', 'head_coach', 'athletic_director'];
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
      poc_phone,
      mascot,
      subscribed_sports,
      subscription_term,
      location_city,
      location_state,
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
    const inviteData: Record<string, any> = {
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
    };

    // Forward extra fields provided for school_setup invites
    if (invite_type === 'school_setup') {
      const extraFields = { poc_phone, mascot, subscribed_sports, subscription_term, location_city, location_state };
      Object.entries(extraFields).forEach(([k, v]) => {
        if (v !== undefined) inviteData[k] = v;
      });
    }

    // Validate required invite fields before attempting creation
    if (!inviteData.team_id) {
      console.error('sendInvite validation failed: team_id is missing', { invite_type: body.invite_type, body_team_id: body.team_id });
      return Response.json({ error: 'Missing required field: team_id' }, { status: 400 });
    }
    if (!inviteData.email) {
      console.error('sendInvite validation failed: email is missing');
      return Response.json({ error: 'Missing required field: email' }, { status: 400 });
    }

    const sanitizedBody = {
      invite_type: body.invite_type,
      team_id: body.team_id,
      school_id: body.school_id,
      school_name: body.school_name,
      school_code: body.school_code,
      first_name: body.first_name,
      last_name: body.last_name,
      coaching_role: body.coaching_role,
      subscription_term: body.subscription_term,
      subscribed_sports: body.subscribed_sports,
      // email intentionally omitted from debug log
    };
    console.log('sendInvite: creating invite record', { sanitizedBody, resolvedContext: { teamId, schoolId, schoolName, schoolCode } });

    try {
      await base44.asServiceRole.entities.Invite.create(inviteData);
    } catch (inviteError: any) {
      console.error('sendInvite: Invite.create failed', {
        errorType: inviteError?.constructor?.name,
        message: inviteError?.message,
        stack: inviteError?.stack,
        cause: inviteError?.cause,
        errorJson: safeJsonStringify(inviteError),
        inviteData: { ...inviteData, email: '[redacted]' },
      });
      return Response.json(
        { error: `Failed to create invite record: ${inviteError?.message || 'Unknown error'}` },
        { status: 500 },
      );
    }

    // Determine platform role — HC and AD get admin, everyone else gets user
    const platformRole = ['head_coach', 'athletic_director'].includes(effectiveCoachingRole) ? 'admin' : 'user';

    // Send the platform invite (the SDK handles deduplication — if user already exists, it's a no-op)
    try {
      await base44.auth.inviteUser(email.trim(), platformRole);
      console.log('sendInvite: platform invite sent successfully', { platformRole });
    } catch (inviteUserError: any) {
      const errMsg: string = inviteUserError?.message || '';
      // If user already exists on the platform, that's acceptable — continue
      if (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('exists')) {
        console.log('sendInvite: user already exists on platform, skipping invite', { platformRole });
      } else {
        console.error('sendInvite: inviteUser failed', {
          message: errMsg,
          errorJson: safeJsonStringify(inviteUserError),
        });
        return Response.json(
          { error: `Failed to send platform invite: ${errMsg || 'Unknown error'}` },
          { status: 500 },
        );
      }
    }

    return Response.json({ success: true, player_id: player_id || null });
  } catch (error: any) {
    console.error('sendInvite error:', {
      errorType: error?.constructor?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause,
      errorJson: safeJsonStringify(error),
    });
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});