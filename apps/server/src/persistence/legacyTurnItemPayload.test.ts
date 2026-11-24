import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { decodeStoredTurnItemJson } from "./legacyTurnItemPayload.ts";

describe("decodeStoredTurnItemJson", () => {
  it.effect(
    "coerces legacy pending feedback_request payloads into cancelled system_notice items",
    () =>
      Effect.gen(function* () {
        const item = yield* decodeStoredTurnItemJson(
          JSON.stringify({
            id: "turn-item:feedback-1",
            threadId: "thread-1",
            runId: "run-1",
            nodeId: "node-1",
            providerThreadId: null,
            providerTurnId: null,
            nativeItemRef: null,
            parentItemId: null,
            ordinal: 3,
            status: "waiting",
            title: "Feedback for the T3 team",
            startedAt: "2026-05-01T10:00:00.000Z",
            completedAt: null,
            updatedAt: "2026-05-01T10:01:00.000Z",
            type: "feedback_request",
            preview: {
              kind: "bug",
              subject: "t3_thread_launch",
              expected: "opens",
              actual: "failed",
              workaround: "",
              trace: null,
            },
            feedbackStatus: "pending",
          }),
        );

        assert.equal(item.type, "system_notice");
        assert.equal(item.status, "cancelled");
        assert.isNotNull(item.completedAt);
        if (item.type === "system_notice") {
          assert.include(item.message, "t3_thread_launch");
        }
      }),
  );

  it.effect("preserves settled status on completed legacy feedback_request payloads", () =>
    Effect.gen(function* () {
      const item = yield* decodeStoredTurnItemJson(
        JSON.stringify({
          id: "turn-item:feedback-2",
          threadId: "thread-1",
          runId: "run-1",
          nodeId: "node-1",
          providerThreadId: null,
          providerTurnId: null,
          nativeItemRef: null,
          parentItemId: null,
          ordinal: 4,
          status: "completed",
          title: "Feedback for the T3 team",
          startedAt: "2026-05-01T10:00:00.000Z",
          completedAt: "2026-05-01T10:02:00.000Z",
          updatedAt: "2026-05-01T10:02:00.000Z",
          type: "feedback_request",
          preview: {
            kind: "other",
            subject: "",
            expected: "",
            actual: "",
            workaround: "",
            trace: null,
          },
          feedbackStatus: "sent",
        }),
      );

      assert.equal(item.type, "system_notice");
      assert.equal(item.status, "completed");
      if (item.type === "system_notice") {
        assert.equal(item.message, "Agent feedback is disabled in this build.");
      }
    }),
  );
});
