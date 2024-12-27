import { Cause, Effect, Either, Exit, Layer, Schema as S } from "effect"
import { RequestContext } from "./request-context.ts";
import { Next } from "./next-service.ts";
import { ParseError } from "effect/ParseResult";

type NextRuntimeProvidedServices = Next

type TypeConstraint<Schema extends S.Schema.AnyNoContext, ProvidedRuntimeServices> =
  (payload: S.Schema.Type<Schema>) => Promise<
    Effect.Effect<unknown, unknown, NextRuntimeProvidedServices | ProvidedRuntimeServices>
  >

type InferSuccess<Schema extends S.Schema.AnyNoContext, ProvidedRuntimeServices, TEffectFn extends TypeConstraint<Schema, ProvidedRuntimeServices>> =
  TEffectFn extends (payload: S.Schema.Type<Schema>) => Promise<Effect.Effect<infer A, unknown, unknown>> ?
    A
    : never

type InferError<Schema extends S.Schema.AnyNoContext, ProvidedRuntimeServices, TEffectFn extends TypeConstraint<Schema, ProvidedRuntimeServices>> =
  TEffectFn extends (payload: S.Schema.Type<Schema>) => Promise<Effect.Effect<unknown, infer E, unknown>> ?
    E
    : never

export type InvalidPayloadOptions = {
  schema: S.Schema.AnyNoContext
  payload: S.Schema.Type<S.Schema.AnyNoContext>
  error: ParseError
}
export type HandlerConfig<InternalServerError, InvalidPayloadError, ProvidedServices> = {
  errors: {
    invalidPayload: (options: InvalidPayloadOptions) => InvalidPayloadError
    unexpected: (cause: Cause.Cause<unknown>) => InternalServerError
  }
  layer?: Layer.Layer<ProvidedServices, never, RequestContext>
}

/* export type ExtractLayer<Layer extends Layer.Layer.Any | undefined> = Layer extends Layer.Layer.Any ? Layer : Layer.Layer<never>
export type ExtractInternalServerError<UserProvidedISE> = UserProvidedISE extends undefined ? InternalServerError : UserProvidedISE
export type ExtractPayloadError<UserProvidedPayloadError> = UserProvidedPayloadError extends undefined ? InvalidPayload : UserProvidedPayloadError */

export const makeServerActionHandler = <InternalServerError, InvalidPayloadError, ProvidedServices>(config: HandlerConfig<InternalServerError, InvalidPayloadError, ProvidedServices>) => {
  return <Schema extends S.Schema.AnyNoContext, TEffectFn extends TypeConstraint<Schema, ProvidedServices>>(schema: Schema, effectFn: TEffectFn) => {
    const mergedContext = Layer.mergeAll(config.layer ?? Layer.empty, Next.Default)
    return async function (payload: S.Schema.Type<Schema>): Promise<InferSuccess<Schema, ProvidedServices, TEffectFn> | InferError<Schema, ProvidedServices, TEffectFn> | InternalServerError | InvalidPayloadError> {
      const validatedPayload = S.decodeUnknownEither(schema)(payload).pipe(
        Either.mapLeft((error) => config.errors.invalidPayload({ schema, payload, error }))
      )
      if (Either.isLeft(validatedPayload)) return validatedPayload.left

      const effect = await effectFn(validatedPayload.right)
      const responseExit = await Effect.runPromiseExit(
        // @ts-expect-error: this is correct
        effect.pipe(
          Effect.provide(mergedContext),
          Effect.provideService(
            RequestContext,
            RequestContext.of({
              type: 'server-action',
              requestId: 'abcd123',
              rawRequest: payload,
            })
          )
        )
      );
  
      if (Exit.isSuccess(responseExit)) {
        return responseExit.value as InferSuccess<Schema, ProvidedServices, TEffectFn>;
      }
  
      if (Cause.isFailType(responseExit.cause)) {
        return responseExit.cause.error as InferError<Schema, ProvidedServices, TEffectFn>;
      }

      return config.errors.unexpected(responseExit.cause)
    }
  }
}

/* export type HandlePayloadConfig<
  Schema extends S.Schema.AnyNoContext,
  ProvidedServices,
  TEffectFn extends TypeConstraint<Schema, ProvidedServices>,
  InternalServerError,
  InvalidPayloadError,
> = HandlerConfig<InternalServerError, InvalidPayloadError, ProvidedServices> & {
  schema: Schema
  payload: S.Schema.Type<Schema>
  effectFn: TEffectFn
}

export const handleServerActionPayload = async <
  Schema extends S.Schema.AnyNoContext,
  ProvidedServices,
  TEffectFn extends TypeConstraint<Schema, ProvidedServices>,
  InternalServerError,
  InvalidPayloadError,
>(config: HandlePayloadConfig<Schema, ProvidedServices, TEffectFn, InternalServerError, InvalidPayloadError>) => {
  const validatedPayload = S.decodeUnknownEither(config.schema)(config.payload).pipe(
    Either.mapLeft(() => config.makeInvalidPayloadError(config.schema, config.payload))
  )
  if (Either.isLeft(validatedPayload)) return validatedPayload.left

  // @todo: benchmark impact of this
  const mergedContext = Layer.mergeAll(config.layer, Next.Default)

  const effect = await config.effectFn(validatedPayload.right)
  const responseExit = await Effect.runPromiseExit(
    effect.pipe(
      Effect.provide(mergedContext),
      Effect.provideService(
        RequestContext,
        RequestContext.of({
          type: 'server-action',
          requestId: 'abcd123',
          rawRequest: config.payload,
        })
      )
    )
  );

  if (Exit.isSuccess(responseExit)) {
    return responseExit.value as InferSuccess<Schema, ProvidedServices, TEffectFn>;
  }

  if (Cause.isFailType(responseExit.cause)) {
    return responseExit.cause.error as InferError<Schema, ProvidedServices, TEffectFn>;
  }

  return config.makeInternalServerError(responseExit.cause)
} */
