import { assertEquals } from "@std/assert";
import { Effect, Schema as S } from "effect";
import { makeServerActionHandler } from "../server-action.ts";
import { Next } from "../next-service.ts";
import { internalServerError, invalidPayload } from "./fixtures.ts";
import { makeRouteHandler } from "../route-handler.ts";
import { NextRequest } from "next/server.js";

const testActionHandler = makeServerActionHandler({
  errors: {
    invalidPayload: () => invalidPayload,
    unexpected: () => internalServerError,
  },
});

const testRouteHandler = makeRouteHandler({
  errors: {
    invalidPayload: () => invalidPayload,
    unexpected: () => internalServerError,
  },
  responses: [],
});

Deno.test("next service > errors > replace with internal server error", async () => {
  const handler = testActionHandler(
    S.String,
    async (name) =>
      Effect.gen(function* () {
        const cookies = yield* Next.getCookieJar;
        yield* Effect.log(cookies);
        return { success: true, message: `API key created for ${name}.` };
      }),
  );

  const result = await handler("John Doe");
  assertEquals(result, internalServerError);
});

Deno.test("next service > errors > replace with payload error (TODO)", async () => {
  const handler = testActionHandler(
    S.String,
    async (name) =>
      Effect.sync(() => {
        throw new Error("Oops! An unexpected error occurred.");
      }),
  );

  const result = await handler("John");
  assertEquals(result, internalServerError);
});

Deno.test("next service > ensureRequestSchema", async () => {
  const GET = testRouteHandler(Effect.gen(function* () {
    const name = yield* Next.ensureRequestSchema(S.Struct({ name: S.String }));
    return { success: true, message: `API key created for ${name.name}.` };
  }));

  const result = await GET(new NextRequest("https://www.example.com"));
  assertEquals(await result.json(), {
    _tag: "InvalidPayload",
    message: "Invalid payload",
    reason: "invalid-payload",
    success: false,
  });
});
