import { Cause, Context, Effect, Schema as S } from "effect"
import { cookies } from "next/headers.js"
import { redirect, notFound, type RedirectType } from "next/navigation.js"
import { revalidatePath, revalidateTag } from "next/cache.js"
import { RequestContext } from "./request-context.ts";
import { HandlerConfig } from "./server-action.ts";

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

export const invalidPayload = new InvalidPayload({
  success: false,
  message: "Invalid request payload.",
  reason: "invalid-payload",
})

export class ErrorConfig extends Context.Tag("ErrorConfig")<
  ErrorConfig,
  HandlerConfig<Cause.Cause<unknown>, Cause.Cause<unknown>, never>["errors"]
>() {}

export class Next extends Effect.Service<Next>()("next-effect/Next", {
  effect: Effect.gen(function*() {
    const errorConfig = yield* ErrorConfig
    const getCookieJar = Effect.tryPromise({
      try: () => cookies(),
      catch: (error) => error,
    }).pipe(
      Effect.tapErrorCause((cause) => Effect.logError(Cause.pretty(cause))),
      Effect.mapErrorCause((cause) => errorConfig.unexpected(cause)),
      Effect.withSpan("Next.getCookieJar"),
    )
    
    const redirectTo = (url: string, type?: RedirectType) => Effect.sync(() => redirect(url, type))
    const failRedirectTo = (url: string, type?: RedirectType) => <A, E, R>(input: Effect.Effect<A, E, R>) => Effect.tapErrorCause(input, () => redirectTo(url, type))
    const nextRevalidatePath = (originalPath: string, type?: "layout" | "page") => Effect.sync(() => revalidatePath(originalPath, type))
    const nextRevalidateTag = (tag: string) => Effect.sync(() => revalidateTag(tag))
    const nextNotFound = Effect.sync(() => notFound())
    const failNotFound = <A, E, R>(input: Effect.Effect<A, E, R>) => Effect.tapErrorCause(input, () => nextNotFound)

    const ensureSchema = <RequestSchema extends S.Schema.AnyNoContext>(schema: RequestSchema, requestValue: unknown): Effect.Effect<S.Schema.Type<RequestSchema>, InvalidPayload, RequestContext> => Effect.gen(function* () {
      const decodeResult = yield* S.decodeUnknown(schema)(requestValue).pipe(
        Effect.mapErrorCause((parseError) => errorConfig.invalidPayload({ schema, payload: requestValue, error: parseError }))
      )

      return decodeResult as S.Schema.Type<RequestSchema>
    })

    /**
     * Only used by route handlers.
     * @since 1.0.0
     */
    const ensureRequestSchema = <RequestSchema extends S.Schema.AnyNoContext>(schema: RequestSchema) => Effect.gen(function* () {
      const { rawRequest } = yield* RequestContext

      if (!(rawRequest instanceof Request)) {
        return yield* Effect.dieMessage(`You must only use \`ensureRequestSchema\` in route handlers.`)
      }

      const jsonBody = yield* Effect.tryPromise({
        try: () => rawRequest.json(),
        catch: (error) => error,
      }).pipe(
        Effect.mapError((error) => errorConfig.invalidPayload({ schema, payload: rawRequest, error }))
      )

      return yield* ensureSchema(schema, jsonBody)
    }).pipe(
      Effect.withSpan("Next.ensureRequestSchema"),
    )

    const text = Effect.gen(function*() {
      const { rawRequest } = yield* RequestContext
      if (!(rawRequest instanceof Request)) {
        return yield* Effect.dieMessage(`You must only use \`text\` in route handlers.`)
      }
      return yield* Effect.tryPromise({
        try: () => rawRequest.text(),
        catch: (error) => error,
      }).pipe(
        Effect.mapErrorCause((cause) => errorConfig.unexpected(cause))
      )
    }).pipe(
      Effect.withSpan("Next.text"),
    )

    const arrayBuffer = Effect.gen(function*() {
      const { rawRequest } = yield* RequestContext
      if (!(rawRequest instanceof Request)) {
        return yield* Effect.dieMessage(`You must only use \`arrayBuffer\` in route handlers.`)
      }
      return yield* Effect.tryPromise({
        try: () => rawRequest.arrayBuffer(),
        catch: (error) => error,
      }).pipe(
        Effect.mapErrorCause((cause) => errorConfig.unexpected(cause))
      )
    }).pipe(
      Effect.withSpan("Next.arrayBuffer"),
    )

    return {
      getCookieJar,
      ensureSchema,
      ensureRequestSchema,
      redirectTo,
      failRedirectTo,
      revalidatePath: nextRevalidatePath,
      revalidateTag: nextRevalidateTag,
      notFound: nextNotFound,
      failNotFound,
      text,
      arrayBuffer,
    };
  }),
  accessors: true,
}) {}
