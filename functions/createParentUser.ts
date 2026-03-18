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
      first_name,
      last_name,
      school_id,
      assigned_sports,
      position,
      email,
      child_player_id,
    } = body;

    if (!first_name || !last_name || !school_id || !assigned_sports || assigned_sports.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create parent user with restricted permissions
    // Only superadmin can edit these users until they're assigned to a team
    const userData = {
      first_name,
      last_name,
      full_name: `${first_name} ${last_name}`,
      school_id,
      assigned_sports,
      position: position || 'Parent',
      role: 'user', // Regular user role
      coaching_role: 'parent', // Mark as parent - restricts permissions
      team_id: null, // Unassigned - only superadmin can assign
      profile_verified: false, // Will need superadmin approval
      email: email, // If provided during signup
      user_type: 'parent',
      child_ids: child_player_id ? [child_player_id] : [],
      // Mark as pending superadmin approval
      status: 'pending_approval'
    };

    // Create the user record
    const newUser = await base44.asServiceRole.entities.User.create(userData);

    // Establish parent-child relationship if child_player_id provided
    if (child_player_id) {
      await base44.asServiceRole.entities.User.update(child_player_id, {
        parent_id: newUser.id
      });
    }

    return Response.json({
      success: true,
      userId: newUser.id,
      message: 'Parent account created successfully. Awaiting superadmin approval.'
    });
  } catch (error) {
    console.error('Error creating parent user:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});