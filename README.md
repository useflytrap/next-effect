<img src="https://raw.githubusercontent.com/useflytrap/next-effect/main/.github/assets/cover.png" alt="Next Effect cover" />

<div align="center">
  <a href="https://discord.gg/tQaADUfdeP">💬 Join our Discord</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://x.com/useflytrap">𝕏 Follow us</a>
  <br />
</div>

## Next Effect

[![npm version][npm-version-src]][npm-href]
[![npm downloads][npm-downloads-src]][npm-href]
[![Github Actions][github-actions-src]][github-actions-href]

> Easily use Effect for Next.js Route Handlers, Server Actions, Pages and Forms

Next Effect is a library that makes it easy to use Effect for Next.js Route
Handlers, Server Actions, Pages and Forms. It provides helpful utilities for
working with Next.js using Effect.

## Features

- Write Server Actions using Effect. [Learn more →](#-server-actions)
- Write progressively-enhanced Forms using Effect. [Learn more →](#-forms)
- Write Route Handlers using Effect. [Learn more →](#-route-handlers)
- Full type-safety for all server-side responses. [Learn more →](#-type-safety)
- OpenTelemetry tracing for each request. [Learn more →](#-otel-tracing)

## ⚡️ Quickstart

1. Install the Neft Effect package

```sh
$ pnpx jsr add next-effect
```

2. Create a Server Action handler

```typescript
import { makeServerActionHandler } from "next-effect"

export class InternalServerError extends S.TaggedError<InternalServerError>()("InternalServerError", {
  success: S.Boolean,
  message: S.String,
  reason: S.String,
}) {}

export class InvalidPayload extends S.TaggedError<InvalidPayload>()("InvalidPayload", {
  success: S.Boolean,
  message: S.String,
  reason: S.String,
}) {}

export const invalidPayload = new InvalidPayload({ success: false, message: "Invalid payload", reason: 'invalid-payload' })
export const internalServerError = new InternalServerError({ success: false, message: "Internal server error", reason: 'internal-server-error' })

const makeServerAction = makeServerActionHandler({
  errors: {
    invalidPayload: ({ error, schema, payload }) => invalidPayload,
    unexpected: (cause: Cause.Cause<unknown>) => internalServerError,
  },
})

// lib/actions/create-team.ts
export const CreateTeamPayload = S.Struct({
  name: S.String,
  userId: S.String,
})

export const CreateTeamFailedError extends S.TaggedError<CreateTeamFailedError>()("CreateTeamFailedError", {
  success: S.Boolean,
  message: S.String,
  reason: S.String,
}) {}

export const CreateTeamSuccess = S.Struct({
  success: S.Literal(true),
  message: S.String,
})

export const createTeam = makeServerAction(CreateTeamPayload, async (payload: S.Schema.Type<typeof CreateTeamPayload>) => Effect.gen(function* () {
  const random = yield* Random.next
  if (random > 0.5) {
    return yield* Effect.fail(new CreateTeamFailedError({ success: false, message: "Failed to create team", reason: 'create-team-failed' }))
  }
  return CreateTeamSuccess.make({
    success: true,
    message: "Team created successfully.",
  })
}))

// components/create-team.tsx
export const CreateTeamForm = () => {
  async function createTeam() {
    const result: CreateTeamSuccess | CreateTeamFailedError | InvalidPayload | InternalServerError = await createTeam({ name: 'John Doe', userId: '123' })

    // 👇 We can easily handle errors, since all our errors are fully typed
    if (result._tag === "CreateTeamFailedError") {
      sonner.error("Oops! Failed to create team: " + result.message)
    }

    // Continue…
  }
}
```

3. Create a Route Handler

```typescript
export class InternalServerError extends S.TaggedError<InternalServerError>()("InternalServerError", {
  success: S.Boolean,
  message: S.String,
  reason: S.String,
}) {}

export class InvalidPayload extends S.TaggedError<InvalidPayload>()("InvalidPayload", {
  success: S.Boolean,
  message: S.String,
  reason: S.String,
}) {}

export const invalidPayload = new InvalidPayload({ success: false, message: "Invalid payload", reason: 'invalid-payload' })
export const internalServerError = new InternalServerError({ success: false, message: "Internal server error", reason: 'internal-server-error' })

const createRouteHandler = makeRouteHandler({
  errors: {
    invalidPayload: ({ error, schema, payload }) => invalidPayload,
    unexpected: (cause: Cause.Cause<unknown>) => internalServerError
  },
  // 👇 Define your response types here (these are used for extracting response status codes, encoding etc.)
  responses: [Unauthorized, TestSuccess, TextResponse, BytesResponse]
})

export const GET = createRouteHandler(Effect.sync(() => {
  const name = yield* Next.ensureRequestSchema(S.Struct({ name: S.String }))
  return { success: true, message: `API key created for ${name.name}.` }
}))
```

3. Create a Form Handler

```typescript
// todo: write this
```

## 🎥 Write Server Actions using Effect

TODO Write Docs

## ⛓️ Write Forms using Effect

TODO Write docs

## 💻 Development

- Clone this repository
- Install dependencies using `deno install`
- Run the tests using `deno test`

## License

Made with ❤️ in Helsinki, Finland.

Published under [MIT License](./LICENSE).

## TODO

- [ ] OTEL setup
  - [ ] Work with Effect Dev Tools
- [ ] Request tracing
  - [ ] Easily add context to traces
- [ ] Way to define response types / errors
- [x] Schemas to define response types (raw, text), status codes
- [x] Headers

<!-- Links -->

[npm-href]: https://www.npmjs.com/package/notion-contentlayer
[github-actions-href]: https://github.com/useflytrap/notion-contentlayer/actions/workflows/ci.yml

<!-- Badges -->

[npm-version-src]: https://badgen.net/npm/v/notion-contentlayer?color=black
[npm-downloads-src]: https://badgen.net/npm/dw/notion-contentlayer?color=black
[prettier-src]: https://badgen.net/badge/style/prettier/black?icon=github
[github-actions-src]: https://github.com/useflytrap/notion-contentlayer/actions/workflows/ci.yml/badge.svg
