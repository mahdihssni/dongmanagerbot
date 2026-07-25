import type { NextRequest } from "next/server";
import { jsonError, requireUser } from "@/lib/auth/request-user";
import {
  deleteExpense,
  serviceErrorResponse,
  updateExpense,
} from "@/lib/services/groups";
import type { CreateExpenseInput } from "@/lib/db/types";

type Ctx = { params: Promise<{ expenseId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { expenseId } = await ctx.params;
    const auth = await requireUser(req);
    const body = (await req.json()) as Partial<CreateExpenseInput>;
    const expense = await updateExpense(auth.user, expenseId, body);
    return Response.json({ expense });
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { expenseId } = await ctx.params;
    const auth = await requireUser(req);
    await deleteExpense(auth.user, expenseId);
    return Response.json({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error) ?? jsonError(error);
  }
}
