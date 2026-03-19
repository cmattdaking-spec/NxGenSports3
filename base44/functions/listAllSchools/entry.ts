import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SCHOOL_PROJECTION = [
  'id', 'created_date', 'school_name', 'school_code', 'mascot', 'team_id',
  'logo_url', 'primary_color', 'secondary_color', 'status',
  'subscription_term', 'subscription_start', 'subscription_end', 'subscribed_sports',
  'location_city', 'location_state', 'poc_name', 'poc_role', 'poc_email', 'poc_phone',
  'super_admin_id',
];

function safeJsonStringify(value) {
  try { return JSON.stringify(value); } catch { return '[unstringifiable]'; }
}

const PAGE_SIZE = 100;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const allSchools = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.School.list('-created_date', PAGE_SIZE, skip, SCHOOL_PROJECTION);
      if (!batch || batch.length === 0) break;
      allSchools.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    return Response.json({ schools: allSchools });
  } catch (error) {
    console.error('listAllSchools error:', { message: error?.message, errorJson: safeJsonStringify(error) });
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});