import { OrchestrationV2TurnItemJson, type OrchestrationV2TurnItem } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

const decodeUnknownTurnItemJson = Schema.decodeUnknownEffect(OrchestrationV2TurnItemJson);
const decodeUnknownJsonString = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

/** Coerces legacy `feedback_request` turn-item records from existing databases into `system_notice`. */
export function normalizeLegacyTurnItemPayload(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (record.type !== "feedback_request") return value;
  const preview =
    record.preview !== null && typeof record.preview === "object"
      ? (record.preview as Record<string, unknown>)
      : undefined;
  const subject = typeof preview?.subject === "string" ? preview.subject.trim() : "";
  const status = record.status === "waiting" ? "cancelled" : record.status;
  const completedAt =
    status === "cancelled" && record.completedAt === null ? record.updatedAt : record.completedAt;
  return {
    id: record.id,
    threadId: record.threadId,
    runId: record.runId,
    nodeId: record.nodeId,
    providerThreadId: record.providerThreadId,
    providerTurnId: record.providerTurnId,
    nativeItemRef: record.nativeItemRef,
    parentItemId: record.parentItemId,
    ordinal: record.ordinal,
    status,
    title: typeof record.title === "string" ? record.title : "Feedback for the T3 team",
    startedAt: record.startedAt,
    completedAt,
    updatedAt: record.updatedAt,
    type: "system_notice",
    message: subject
      ? `Agent feedback (${subject}) is disabled in this build.`
      : "Agent feedback is disabled in this build.",
    level: "info",
  };
}

export const decodeStoredTurnItemJson = (
  json: string,
): Effect.Effect<OrchestrationV2TurnItem, Schema.SchemaError> =>
  decodeUnknownJsonString(json).pipe(
    Effect.map(normalizeLegacyTurnItemPayload),
    Effect.flatMap(decodeUnknownTurnItemJson),
  );
