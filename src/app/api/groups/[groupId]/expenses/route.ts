import type { NextRequest } from "next/server";
import { jsonError, requireUser } from "@/lib/auth/request-user";
import { addExpense, serviceErrorResponse } from "@/lib/services/groups";
import type { CreateExpenseInput } from "@/lib/db/types";

type Ctx = { params: Promise<{ groupId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { groupId } = await ctx.params;
    const auth = await requireUser(req);
    const body = (await req.json()) as CreateExpenseInput;
    const expense = await addExpense(auth.user, groupId, body);
    return Response.json({ expense }, { status: 201 });
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}
