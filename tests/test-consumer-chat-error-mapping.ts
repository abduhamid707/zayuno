import assert from "node:assert/strict";
import {
  IdempotencyError,
  IdempotencyPayloadConflictError,
  getAgentErrorPresentation,
} from "../packages/shared/src/errors.ts";
import { ConsumerChatController } from "../apps/api/src/modules/consumer/chat/consumer-chat.controller.ts";

const HttpStatus = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  BAD_GATEWAY: 502,
} as const;

const controller = new ConsumerChatController({} as any);
const publicErrorMessage = (error: unknown): string =>
  (controller as any).publicErrorMessage(error);

function httpException(response: unknown, status: number) {
  return {
    message:
      typeof response === "string"
        ? response
        : String((response as Record<string, unknown>)?.message || "HTTP exception"),
    getResponse: () => response,
    getStatus: () => status,
  };
}

function expectCanonicalMessage(error: unknown, code: string, status: number) {
  assert.equal(
    publicErrorMessage(error),
    getAgentErrorPresentation({ errorCode: code, statusCode: status }).customerMessage,
  );
}

async function main() {
  expectCanonicalMessage(
    { code: "QUOTE_EXPIRED", statusCode: HttpStatus.BAD_REQUEST },
    "QUOTE_EXPIRED",
    HttpStatus.BAD_REQUEST,
  );

  // A generic conflict is a stale-state problem, not proof of a duplicate order.
  const genericConflict = publicErrorMessage(httpException(
    { error: "Conflict", message: "private conflict detail" },
    HttpStatus.CONFLICT,
  ));
  assert.equal(
    genericConflict,
    getAgentErrorPresentation({ errorCode: "CONFLICT", statusCode: HttpStatus.CONFLICT }).customerMessage,
  );
  assert.doesNotMatch(genericConflict, /yangi buyurtma/i);

  const inFlight = publicErrorMessage(new IdempotencyError());
  assert.equal(
    inFlight,
    getAgentErrorPresentation({
      errorCode: "IDEMPOTENCY_CONFLICT",
      statusCode: HttpStatus.CONFLICT,
    }).customerMessage,
  );
  assert.match(inFlight, /qayta ishlanmoqda/i);

  const payloadConflict = publicErrorMessage(new IdempotencyPayloadConflictError());
  assert.equal(
    payloadConflict,
    getAgentErrorPresentation({
      errorCode: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
      statusCode: HttpStatus.CONFLICT,
    }).customerMessage,
  );

  const upstreamSecret = "DO_NOT_EXPOSE_PROVIDER_SECRET";
  const outOfStock = publicErrorMessage(httpException(
    { code: "OUT_OF_STOCK", message: upstreamSecret },
    HttpStatus.CONFLICT,
  ));
  assert.equal(
    outOfStock,
    getAgentErrorPresentation({
      errorCode: "RESOURCE_UNAVAILABLE",
      statusCode: HttpStatus.CONFLICT,
    }).customerMessage,
  );
  assert.doesNotMatch(outOfStock, new RegExp(upstreamSecret));

  expectCanonicalMessage(
    httpException("expired credentials", HttpStatus.UNAUTHORIZED),
    "UNAUTHORIZED",
    HttpStatus.UNAUTHORIZED,
  );
  expectCanonicalMessage(
    httpException("private policy detail", HttpStatus.FORBIDDEN),
    "FORBIDDEN",
    HttpStatus.FORBIDDEN,
  );
  expectCanonicalMessage(
    httpException("upstream took too long", HttpStatus.REQUEST_TIMEOUT),
    "PROVIDER_TIMEOUT",
    HttpStatus.REQUEST_TIMEOUT,
  );
  expectCanonicalMessage(
    httpException("private gateway detail", HttpStatus.BAD_GATEWAY),
    "PROVIDER_UNAVAILABLE",
    HttpStatus.BAD_GATEWAY,
  );

  assert.equal(
    publicErrorMessage(httpException(
      "Xabar 1-1200 belgi chegarasidan oshdi",
      HttpStatus.BAD_REQUEST,
    )),
    "Xabar 1 200 belgidan uzun. Ro‘yxatni qismlarga bo‘lib yuboring.",
  );

  console.log("Consumer chat error mapping passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
