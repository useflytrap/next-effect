import { Effect, Schema as S } from "effect"
import { cookies } from "next/headers.js"
import { redirect, notFound, type RedirectType } from "next/navigation.js"
import { revalidatePath, revalidateTag } from "next/cache.js"
import { RequestContext } from "./request-context.ts";

/* export class NextRequestConfig extends Effect.Service<NextRequestConfig>()("flytrap/server/NextRequestConfig", {
  effect: Effect.gen(function* () {
    yield* Effect.log("Hello World")
    return {
      ise: 'un',
    }
  })
}) {} */

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

export class Next extends Effect.Service<Next>()("next-effect/Next", {
  sync: () => {
    const getCookieJar = Effect.tryPromise({
      try: () => cookies(),
      catch: (error) => error,
    }).pipe(
      // Effect.tapError((error) => addError(String(error))),
      Effect.mapError((error) => new InternalServerError({
        success: false,
        message: `Accessing cookie jar failed. Error: ${error}`,
        reason: 'cookie-jar-error',
      }))
    )

    const redirectTo = (url: string, type?: RedirectType) => Effect.sync(() => redirect(url, type))
    const failRedirectTo = (url: string, type?: RedirectType) => <A, E, R>(input: Effect.Effect<A, E, R>) => Effect.tapErrorCause(input, () => redirectTo(url, type))
    const nextRevalidatePath = (originalPath: string, type?: "layout" | "page") => Effect.sync(() => revalidatePath(originalPath, type))
    const nextRevalidateTag = (tag: string) => Effect.sync(() => revalidateTag(tag))
    const nextNotFound = Effect.sync(() => notFound())
    const failNotFound = <A, E, R>(input: Effect.Effect<A, E, R>) => Effect.tapErrorCause(input, () => nextNotFound)

    const ensureSchema = <RequestSchema extends S.Schema.AnyNoContext>(schema: RequestSchema, requestValue: unknown): Effect.Effect<S.Schema.Type<RequestSchema>, InvalidPayload, RequestContext> => Effect.gen(function* () {
      const decodeResult = yield* S.decodeUnknown(schema)(requestValue).pipe(
        // Effect.tapError((error) => addError(error.toString())),
        Effect.mapError(() => invalidPayload)
      )

      // yield* addContext({ req: JSON.stringify(decodeResult) })
      return decodeResult as S.Schema.Type<RequestSchema>
    })

    /**
     * Only used by route handlers.
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
        // Effect.tapError((error) => addError("An error occured while JSON parsing the request body: " + String(error))),
        Effect.mapError(() => invalidPayload)
      )

      return yield* ensureSchema(schema, jsonBody)
    })

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
    };
  },
  accessors: true,
}) {}
