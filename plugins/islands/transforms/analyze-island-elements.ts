import ts from "typescript";
import {
  getJsxElementTagName,
  getRootIdentifier,
  isJsxElementWithIslandLoadAttribute,
  traceToDeclaration,
} from "../helpers/ast";

export function makeAnalyzeIslandElements(
  checker: ts.TypeChecker,
  onIslandFound: (
    id: string,
    element: string,
    importPath?: string,
  ) => void | Promise<void>,
) {
  return async function analyzeIslandElements(
    id: string,
    node: ts.Node,
  ): Promise<void> {
    if (node === undefined) {
      return;
    }
    const children =
      node?.getChildren().map((node) => analyzeIslandElements(id, node)) ?? [];
    await Promise.all(children);

    if (isJsxElementWithIslandLoadAttribute(node)) {
      const tagName = getJsxElementTagName(node);
      const [tagNamePath, tagIdentifier] = getRootIdentifier(tagName);

      const [declarationType, importPath] = traceToDeclaration(
        tagIdentifier!,
        checker,
      );

      if (declarationType === "literal" || declarationType === "unknown") {
        return;
      }

      await onIslandFound(id, tagNamePath.join("."), importPath);
    }
  };
}
