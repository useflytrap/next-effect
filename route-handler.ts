import { NextRequest, NextResponse } from "next/server";
import { HandlerConfig } from "./server-action.ts";
import { Cause, Effect, Exit, Layer } from "effect";
import { Next } from "./next-service.ts";
import { RequestContext } from "./request-context.ts";

export const makeRouteHandler = <InternalServerError, ProvidedServices, InvalidPayloadError>(config: HandlerConfig<InternalServerError, InvalidPayloadError, ProvidedServices>) => {
  const mergedContext = Layer.mergeAll(config.layer, Next.Default)
  return <A, E>(effect: Effect.Effect<A, E, ProvidedServices>) => {
    return async (request: NextRequest): Promise<NextResponse<A | E>> => {
      const responseExit = await Effect.runPromiseExit(effect.pipe(
        Effect.provide(mergedContext),
        Effect.provideService(RequestContext, RequestContext.of({
          rawRequest: request,
          type: 'route-handler',
          requestId: 'acbd1234',
        }))
      ))

      if (Exit.isSuccess(responseExit)) {
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

/* const routeHandler = makeRouteHandler({
  layer: Layer.empty,
  makeInvalidPayload: (schema, payload) => new InvalidPayload({ success: false, message: "Invalid payload", reason: "Invalid payload" }),
  makeInternalServerError: (schema, cause) => new InternalServerError({ success: false, message: "Internal server error", reason: "Internal server error" }),
})

const GET = routeHandler(Effect.gen(function* () {
  return {
    hello: 'world'
  }
})) */ 
