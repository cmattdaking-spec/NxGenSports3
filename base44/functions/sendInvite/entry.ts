import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function safeJsonStringify(value) {
  try { return JSON.stringify(value); } catch { return '[unstringifiable]'; }
}

function generatePlayerId(fullName) {
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

async function resolveInviteContext(base44, user, body) {
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

  return { teamId, schoolId, schoolName, schoolCode };
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

    const player_id = invite_type === 'player' && fullName ? generatePlayerId(fullName) : null;

    const effectiveSports = assigned_sports?.length
      ? assigned_sports
      : (user.assigned_sports?.length ? user.assigned_sports : ['football']);

    const effectiveCoachingRole = invite_type === 'player'
      ? 'player'
      : invite_type === 'parent'
        ? 'parent'
        : coaching_role;

    const inviteData = {
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

    if (invite_type === 'school_setup') {
      const extraFields = { poc_phone, mascot, subscribed_sports, subscription_term, location_city, location_state };
      Object.entries(extraFields).forEach(([k, v]) => {
        if (v !== undefined) inviteData[k] = v;
      });
    }

    if (!inviteData.team_id) {
      return Response.json({ error: 'Missing required field: team_id' }, { status: 400 });
    }

    console.log('sendInvite: creating invite record', {
      invite_type: body.invite_type,
      team_id: teamId,
      school_name: schoolName,
    });

    try {
      await base44.asServiceRole.entities.Invite.create(inviteData);
    } catch (inviteError) {
      console.error('sendInvite: Invite.create failed', {
        message: inviteError?.message,
        errorJson: safeJsonStringify(inviteError),
      });
      return Response.json(
        { error: `Failed to create invite record: ${inviteError?.message || 'Unknown error'}` },
        { status: 500 },
      );
    }

    // Determine platform role — HC and AD get admin, everyone else gets user
    const platformRole = ['head_coach', 'athletic_director'].includes(effectiveCoachingRole) ? 'admin' : 'user';

    // Send the platform invite email
    try {
      await base44.auth.inviteUser(email.trim(), platformRole);
      console.log('sendInvite: platform invite sent successfully', { platformRole });
    } catch (inviteUserError) {
      const errMsg = inviteUserError?.message || '';
      // If user already exists on the platform that is fine — the invite record was created
      if (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('exists')) {
        console.log('sendInvite: user already exists on platform, invite record created', { platformRole });
      } else {
        // Log but don't fail — the invite record was created and enrollment will work on first login
        console.warn('sendInvite: inviteUser failed (non-fatal, invite record was created)', { message: errMsg });
      }
    }

    return Response.json({ success: true, player_id: player_id || null });
  } catch (error) {
    console.error('sendInvite error:', {
      message: error?.message,
      stack: error?.stack,
      errorJson: safeJsonStringify(error),
    });
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});