import { assertEquals } from "@std/assert";
import { Effect, Schema as S } from "effect"

import { InternalServerError, InvalidPayload } from "./fixtures.ts";
import { makeRouteHandler } from "../route-handler.ts";
import { NextRequest } from "next/server.js";
import { Next } from "../next-service.ts";
import { AnnotationEncoding, AnnotationStatus, annotations, getResponseAnnotation, getStatus } from "../annotations.ts";

const invalidPayload = new InvalidPayload({ success: false, message: "Invalid payload", reason: 'invalid-payload' })
const internalServerError = new InternalServerError({ success: false, message: "Internal server error", reason: 'internal-server-error' })

class Unauthorized extends S.TaggedError<Unauthorized>()(
  "Unauthorized",
  {
    message: S.String,
  },
  annotations({ status: 401 })
) {}

class TestSuccess extends S.TaggedClass<TestSuccess>()(
  "TestSuccess",
  {
    success: S.Literal(true),
    message: S.String,
  },
  annotations({ status: 201 })
) {}

import * as AST from "effect/SchemaAST"

const TextResponse = S.String.pipe(
  S.annotations({ [AnnotationStatus]: 200, [AnnotationEncoding]: { kind: 'Text', contentType: 'text/plain' } })
)

const BytesResponse = S.Uint8Array.pipe(
  // annotations({ status: 200, encoding: { kind: 'Text', contentType: 'text/plain' } }),
  S.annotations({ [AnnotationStatus]: 200 })
)

/*

type BodyInit =
  | Blob
  | BufferSource
  | FormData
  | URLSearchParams
  | ReadableStream<Uint8Array>
  | Iterable<Uint8Array>
  | AsyncIterable<Uint8Array>
  | string;

*/



/*

export const annotations = <A>(
  annotations: Schema.Annotations.Schema<NoInfer<A>> & {
    readonly status?: number | undefined
  }
): Schema.Annotations.Schema<A> => {
  const result: Record<symbol, unknown> = Struct.omit(annotations, "status")
  if (annotations.status !== undefined) {
    result[AnnotationStatus] = annotations.status
  }
  return result
}

*/

const testRouteHandler = makeRouteHandler({
  errors: {
    invalidPayload: () => invalidPayload,
    unexpected: () => internalServerError
  },
  responses: [Unauthorized, TestSuccess, TextResponse, BytesResponse]
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

Deno.test("route handler > errors > unexpected", async () => {
  const GET = testRouteHandler(Effect.gen(function*() {
    yield* Effect.sleep("2 seconds")
    throw new Error("Oops! An unexpected error occurred.")
  }))

  const result = await GET(new NextRequest("https://www.useflytrap.com"))
  const resultsJson = await result.json()
  assertEquals(resultsJson, {
    success: false,
    message: "Internal server error",
    reason: "internal-server-error",
    _tag: "InternalServerError"
  })
})

Deno.test.only("route handler > responses > annotations", async () => {
  const GET = testRouteHandler(Effect.gen(function*() {
    yield* Effect.sleep("2 seconds")
    return new TestSuccess({ success: true, message: `API key created successfully.` })
  }))

  const result = await GET(new NextRequest("https://www.useflytrap.com"))
  assertEquals(result.status, 201)
  assertEquals(await result.json(), { _tag: "TestSuccess", success: true, message: `API key created successfully.` })
})
