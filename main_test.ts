import { assertEquals } from "@std/assert";
import { Effect, Exit, Layer, Schema as S } from "effect"
import { makeFormHandler, validateFormData } from "./server-action-form.ts";
import { InternalServerError, InvalidPayload, Next } from "./next-service.ts";

const ApiKeyState = S.Struct({
  success: S.Boolean,
  message: S.optional(S.String),
})

const ApiKeyFormSchema = S.Struct({
  name: S.String.pipe(S.minLength(5, { message: () => "Name must be at least 5 characters long" })),
})

Deno.test("server actions > forms > payload validation > errors", async () => {
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
  mockFormData.set("name", "John Doe")
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
    makeInvalidPayloadError: () => new InvalidPayload({ success: false, message: 'Invalid Payload', reason: 'Invalid Payload' }),
    makeInternalServerError: () => new InternalServerError({ success: false, message: `Hello World`, reason: 'Hello World' }),
    layer: Layer.empty.pipe(
      Layer.provide(Next.Default),
    )
  })

  const result = await createApiKeyAction({ success: false }, mockFormData)

  assertEquals(result, {
    success: true,
    message: `API key created for John Doe.`,
  })
})