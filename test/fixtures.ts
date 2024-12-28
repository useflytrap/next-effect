import { Effect, Schema as S } from "effect"
import { addResponseAnnotations, encodingText, encodingBytes } from "../annotations.ts";

export class InternalServerError extends S.TaggedError<InternalServerError>()("InternalServerError", {
  success: S.Boolean,
  message: S.String,
  reason: S.String,
}) {}

export class InvalidPayload extends S.TaggedError<InvalidPayload>()("InvalidPayload", {
  success: S.Boolean,
  message: S.String,
  reason: S.String,
}) {}

export class MockService extends Effect.Service<MockService>()("next-effect/test/MockService", {
  sync: () => {
    return {
      foo: 'bar'
    } as const;
  },
  accessors: true,
}) {}

export class Unauthorized extends S.TaggedError<Unauthorized>()(
  "Unauthorized",
  {
    message: S.String,
  },
  addResponseAnnotations({ status: 401 })
) {}

export class TestSuccess extends S.TaggedClass<TestSuccess>()(
  "TestSuccess",
  {
    success: S.Literal(true),
    message: S.String,
  },
  addResponseAnnotations({ status: 201 })
) {}

export const TextResponse = S.String.pipe(
  S.annotations(addResponseAnnotations({ status: 200, encoding: encodingText }))
)

export const BytesResponse = S.Uint8ArrayFromSelf.pipe(
  S.annotations(addResponseAnnotations({ status: 200, encoding: encodingBytes }))
)
