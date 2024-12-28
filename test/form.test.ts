import { assertEquals } from "@std/assert";
import { Effect, Exit, Layer, Schema as S } from "effect"
import { makeFormHandler, validateFormData } from "../server-action-form.ts";
import { MockService } from "./fixtures.ts";

const ApiKeyState = S.Struct({
  success: S.Boolean,
  message: S.optional(S.String),
})

const ApiKeyFormSchema = S.Struct({
  name: S.String.pipe(S.minLength(5, { message: () => "Name must be at least 5 characters long" })),
})

const createApiKeySuccess = async (_prevState: any, formFields: any) => Effect.sync(() => {
  return {
    success: true,
    message: `API key created for ${formFields.name}.`,
  }
})

const createApiKeyDefect = async (_prevState: any, _formFields: any) => Effect.sync(() => {
  throw new Error("Oops! An unexpected error occurred.")
})

Deno.test("server actions > forms > errors", async () => {
  const createApiKeyAction = makeFormHandler({
    state: ApiKeyState,
    fields: ApiKeyFormSchema,
    action: createApiKeySuccess,
    errors: {
      invalidFormData: (errors) => ({ success: false, message: "Invalid payload", errors }),
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
      invalidFormData: (errors) => ({ success: false, message: "Invalid payload", errors }),
      unexpected: () => ApiKeyState.make({ success: false, message: "Internal server error" })
    }
  })

  const resultDefect = await createApiKeyActionDefect({ success: false }, mockFormDataDefect)

  assertEquals(resultDefect, {
    success: false,
    message: "Internal server error",
  })
})

Deno.test("server actions > forms", async () => {
  const mockFormData = new FormData()
  mockFormData.set("name", "John Doe")
  const createApiKeyAction = makeFormHandler({
    state: ApiKeyState,
    fields: ApiKeyFormSchema,
    action: createApiKeySuccess,
    errors: {
      invalidFormData: (errors) => ({ success: false, message: "Invalid payload", errors }),
      unexpected: () => ApiKeyState.make({ success: false, message: "Internal server error" })
    }
  })

  const result = await createApiKeyAction({ success: false }, mockFormData)

  assertEquals(result, {
    success: true,
    message: `API key created for John Doe.`,
  })
})

Deno.test("server actions > forms > custom layer", async () => {
  const mockFormData = new FormData()
  mockFormData.set("name", "John Doe")
  const createApiKeyAction = makeFormHandler({
    state: ApiKeyState,
    fields: ApiKeyFormSchema,
    action: async (prevState, formFields) => Effect.gen(function*() {
      const { foo } = yield* MockService
      return {
        success: true,
        message: `API key created for ${formFields.name}. ${foo}`,
      }
    }),
    errors: {
      invalidFormData: (errors) => ({ success: false, message: "Invalid payload", errors }),
      unexpected: () => ApiKeyState.make({ success: false, message: "Internal server error" })
    },
    layer: MockService.Default,
  })

  const result = await createApiKeyAction({ success: false }, mockFormData)

  assertEquals(result, {
    success: true,
    message: `API key created for John Doe. bar`,
  })
})
