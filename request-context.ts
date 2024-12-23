import { Context } from "effect"

export type DefaultLogContext = {
  type: "route-handler" | "server-action" | "page-handler"
  requestId: string
}

export type RequestLogContext = DefaultLogContext

export type RequestContextType = RequestLogContext & { rawRequest: unknown | Request | FormData }
export class RequestContext extends Context.Tag("flytrap/server/RequestContext")<
  RequestContext,
  RequestContextType
>() {}
