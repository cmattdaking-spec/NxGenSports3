import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Super admins only see schools explicitly assigned to them.
    // For backwards compatibility, schools without a super_admin_id
    // will be visible to all super admins until they are reassigned.
    const allSchools = await base44.asServiceRole.entities.School.list('-created_date', 500);
    const schools = allSchools.filter((s: any) =>
      !s.super_admin_id || s.super_admin_id === user.id
    );

    return Response.json({ schools });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});