// @ts-ignore - resolved by Base44 edge runtime (Deno + npm specifier)
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Hint TypeScript about the Deno global when type-checking locally.
// This has no effect in the actual Deno runtime used by Base44.
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const {
      firstName,
      lastName,
      schoolId,
      assignedSports,
      position,
      email
    } = body;

    if (!firstName || !lastName || !schoolId || !assignedSports || assignedSports.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create parent user with restricted permissions
    // Only superadmin can edit these users until they're assigned to a team
    const userData = {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      school_id: schoolId,
      assigned_sports: assignedSports,
      position: position || 'Parent',
      role: 'user', // Regular user role
      coaching_role: 'parent', // Mark as parent - restricts permissions
      team_id: null, // Unassigned - only superadmin can assign
      profile_verified: false, // Will need superadmin approval
      email: email, // If provided during signup
      // Mark as pending superadmin approval
      status: 'pending_approval'
    };

    // Create the user record
    const newUser = await base44.asServiceRole.entities.User.create(userData);

    return Response.json({
      success: true,
      userId: newUser.id,
      message: 'Parent account created successfully. Awaiting superadmin approval.'
    });
  } catch (error) {
    console.error('Error creating parent user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});