import { Cause, Effect, Schema as S } from "effect"
import { cookies } from "next/headers.js"
import { redirect, notFound, type RedirectType } from "next/navigation.js"
import { revalidatePath, revalidateTag } from "next/cache.js"
import { RequestContext } from "./request-context.ts";

export class NextPayloadError extends S.TaggedError<NextPayloadError>("next-effect/NextPayloadError")("NextPayloadError", {
  schema: S.Any,
  payload: S.Any,
  error: S.Any,
}) {}

export class NextUnexpectedError extends S.TaggedError<NextUnexpectedError>("next-effect/NextUnexpectedError")("NextUnexpectedError", {
  cause: S.Cause({ defect: S.Unknown, error: S.Unknown }),
}) {}

export class Next extends Effect.Service<Next>()("next-effect/Next", {
  sync: () => {
    const getCookieJar = Effect.tryPromise({
      try: () => cookies(),
      catch: (error) => error,
    }).pipe(
      Effect.tapErrorCause((cause) => Effect.logError(Cause.pretty(cause))),
      Effect.mapError((error) => new NextUnexpectedError({ cause: Cause.fail(error) })),
      Effect.withSpan("Next.getCookieJar"),
    )
    
    const redirectTo = (url: string, type?: RedirectType) => Effect.sync(() => redirect(url, type)).pipe(
      Effect.withSpan("Next.redirectTo", { attributes: { url, type } }),
    )
    const failRedirectTo = (url: string, type?: RedirectType) => <A, E, R>(input: Effect.Effect<A, E, R>) => Effect.tapErrorCause(input, () => redirectTo(url, type))
    const nextRevalidatePath = (originalPath: string, type?: "layout" | "page") => Effect.sync(() => revalidatePath(originalPath, type)).pipe(
      Effect.withSpan("Next.revalidatePath", { attributes: { originalPath, type } }),
    )
    const nextRevalidateTag = (tag: string) => Effect.sync(() => revalidateTag(tag)).pipe(Effect.withSpan("Next.revalidateTag", { attributes: { tag } }))
    const nextNotFound = Effect.sync(() => notFound()).pipe(Effect.withSpan("Next.notFound"))
    const failNotFound = <A, E, R>(input: Effect.Effect<A, E, R>) => Effect.tapErrorCause(input, () => nextNotFound)

    const ensureSchema = <RequestSchema extends S.Schema.AnyNoContext>(schema: RequestSchema, requestValue: unknown): Effect.Effect<S.Schema.Type<RequestSchema>, NextPayloadError, RequestContext> => Effect.gen(function* () {
      const decodeResult = yield* S.decodeUnknown(schema)(requestValue).pipe(
        Effect.mapError((parseError) => new NextPayloadError({ schema, payload: requestValue, error: parseError }))
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
        Effect.mapError((error) => new NextPayloadError({ schema, payload: rawRequest, error }))
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
        Effect.mapError((error) => new NextUnexpectedError({ cause: Cause.fail(error) })),
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
        Effect.mapError((error) => new NextUnexpectedError({ cause: Cause.fail(error) })),
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
  },
  accessors: true,
}) {
  // @ts-expect-error: can't use override modifier
  static ensureRequestSchema = Effect.serviceFunctionEffect(this, _ => _.ensureRequestSchema)
}
