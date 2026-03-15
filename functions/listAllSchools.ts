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
    const user = await base44.auth.me();

    if (user?.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Super admins only see schools explicitly assigned to them.
    // For backwards compatibility, schools without a super_admin_id
    // will be visible to all super admins until they are reassigned.
    const allSchools = await base44.asServiceRole.entities.School.list('-created_date', 500);
    const schools = allSchools.filter((s) =>
      !s.super_admin_id || s.super_admin_id === user.id
    );

    return Response.json({ schools });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});