import { type NextRequest, NextResponse } from "next/server.js";
import type { HandlerConfig } from "./server-action.ts";
import { Array, Cause, Effect, Exit, Layer, Option, Schema as S } from "effect";
import { Next } from "./next-service.ts";
import { RequestContext } from "./request-context.ts";
import { encodingJson, getEncoding, getStatus } from "./annotations.ts";

export type RouteHandlerConfig<
  InternalServerError,
  InvalidPayloadError,
  ProvidedServices,
  Responses extends S.Schema.AnyNoContext[],
> =
  & HandlerConfig<InternalServerError, InvalidPayloadError, ProvidedServices>
  & {
    responses: Responses;
  };

export const makeRouteHandler = <
  InternalServerError,
  InvalidPayloadError,
  ProvidedServices,
  Responses extends S.Schema.AnyNoContext[],
>(
  config: RouteHandlerConfig<
    InternalServerError,
    InvalidPayloadError,
    ProvidedServices,
    Responses
  >,
) => {
  const mergedContext = Layer.mergeAll(
    config.layer ?? Layer.empty,
    Next.Default,
  );
  return <A, E>(effect: Effect.Effect<A, E, ProvidedServices>) => {
    return async (request: NextRequest): Promise<NextResponse<A | E>> => {
      // @ts-expect-error: types are correct
      const responseExit = await Effect.runPromiseExit(effect.pipe(
        Effect.catchTag(
          // @ts-expect-error: this can be thrown by Next service, so we need to catch it
          "NextUnexpectedError",
          (error) => Effect.fail(config.errors.unexpected(Cause.fail(error))),
        ),
        Effect.catchTag(
          // @ts-expect-error: this can be thrown by Next service, so we need to catch it
          "NextPayloadError",
          (payload) => Effect.fail(config.errors.invalidPayload(payload)),
        ),
        Effect.provide(mergedContext),
        Effect.provideService(
          RequestContext,
          RequestContext.of({
            rawRequest: request,
            type: "route-handler",
            requestId: config.generateRequestId?.() ?? crypto.randomUUID(),
          }),
        ),
      ));

      if (Exit.isSuccess(responseExit)) {
        const matchingResponseSchema = Array.findFirst(
          config.responses,
          (schema) => S.is(schema)(responseExit.value),
        ).pipe(
          Option.getOrUndefined,
        );
        const statusCode = matchingResponseSchema
          ? getStatus(matchingResponseSchema.ast)
          : 200;
        const encoding = matchingResponseSchema
          ? getEncoding(matchingResponseSchema.ast)
          : encodingJson;
        return new NextResponse(
          encoding.kind === "Json"
            ? JSON.stringify(responseExit.value)
            : responseExit.value as BodyInit,
          {
            status: statusCode,
            headers: { "Content-Type": encoding.contentType },
          },
        );
      }

      if (Cause.isFailType(responseExit.cause)) {
        const matchingResponseSchema = Array.findFirst(
          config.responses,
          (schema) =>
            S.is(schema)((responseExit.cause as Cause.Fail<unknown>).error),
        ).pipe(
          Option.getOrUndefined,
        );
        const statusCode = matchingResponseSchema
          ? getStatus(matchingResponseSchema.ast)
          : 400;
        const encoding = matchingResponseSchema
          ? getEncoding(matchingResponseSchema.ast)
          : encodingJson;
        return new NextResponse(
          encoding.kind === "Json"
            ? JSON.stringify(responseExit.cause.error)
            : responseExit.cause.error as BodyInit,
          {
            status: statusCode,
            headers: { "Content-Type": encoding.contentType },
          },
        );
      }

      // @ts-expect-error: types are correct
      return NextResponse.json(config.errors.unexpected(responseExit.cause), {
        status: 500,
      });
    };
  };
};
