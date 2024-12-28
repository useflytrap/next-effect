import { assertEquals } from "@std/assert";
import { Effect, Schema as S } from "effect"
import { makeServerActionHandler } from "../server-action.ts";
import { Next } from "../next-service.ts";
import { InternalServerError, InvalidPayload } from "./fixtures.ts";

const invalidPayload = new InvalidPayload({ success: false, message: "Invalid payload", reason: 'invalid-payload' })
const internalServerError = new InternalServerError({ success: false, message: "Internal server error", reason: 'internal-server-error' })

const testActionHandler = makeServerActionHandler({
  errors: {
    invalidPayload: () => invalidPayload,
    unexpected: () => internalServerError
  }
})

Deno.test("next service > errors > replace with internal server error", async () => {
  const handler = testActionHandler(S.String, async (name) => Effect.gen(function*() {
    const cookies = yield* Next.getCookieJar
    yield* Effect.log(cookies)
    yield* Effect.sleep("2 seconds")
    return { success: true, message: `API key created for ${name}.` }
  }))

  const result = await handler("John Doe")
  assertEquals(result, internalServerError)
})

Deno.test("next service > errors > replace with payload error (TODO)", async () => {
  const handler = testActionHandler(S.String, async (name) => Effect.gen(function*() {
    yield* Effect.sleep("2 seconds")
    throw new Error("Oops! An unexpected error occurred.")
  }))

  const result = await handler('John')
  assertEquals(result, internalServerError)
})
