import type { NextRequest } from "next/server";
import { jsonError, requireUser } from "@/lib/auth/request-user";
import { deactivateMember, serviceErrorResponse } from "@/lib/services/groups";

type Ctx = { params: Promise<{ memberId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { memberId } = await ctx.params;
    const auth = await requireUser(req);
    const body = (await req.json()) as { isActive?: boolean };
    if (body.isActive === false) {
      const member = await deactivateMember(auth.user, memberId);
      return Response.json({ member });
    }
    return Response.json({ error: "Only deactivation is supported" }, { status: 400 });
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}
