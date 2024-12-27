import { assertEquals } from "@std/assert";
import { Effect, Exit, Layer, Schema as S } from "effect"
import { makeFormHandler, validateFormData } from "./server-action-form.ts";
import { InternalServerError, InvalidPayload, Next } from "./next-service.ts";
import { makeServerActionHandler } from "./server-action.ts";

const ApiKeyState = S.Struct({
  success: S.Boolean,
  message: S.optional(S.String),
})

const ApiKeyFormSchema = S.Struct({
  name: S.String.pipe(S.minLength(5, { message: () => "Name must be at least 5 characters long" })),
})

/* Deno.test("server actions > forms > payload validation > errors", async () => {
  const mockFormData = new FormData()
  mockFormData.set("name", "John")

  const payloadError = await Effect.runPromiseExit(validateFormData(ApiKeyFormSchema, mockFormData))

  assertEquals(payloadError, Exit.fail({
    errors: {
      name: "Name must be at least 5 characters long"
    }
  }))
});

Deno.test("server actions > forms > payload validation", async () => {
  const mockFormData = new FormData()
  mockFormData.set("name", "John Doe")

  const payloadError = await Effect.runPromiseExit(validateFormData(ApiKeyFormSchema, mockFormData))

  assertEquals(payloadError, Exit.succeed({
    name: "John Doe"
  }))
});

Deno.test("server actions > forms > makeFormHandler", async () => {
  const mockFormData = new FormData()
  mockFormData.set("name", "John")
  const createApiKeyAction = makeFormHandler({
    state: ApiKeyState,
    fields: ApiKeyFormSchema,
    action: async (prevState, formFields) => Effect.gen(function*() {
      yield* Effect.sleep("2 seconds")
      return {
        success: true,
        message: `API key created for ${formFields.name}.`,
      }
    }),
  })

  const result = await createApiKeyAction({ success: false }, mockFormData)

  assertEquals(result, {
    success: true,
    message: `API key created for John Doe.`,
  })
})

export class MockService extends Effect.Service<MockService>()("next-effect/test/MockService", {
  sync: () => {
    return {
      foo: 'bar'
    } as const;
  },
  accessors: true,
}) {}

Deno.test("server actions > forms > makeFormHandler > custom layer", async () => {
  const mockFormData = new FormData()
  mockFormData.set("name", "John Doe")
  const createApiKeyAction = makeFormHandler({
    state: ApiKeyState,
    fields: ApiKeyFormSchema,
    action: async (prevState, formFields) => Effect.gen(function*() {
      const { foo } = yield* MockService
      yield* Effect.sleep("2 seconds")
      return {
        success: true,
        message: `API key created for ${formFields.name}. ${foo}`,
      }
    }),
    layer: MockService.Default,
  })

  const result = await createApiKeyAction({ success: false }, mockFormData)

  assertEquals(result, {
    success: true,
    message: `API key created for John Doe. bar`,
  })
})

Deno.test("server actions > internal server error", async () => {
  const mockFormData = new FormData()
  mockFormData.set("name", "John")

  const actionHandler = makeServerActionHandler({})
  const handler = actionHandler(S.String, async (name) => Effect.gen(function*() {
    yield* Effect.sleep("2 seconds")
    throw new Error("Oops! An unexpected error occurred.")
    return {
      success: true,
      message: `API key created for ${name}.`,
    }
  }))

  const result = await handler('John')

  assertEquals(result, {
    success: false,
    message: 'Internal Server Error',
    reason: 'internal-server-error'
  })
}) */

const createApiKeySuccess = async (_prevState: any, formFields: any) => Effect.gen(function*() {
  yield* Effect.sleep("2 seconds")
  return {
    success: true,
    message: `API key created for ${formFields.name}.`,
  }
})

const createApiKeyDefect = async (_prevState: any, _formFields: any) => Effect.gen(function*() {
  yield* Effect.sleep("2 seconds")
  throw new Error("Oops! An unexpected error occurred.")
})

Deno.test("server actions > forms > errors", async () => {
  const createApiKeyAction = makeFormHandler({
    state: ApiKeyState,
    fields: ApiKeyFormSchema,
    action: createApiKeySuccess,
    errors: {
      invalidFormData: (errors) => ({ success: false, message: "Invalid payload", errors: errors.errors }),
      unexpected: () => ApiKeyState.make({ success: false, message: "Internal server error" })
    }
  })
  
  const result = await createApiKeyAction({ success: false }, new FormData())
  
  assertEquals(result, {
    success: false,
    message: "Invalid payload",
    errors: {
      name: "is missing"
    }
  })

  const mockFormDataDefect = new FormData()
  mockFormDataDefect.set("name", "John Doe")
  const createApiKeyActionDefect = makeFormHandler({
    state: ApiKeyState,
    fields: ApiKeyFormSchema,
    action: createApiKeyDefect,
    errors: {
      invalidFormData: (errors) => ({ success: false, message: "Invalid payload", errors: errors.errors }),
      unexpected: () => ApiKeyState.make({ success: false, message: "Internal server error" })
    }
  })

  const resultDefect = await createApiKeyActionDefect({ success: false }, mockFormDataDefect)

  assertEquals(resultDefect, {
    success: false,
    message: "Internal server error",
  })
})
