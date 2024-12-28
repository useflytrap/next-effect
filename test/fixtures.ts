import { Schema as S } from "effect"

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
