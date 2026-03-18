import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Fields to project from each School record.
 * Matches what SuperAdminView renders, plus the Invite schema fields
 * (school_name, school_code, mascot).  Excludes any back-referenced
 * Player collection to prevent circular-reference serialisation errors
 * and the resulting 502 responses.
 */
const SCHOOL_PROJECTION = [
  'id',
  'created_date',
  'school_name',
  'school_code',
  'mascot',
  'team_id',
  'logo_url',
  'primary_color',
  'secondary_color',
  'status',
  'subscription_term',
  'subscription_start',
  'subscription_end',
  'subscribed_sports',
  'location_city',
  'location_state',
  'poc_name',
  'poc_role',
  'poc_email',
  'poc_phone',
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

    // Paginate all schools then filter to only those owned by this super admin
    // (schools with no super_admin_id are visible to all super admins)
    const allSchools: Record<string, any>[] = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.School.list(
        '-created_date',
        PAGE_SIZE,
        skip,
        SCHOOL_PROJECTION,
      );
      if (!batch || batch.length === 0) break;

      allSchools.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      skip += PAGE_SIZE;
    }

    // Filter: show only schools explicitly assigned to this super_admin OR unassigned ones
    const scopedSchools = allSchools.filter((s: any) =>
      !s.super_admin_id || s.super_admin_id === user.id
    );

    return Response.json({ schools: scopedSchools });
  } catch (error: any) {
    console.error('listAllSchools error:', {
      message: error?.message,
      stack: error?.stack,
      errorJson: safeJsonStringify(error),
    });
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});