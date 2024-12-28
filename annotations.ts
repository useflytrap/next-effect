/**
 * We don't want to force people to use the @effect/platform, so we re-define the same annotations here.
 * @source https://github.com/effect-ts/effect/blob/main/packages/platform/src/HttpApiSchema.ts
 */

import type { AST } from "effect/SchemaAST";
import * as S from "effect/Schema";

export type Encoding = {
  readonly kind: "Json" | "Uint8Array" | "Text";
  readonly contentType: string;
};

export const encodingJson: Encoding = {
  kind: "Json",
  contentType: "application/json",
};

export const encodingText: Encoding = {
  kind: "Text",
  contentType: "text/plain",
};

export const encodingBytes: Encoding = {
  kind: "Uint8Array",
  contentType: "application/octet-stream",
};

export const AnnotationEncoding: unique symbol = Symbol.for(
  "neft-effect/AnnotationEncoding",
);
export const AnnotationStatus: unique symbol = Symbol.for(
  "next-effect/AnnotationStatus",
);

const mergedAnnotations = (ast: AST): Record<symbol, unknown> =>
  ast._tag === "Transformation"
    ? {
      ...ast.to.annotations,
      ...ast.annotations,
    }
    : ast.annotations;

export const getResponseAnnotation = <A>(
  ast: AST,
  key: symbol,
): A | undefined => mergedAnnotations(ast)[key] as A;
export const getStatus = (ast: AST): number =>
  getResponseAnnotation(ast, AnnotationStatus) ?? 200;
export const getEncoding = (ast: AST): Encoding =>
  getResponseAnnotation(ast, AnnotationEncoding) ?? encodingJson;

export const addResponseAnnotations = <A>(
  annotations: S.Annotations.Schema<NoInfer<A>> & {
    readonly status?: number | undefined;
    readonly encoding?: Encoding | undefined;
  },
): S.Annotations.Schema<A> => {
  // @ts-expect-error: dont know how to fix this
  const result: Record<symbol, unknown> = S.omit(
    annotations,
    "status",
    "encoding",
  );
  if (annotations.status !== undefined) {
    result[AnnotationStatus] = annotations.status;
  }
  if (annotations.encoding !== undefined) {
    result[AnnotationEncoding] = annotations.encoding;
  }
  return result;
};
