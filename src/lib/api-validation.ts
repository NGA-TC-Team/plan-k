import { NextResponse } from "next/server";
import type { ZodTypeAny, z } from "zod";

// ─── Response types ───────────────────────────────────────────────────────────

export type ValidationFailure = {
  ok: false;
  reason: "INVALID_INPUT";
  issues: Array<{ path: (string | number)[]; message: string; code: string }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function validationErrorResponse(
  issues: ValidationFailure["issues"],
): NextResponse<ValidationFailure> {
  return NextResponse.json<ValidationFailure>(
    { ok: false, reason: "INVALID_INPUT", issues },
    { status: 400 },
  );
}

/**
 * Convert a Zod v4 issue's path (PropertyKey[]) to the serialisable
 * (string|number)[] shape used in the API response.
 */
function normalisePath(path: PropertyKey[]): (string | number)[] {
  return path.map((p) => (typeof p === "number" ? p : String(p)));
}

/**
 * Parse JSON body via Zod.
 * Returns `{ ok: true, data }` or `{ ok: false, response }` — early-return
 * pattern so call sites never touch the raw body.
 */
export async function parseJsonBody<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<
  { ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, reason: "INVALID_JSON" },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: validationErrorResponse(
        parsed.error.issues.map((i) => ({
          path: normalisePath(i.path),
          message: i.message,
          // code is optional in Zod v4 base interface — fall back to "custom"
          code: (i as { code?: string }).code ?? "custom",
        })),
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Parse URL searchParams via Zod.
 * Converts all params to a plain object first; schemas should use
 * `z.coerce.*` for numeric/boolean conversion.
 */
export function parseSearchParams<S extends ZodTypeAny>(
  url: URL,
  schema: S,
): { ok: true; data: z.infer<S> } | { ok: false; response: NextResponse } {
  const obj = Object.fromEntries(url.searchParams.entries());
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    return {
      ok: false,
      response: validationErrorResponse(
        parsed.error.issues.map((i) => ({
          path: normalisePath(i.path),
          message: i.message,
          code: (i as { code?: string }).code ?? "custom",
        })),
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
