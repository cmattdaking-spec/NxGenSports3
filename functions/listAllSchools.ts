import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schools = await base44.asServiceRole.entities.School.list('-created_date', 500);
    return Response.json({ schools });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});