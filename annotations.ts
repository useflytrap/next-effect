// @ts-nocheck

/**
 * We don't want to force people to use the @effect/platform, so we re-define the same annotations here.
 * @source https://github.com/effect-ts/effect/blob/main/packages/platform/src/HttpApiSchema.ts
 */

import * as AST from "effect/SchemaAST"
import { Option, Schema as S } from "effect";

export type Encoding = {
  readonly kind: "Json" | "Uint8Array" | "Text"
  readonly contentType: string
}

export const encodingJson: Encoding = {
  kind: "Json",
  contentType: "application/json"
}

export const AnnotationEncoding: unique symbol = Symbol.for("neft-effect/AnnotationEncoding")
export const AnnotationStatus: unique symbol = Symbol.for("next-effect/AnnotationStatus")

const mergedAnnotations = (ast: AST.AST): Record<symbol, unknown> =>
  ast._tag === "Transformation" ?
    {
      ...ast.to.annotations,
      ...ast.annotations
    } :
    ast.annotations

export const getResponseAnnotation = <A>(ast: AST.AST, key: symbol): A | undefined => mergedAnnotations(ast)[key] as A
export const getStatus = (ast: AST.AST): number => getResponseAnnotation(ast, AnnotationStatus) ?? 200
export const getEncoding = (ast: AST.AST): Encoding => getResponseAnnotation(ast, AnnotationEncoding) ?? encodingJson

export const annotations = <A>(
  annotations: S.Annotations.Schema<NoInfer<A>> & {
    readonly status?: number | undefined
    readonly encoding?: Encoding | undefined
  }
): S.Annotations.Schema<A> => {
  const result: Record<symbol, unknown> = S.omit(annotations, "status", "encoding")
  if (annotations.status !== undefined) {
    result[AnnotationStatus] = annotations.status
  }
  if (annotations.encoding !== undefined) {
    result[AnnotationEncoding] = annotations.encoding
  }
  return result
}
