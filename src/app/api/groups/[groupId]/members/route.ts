import type { NextRequest } from "next/server";
import { jsonError, requireUser } from "@/lib/auth/request-user";
import { addMember, serviceErrorResponse } from "@/lib/services/groups";

type Ctx = { params: Promise<{ groupId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { groupId } = await ctx.params;
    const auth = await requireUser(req);
    const body = (await req.json()) as { displayName?: string };
    const member = await addMember(auth.user, groupId, {
      displayName: body.displayName ?? "",
    });
    return Response.json({ member }, { status: 201 });
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}
