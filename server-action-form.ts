import { Schema as S, Effect, Layer, ParseResult, Exit, Cause } from "effect"
import { HandlerConfig } from "./server-action.ts";
import { Next } from "./next-service.ts";
import { RequestContext } from "./request-context.ts";

export const validateFormData = <FormFields extends S.Schema.AnyNoContext>(schema: FormFields, formData: FormData): Effect.Effect<S.Schema.Type<FormFields>, DeriveFormErrors<FormFields>> => S.decodeUnknown(schema, { errors: 'all' })(Object.fromEntries(formData.entries())).pipe(
  Effect.mapError(e => {
    const issues = ParseResult.ArrayFormatter.formatErrorSync(e)
    const errors: Record<string, string> = {}
    for (const issue of issues) {
      errors[String(issue.path[0])] = issue.message
    }
    return errors as DeriveFormErrors<FormFields>
  })
)

export type DeriveFormErrors<FormFields extends S.Schema.AnyNoContext> = {
  [K in keyof S.Schema.Type<FormFields>]: string
}

export type FormState<State extends S.Schema.AnyNoContext, FormFields extends S.Schema.AnyNoContext> = S.Schema.Type<State> & { errors?: DeriveFormErrors<FormFields> }

export type FormHandlerConfig<State extends S.Schema.AnyNoContext, FormFields extends S.Schema.AnyNoContext, InternalServerError, InvalidPayloadError, ProvidedServices> = {
  state: State
  fields: FormFields,
  action: (prevState: FormState<State, FormFields>, formFields: S.Schema.Type<FormFields>) => Promise<Effect.Effect<FormState<State, FormFields>, FormState<State, FormFields>, ProvidedServices | Next>>
  errors: {
    invalidFormData: (errors: DeriveFormErrors<FormFields>, schema: FormFields, rawPayload: FormData) => FormState<State, FormFields>
    unexpected: (cause: Cause.Cause<unknown>) => FormState<State, FormFields>
  }
} & Omit<HandlerConfig<InternalServerError, ProvidedServices, InvalidPayloadError>, 'errors'>

export const makeFormHandler = <State extends S.Schema.AnyNoContext, FormFields extends S.Schema.AnyNoContext, InternalServerError, InvalidPayloadError, ProvidedServices>(config: FormHandlerConfig<State, FormFields, InternalServerError, InvalidPayloadError, ProvidedServices>) => {
  const mergedContext = Layer.mergeAll(config.layer ?? Layer.empty, Next.Default)
  return async (prevState: FormState<State, FormFields>, formData: FormData): Promise<FormState<State, FormFields>> => {
    const requestContext = RequestContext.of({
      rawRequest: formData,
      type: 'server-action',
      requestId: crypto.randomUUID()
    })

    const effect = Effect.gen(function*() {
      const formFields = yield* validateFormData(config.fields, formData).pipe(
        Effect.mapError((errors) => config.errors.invalidFormData(errors, config.fields, formData))
      )
      const effectFn = yield* Effect.promise(() => config.action(prevState, formFields))
      return yield* effectFn
    }).pipe(
      Effect.provide(mergedContext),
      Effect.provideService(RequestContext, requestContext)
    )

    // @ts-expect-error: typescript fails to infer but its right
    const programExit = await Effect.runPromiseExit(effect)
    if (Exit.isSuccess(programExit)) {
      return programExit.value as FormState<State, FormFields>
    }
    if (Cause.isFailType(programExit.cause)) {
      return programExit.cause.error as FormState<State, FormFields>
    }
    return config.errors.unexpected(programExit.cause)
  }
}
