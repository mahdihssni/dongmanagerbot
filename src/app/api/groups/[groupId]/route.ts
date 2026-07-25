import type { NextRequest } from "next/server";
import { jsonError, requireUser } from "@/lib/auth/request-user";
import {
  getGroupBundle,
  serviceErrorResponse,
  updateGroup,
} from "@/lib/services/groups";
import { parseCurrencyCode } from "@/lib/config";

type Ctx = { params: Promise<{ groupId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { groupId } = await ctx.params;
    const auth = await requireUser(req);
    const bundle = await getGroupBundle(auth.user, groupId);
    return Response.json(bundle);
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { groupId } = await ctx.params;
    const auth = await requireUser(req);
    const body = (await req.json()) as {
      name?: string;
      currency?: string;
      archived?: boolean;
    };
    const group = await updateGroup(auth.user, groupId, {
      name: body.name,
      currency: body.currency ? parseCurrencyCode(body.currency) : undefined,
      archived: body.archived,
    });
    return Response.json({ group });
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}
