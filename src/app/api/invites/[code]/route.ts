import type { NextRequest } from "next/server";
import { jsonError, requireUser } from "@/lib/auth/request-user";
import {
  joinInvite,
  resolveInvite,
  serviceErrorResponse,
} from "@/lib/services/groups";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { code } = await ctx.params;
    const group = await resolveInvite(code);
    if (!group) {
      return Response.json({ error: "Invite not found" }, { status: 404 });
    }
    return Response.json({
      group: {
        id: group.id,
        name: group.name,
        currency: group.currency,
        inviteCode: group.inviteCode,
      },
    });
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireUser(req);
    const { code } = await ctx.params;
    const result = await joinInvite(auth.user, code);
    if (result.status === "invalid") {
      return Response.json({ status: "invalid" }, { status: 404 });
    }
    return Response.json({
      status: result.status,
      group: result.group,
      memberId: result.member.id,
      member: result.member,
    });
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}
