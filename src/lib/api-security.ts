import { createHash, randomBytes } from "node:crypto";
import { validateTender, type TenderInput } from "../features/tenders/domain";

export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const WORKSPACE_COOKIE = process.env.NODE_ENV === "production" ? "__Host-pt-workspace" : "pt-workspace";
export function workspaceIdentity(token?: string) {
  const valid = !!token && /^[a-f0-9]{64}$/.test(token);
  const value = valid ? token : randomBytes(32).toString("hex");
  return { token: value, hash: createHash("sha256").update(value).digest("hex"), fresh: !valid };
}
export function assertSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new RequestError("Same-origin request required.", 403);
}
export function parseTenderInput(value: unknown): TenderInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestError("Invalid tender fields.");
  const record = value as Record<string, unknown>;
  const fields = ["title", "description", "requirements", "deadline", "winnerRule", "status"] as const;
  if (Object.keys(record).some(key => !fields.some(field => field === key)) || fields.some(key => typeof record[key] !== "string")) throw new RequestError("Only the supported public tender fields are accepted.");
  const input = Object.fromEntries(fields.map(key => [key, record[key]])) as TenderInput;
  // API timestamps must identify an instant, not inherit the server time zone.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(input.deadline)) throw new RequestError("Use an ISO deadline with a time zone.");
  const errors = validateTender(input);
  if (Object.keys(errors).length) throw new RequestError(Object.values(errors)[0]!);
  return input;
}
export async function readTenderBody(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new RequestError("JSON content type required.", 415);
  const limit = 32_768;
  if (Number(request.headers.get("content-length")) > limit) throw new RequestError("Request body is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("Request body required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limit) { await reader.cancel(); throw new RequestError("Request body is too large.", 413); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new RequestError("Invalid JSON."); }
  return parseTenderInput(body);
}
