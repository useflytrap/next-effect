import { NextRequest, NextResponse } from "next/server.js";
import { HandlerConfig } from "./server-action.ts";
import { Cause, Effect, Exit, Layer } from "effect";
import { Next } from "./next-service.ts";
import { RequestContext } from "./request-context.ts";

export const makeRouteHandler = <InternalServerError, ProvidedServices, InvalidPayloadError>(config: HandlerConfig<InternalServerError, InvalidPayloadError, ProvidedServices>) => {
  const mergedContext = Layer.mergeAll(config.layer ?? Layer.empty, Next.Default)
  return <A, E>(effect: Effect.Effect<A, E, ProvidedServices>) => {
    return async (request: NextRequest): Promise<NextResponse<A | E>> => {
      // @ts-expect-error: types are correct
      const responseExit = await Effect.runPromiseExit(effect.pipe(
        // @ts-expect-error: this can be thrown by Next service, so we need to catch it
        Effect.catchTag("NextUnexpectedError", (error) => Effect.fail(config.errors.unexpected(error.cause))),
        // @ts-expect-error: this can be thrown by Next service, so we need to catch it
        Effect.catchTag("NextPayloadError", (payload) => Effect.fail(config.errors.invalidPayload(payload))),
        Effect.provide(mergedContext),
        Effect.provideService(RequestContext, RequestContext.of({
          rawRequest: request,
          type: 'route-handler',
          requestId: 'acbd1234',
        }))
      ))

      if (Exit.isSuccess(responseExit)) {
        // @ts-expect-error: types are correct
        return NextResponse.json(responseExit.value)
      }

      if (Cause.isFailType(responseExit.cause)) {
        // @ts-expect-error: types are correct
        return NextResponse.json(responseExit.cause.error, { status: 400 })
      }

      // @ts-expect-error: types are correct
      return NextResponse.json(config.makeInternalServerError(responseExit.cause), { status: 500 })
    }
  }
}
