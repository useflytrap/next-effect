import { assertEquals } from "@std/assert";
import { Effect, Schema as S } from "effect"
import { makeServerActionHandler } from "../server-action.ts";
import { InternalServerError, InvalidPayload } from "../next-service.ts";

const invalidPayload = new InvalidPayload({ success: false, message: "Invalid payload", reason: 'invalid-payload' })
const internalServerError = new InternalServerError({ success: false, message: "Internal server error", reason: 'internal-server-error' })

const testActionHandler = makeServerActionHandler({
  errors: {
    invalidPayload: () => invalidPayload,
    unexpected: () => internalServerError
  }
})

Deno.test("server actions > invalid payload", async () => {
  const handler = testActionHandler(S.String, async (name) => Effect.gen(function*() {
    yield* Effect.sleep("2 seconds")
    return { success: true, message: `API key created for ${name}.` }
  }))

  // @ts-expect-error: on purpose wrong argument
  const result = await handler(23)
  assertEquals(result, invalidPayload)
})


Deno.test("server actions > internal server error", async () => {
  const handler = testActionHandler(S.String, async (name) => Effect.gen(function*() {
    yield* Effect.sleep("2 seconds")
    throw new Error("Oops! An unexpected error occurred.")
  }))

  const result = await handler('John')
  assertEquals(result, internalServerError)
})
