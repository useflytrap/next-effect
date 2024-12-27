import { assertEquals } from "@std/assert";
import { Effect, Schema as S } from "effect"
import { makeServerActionHandler } from "../server-action.ts";

Deno.test("server actions > internal server error", async () => {
  const mockFormData = new FormData()
  mockFormData.set("name", "John")

  const actionHandler = makeServerActionHandler({})
  const handler = actionHandler(S.String, async (name) => Effect.gen(function*() {
    yield* Effect.sleep("2 seconds")
    throw new Error("Oops! An unexpected error occurred.")
  }))

  const result = await handler('John')

  assertEquals(result, {
    success: false,
    message: 'Internal Server Error',
    reason: 'internal-server-error'
  })
})
