import { assertEquals } from "@std/assert";
import { Effect, Schema as S } from "effect"

import { InternalServerError, InvalidPayload } from "./fixtures.ts";
import { makeRouteHandler } from "../route-handler.ts";
import { NextRequest } from "next/server.js";
import { Next } from "../next-service.ts";

const invalidPayload = new InvalidPayload({ success: false, message: "Invalid payload", reason: 'invalid-payload' })
const internalServerError = new InternalServerError({ success: false, message: "Internal server error", reason: 'internal-server-error' })

const testRouteHandler = makeRouteHandler({
  errors: {
    invalidPayload: () => invalidPayload,
    unexpected: () => internalServerError
  }
})

Deno.test("route handler > success", async () => {
  const GET = testRouteHandler(Effect.gen(function*() {
    yield* Effect.sleep("2 seconds")
    return { success: true, message: `API key created for ${name}.` }
  }))

  const result = await GET(new NextRequest("https://www.useflytrap.com"))
  assertEquals(await result.json(), { success: true, message: `API key created for ${name}.` })
})

Deno.test("route handler > errors > invalid payload", async () => {
  const GET = testRouteHandler(Effect.gen(function*() {
    yield* Effect.sleep("2 seconds")
    const name = yield* Next.ensureRequestSchema(S.Struct({ name: S.String }))
    return { success: true, message: `API key created for ${name.name}.` }
  }))

  const result = await GET(new NextRequest("https://www.useflytrap.com"))
  const resultsJson = await result.json()
  assertEquals(resultsJson, {
    success: false,
    message: "Invalid payload",
    reason: "invalid-payload",
    _tag: "InvalidPayload"
  })
})
