import type { NextRequest } from "next/server";
import { jsonError, requireUser } from "@/lib/auth/request-user";
import {
  createGroup,
  listGroups,
  serviceErrorResponse,
} from "@/lib/services/groups";
import { parseCurrencyCode } from "@/lib/config";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    const groups = await listGroups(auth.user);
    return Response.json({ groups });
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json()) as {
      name?: string;
      currency?: string;
      firstMemberName?: string;
    };
    const bundle = await createGroup(auth.user, {
      name: body.name ?? "",
      currency: parseCurrencyCode(body.currency),
      firstMemberName: body.firstMemberName,
    });
    return Response.json(bundle, { status: 201 });
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}
