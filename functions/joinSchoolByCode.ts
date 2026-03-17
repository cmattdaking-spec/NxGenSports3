import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { school_code } = await req.json();
    if (!school_code?.trim()) {
      return Response.json({ error: 'school_code is required' }, { status: 400 });
    }

    const schools = await base44.asServiceRole.entities.School.filter(
      { school_code: school_code.trim().toUpperCase() },
      '-created_date',
      1,
    );

    const school = schools?.[0];
    if (!school) {
      return Response.json({ error: 'School not found. Check your school code and try again.' }, { status: 404 });
    }

    if (school.status && school.status !== 'active') {
      return Response.json({ error: 'This school account is not currently active.' }, { status: 403 });
    }

    // Tie the user to this school
    await base44.auth.updateMe({
      team_id: school.team_id,
      school_id: school.id,
      school_name: school.school_name,
      school_code: school.school_code,
    });

    return Response.json({
      success: true,
      school: {
        team_id: school.team_id,
        school_id: school.id,
        school_name: school.school_name,
        school_code: school.school_code,
        subscribed_sports: school.subscribed_sports || [],
      },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});
