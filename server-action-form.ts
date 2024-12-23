// @ts-nocheck

import { Schema as S, Effect, Layer, ParseResult } from "effect"
import { HandlerConfig, handleServerActionPayload } from "./server-action.ts";
import { Next } from "./next-service.ts";
import { makeServerActionHandler } from "./server-action.ts";
import { RequestContext } from "./request-context.ts";

export const validateFormData = <FormFields extends S.Schema.AnyNoContext>(schema: FormFields, formData: FormData): Effect.Effect<S.Schema.Type<FormFields>, DeriveError<FormFields>> => S.decodeUnknown(schema, { errors: 'all' })(Object.fromEntries(formData.entries())).pipe(
  Effect.mapError(e => {
    const issues = ParseResult.ArrayFormatter.formatErrorSync(e)
    const errors: Record<string, string> = {}
    for (const issue of issues) {
      errors[String(issue.path[0])] = issue.message
    }
    return { errors } as DeriveError<FormFields>
  })
)

export type DeriveError<FormFields extends S.Schema.AnyNoContext> = {
  errors?: {
    [K in keyof S.Schema.Type<FormFields>]: string
  }
}

export type FormState<State extends S.Struct<any>, FormFields extends S.Struct<any>> = S.Schema.Type<State> & DeriveError<FormFields>

export type FormHandlerConfig<State extends S.Struct<any>, FormFields extends S.Struct<any>, InternalServerError, InvalidPayloadError, ProvidedServices> = {
  state: State
  fields: FormFields,
  action: (prevState: FormState<State, FormFields>, formFields: S.Schema.Type<FormFields>) => Promise<Effect.Effect<FormState<State, FormFields>, FormState<State, FormFields>, ProvidedServices | Next>>
} & HandlerConfig<InternalServerError, ProvidedServices, InvalidPayloadError>

export const makeFormHandler = <State extends S.Schema.AnyNoContext, FormFields extends S.Schema.AnyNoContext, InternalServerError, InvalidPayloadError, ProvidedServices>(config: FormHandlerConfig<State, FormFields, InternalServerError, InvalidPayloadError, ProvidedServices>) => {
  const mergedContext = Layer.mergeAll(config.layer, Next.Default)
  return async (prevState: FormState<State, FormFields>, formData: FormData): Promise<FormState<State, FormFields>> => {

    const effectX = Effect.gen(function*() {
      const formFields = yield* validateFormData(config.fields, formData)
      const effectFn = yield* Effect.promise(() => config.action(prevState, formFields))
      return yield* effectFn
    }).pipe(
      Effect.provide(mergedContext)
    )

    /* const effect = validateFormData(config.fields, formData).pipe(
      // Effect.flatMap(formFields => config.action(prevState, formFields)),
      Effect.provide(mergedContext)
    ) */

    return await Effect.runPromise(effectX)
  }
}

/* export const makeFormHandler = <State extends S.Schema.AnyNoContext, FormFields extends S.Schema.AnyNoContext, InternalServerError, InvalidPayloadError, ProvidedServices>(config: FormHandlerConfig<State, FormFields, InternalServerError, InvalidPayloadError, ProvidedServices>) => {
  const mergedContext = Layer.mergeAll(config.layer, Next.Default)
  return async (prevState: FormState<State, FormFields>, formData: FormData): Promise<FormState<State, FormFields>> => {
    const formDataObj = Object.fromEntries(formData.entries())
    const decodedFormData = S.decodeUnknown(config.fields)(formDataObj).pipe(
      Effect.mapError(e => ({
        success: false,
        message: "Invalid form data",
      }))
    )
  }
} */

// Test API key creation example

const ApiKeyState = S.Struct({
  success: S.Boolean,
  message: S.optional(S.String),
})

const ApiKeyFormSchema = S.Struct({
  name: S.String.pipe(S.minLength(5, { message: () => "Name must be at least 5 characters long" })),
})

/* const createApiKeyXX = makeServerActionFormHandler({
  state: ApiKeyState,
  fields: ApiKeyFormSchema,
  layer: Layer.empty,
  action: async (prevState, formFields) => Effect.gen(function*() {
    yield* Effect.sleep("5 seconds")
    return {
      success: true,
      message: "API key created successfully",
    }
  })
}) */


/* 

API LIKE:
const ApiKeyState = S.Struct({
  success: S.Boolean,
  message: S.optional(S.String),
  // error: S.optional(S.String),
})

const ApiKeyFormSchema = S.Struct({
  name: S.String.pipe(S.minLength(5, { message: () => "Name must be at least 5 characters long" })),
})

export type DeriveError<FormFields extends S.Struct<any>> = {
  errors?: {
    [K in keyof S.Schema.Type<FormFields>]: string
  }
}

export type FormState<State extends S.Struct<any>, FormFields extends S.Struct<any>> = S.Schema.Type<State> & DeriveError<FormFields>

export type FormHandlerConfig<State extends S.Struct<any>, FormFields extends S.Struct<any>> = {
  state: State
  fields: FormFields,
  action: (prevState: FormState<State, FormFields>, formFields: S.Schema.Type<FormFields>) => Effect.Effect<FormState<State, FormFields>, FormState<State, FormFields>>
}

const createServerActionFormHandler = <State extends S.Struct<any>, FormFields extends S.Struct<any>>(handlerConfig: FormHandlerConfig<State, FormFields>) => {
  return async (prevState: FormState<State, FormFields>, formData: FormData): Promise<FormState<State, FormFields>> => {
    const formDataObj = Object.fromEntries(formData.entries())
    const decodedFormData = S.decodeUnknown(handlerConfig.fields)(formDataObj).pipe(
      Effect.mapError(e => ({
        success: false,
        message: "Invalid form data",
      }))
    )

    const actionResult = await handlerConfig.action(prevState, decodedFormData as any).pipe(
      Effect.runPromiseExit
    )

    if (Exit.isSuccess(actionResult)) {
      return actionResult.value
    }

    if (Exit.isFailure(actionResult)) {
      return actionResult.value
    }

    return actionResult
  }
}

export const createApiKeyXX = createServerActionFormHandler({
  state: ApiKeyState,
  fields: ApiKeyFormSchema,
  action: (prevState, formFields) => Effect.gen(function*() {
    yield* Effect.sleep("5 seconds")
    return {

    return {
      success: true,
      message: "API key created successfully",
    }
  })
}) */
