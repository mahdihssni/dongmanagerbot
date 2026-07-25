import type { NextRequest } from "next/server";
import { jsonError, requireUser } from "@/lib/auth/request-user";
import { getMe, serviceErrorResponse, updateSettings } from "@/lib/services/groups";
import { parseCurrencyCode } from "@/lib/config";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    const me = await getMe(auth.user, auth.settings);
    return Response.json(me);
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    const body = (await req.json()) as {
      locale?: "fa" | "en";
      currency?: string;
      hapticFeedback?: boolean;
    };
    const settings = await updateSettings(auth.user, {
      locale: body.locale,
      currency: body.currency ? parseCurrencyCode(body.currency) : undefined,
      hapticFeedback: body.hapticFeedback,
    });
    return Response.json({ settings });
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}
