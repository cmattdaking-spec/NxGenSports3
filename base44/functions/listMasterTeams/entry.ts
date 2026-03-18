import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/** Only the School fields needed to build the MasterTeams shape. */
const MASTER_TEAMS_PROJECTION = [
  'id',
  'team_id',
  'school_name',
  'poc_name',
  'poc_email',
  'poc_role',
  'status',
  'subscription_term',
  'subscription_start',
  'subscription_end',
];

/** Safely stringify a value; returns '[unstringifiable]' on circular-reference or other errors. */
function safeJsonStringify(value: unknown): string {
  try { return JSON.stringify(value); } catch { return '[unstringifiable]'; }
}

const PAGE_SIZE = 100;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Paginate with projection to avoid loading the Player collection
    // (which can cause circular-reference serialisation errors and 502s).
    const allSchools: Record<string, any>[] = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.School.list(
        '-created_date',
        PAGE_SIZE,
        skip,
        MASTER_TEAMS_PROJECTION,
      );
      if (!batch || batch.length === 0) break;

      allSchools.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    // Map School records to the MasterTeams shape expected by MasterTeamsTab
    const teams = allSchools.map((s: any) => ({
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
  } catch (error: any) {
    console.error('listMasterTeams error:', {
      message: error?.message,
      stack: error?.stack,
      errorJson: safeJsonStringify(error),
    });
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});
