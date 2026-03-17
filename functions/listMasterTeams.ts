import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const schools = await base44.asServiceRole.entities.School.list('-created_date', 500);

    // Map School records to the MasterTeams shape expected by MasterTeamsTab
    const teams = schools.map((s: any) => ({
      id: s.id,
      team_id: s.team_id || '',
      school_name: s.school_name || '',
      assigned_admin_name: s.poc_name || '',
      assigned_admin_email: s.poc_email || '',
      assigned_admin_role: s.poc_role || 'head_coach',
      subscription_status: s.status || 'active',
      subscription_term: s.subscription_term || 'annual',
      subscription_start: s.subscription_start || null,
      subscription_end: s.subscription_end || null,
    }));

    return Response.json({ teams });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
