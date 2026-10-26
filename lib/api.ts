export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function readJson(request: Request): Promise<
  | { value: Record<string, unknown> }
  | { error: Response }
> {
  try {
    const value: unknown = await request.json();
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { error: jsonError("Request body must be a JSON object", 400) };
    }
    return { value: value as Record<string, unknown> };
  } catch {
    return { error: jsonError("Invalid JSON body", 400) };
  }
}

export function parsePositiveInteger(value: string | null): number | null {
  if (value === null || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseId(value: string): number | null {
  return parsePositiveInteger(value);
}

export function isPrismaError(
  error: unknown,
  code: string,
): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export function internalError(error: unknown) {
  console.error("API request failed:", error);
  return jsonError("Internal server error", 500);
}

export function getPagination(searchParams: URLSearchParams) {
  const rawPage = searchParams.get("page");
  const rawLimit = searchParams.get("limit");
  const page = rawPage === null ? 1 : parsePositiveInteger(rawPage);
  const limit = rawLimit === null ? 10 : parsePositiveInteger(rawLimit);

  if (page === null || limit === null || limit > 100) return null;
  return { page, limit };
}
