import ts, { factory, ObjectLiteralElementLike } from "typescript";
import {
  createJsxAttributes,
  getJsxElementAttributes,
  getJsxElementTagName,
  getRootIdentifier,
  isJsxElementWithIslandLoadAttribute,
  traceToDeclaration,
} from "../helpers/ast";
import { TransformPluginContext } from "rollup";

type IslandInfo = {
  hash: string;
  moduleId: string;
  tagName: string;
  props: ObjectLiteralElementLike[];
  node: ts.JsxElement | ts.JsxSelfClosingElement;
};

type TransformIslandElementsOptions = {
  checker: ts.TypeChecker;
  id: string;
  ctx: TransformPluginContext;
  elementImportMap: Map<string, string>;
  hash: (this: TransformPluginContext, moduleId: string) => string;
  siblings(
    this: TransformPluginContext,
    moduleId: string,
  ): ts.JsxChild[] | undefined | void;
  onIslandTransform?: (this: TransformPluginContext, info: IslandInfo) => void;
};

export function makeTransformIslandElements(
  options: TransformIslandElementsOptions,
) {
  function transformIslandElements(node: ts.Node) {
    if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      !ts.isStringLiteralOrJsxExpression(node.initializer)
    ) {
      // Prevents bug where JsxElements cause ts compiler error when not wrapped in a JsxExpression
      node = ts.factory.updateJsxAttribute(
        node,
        node.name,
        ts.factory.createJsxExpression(undefined, node.initializer),
      );
    }

    node = ts.visitEachChild(node, transformIslandElements, undefined);

    if (isJsxElementWithIslandLoadAttribute(node)) {
      const attributes = getJsxElementAttributes(node);
      const tagName = getJsxElementTagName(node);
      const [tagNamePath, tagIdentifier] = getRootIdentifier(tagName);

      const [declarationType] = traceToDeclaration(
        tagIdentifier!,
        options.checker,
      );
      if (declarationType === "literal" || declarationType === "unknown") {
        return node;
      }

      const serializableProps: ts.ObjectLiteralElementLike[] = [];
      for (const attribute of attributes.properties) {
        if (attribute.kind === ts.SyntaxKind.JsxSpreadAttribute) {
          serializableProps.push(
            ts.factory.createSpreadAssignment(
              attribute.name?.kind === ts.SyntaxKind.ComputedPropertyName
                ? attribute.name.expression
                : attribute.name!,
            ),
          );
          continue;
        }

        let propertyName: ts.PropertyName =
          attribute.name.kind === ts.SyntaxKind.JsxNamespacedName
            ? ts.factory.createStringLiteral(
                attribute.name.name.text + ":" + attribute.name.namespace.text,
              )
            : attribute.name;

        if (
          typeof propertyName !== "string" &&
          propertyName.text === "island-load"
        ) {
          continue;
        }

        if (ts.isIdentifier(propertyName)) {
          propertyName = ts.factory.createStringLiteral(propertyName.text);
        }

        if (!attribute.initializer) {
          serializableProps.push(
            ts.factory.createPropertyAssignment(
              propertyName,
              ts.factory.createTrue(),
            ),
          );
          continue;
        }

        if (ts.isJsxExpression(attribute.initializer)) {
          serializableProps.push(
            ts.factory.createPropertyAssignment(
              propertyName,
              attribute.initializer.dotDotDotToken &&
                attribute.initializer.expression
                ? ts.factory.createSpreadElement(
                    attribute.initializer.expression,
                  )
                : attribute.initializer.expression ?? ts.factory.createTrue(),
            ),
          );
          continue;
        }

        serializableProps.push(
          ts.factory.createPropertyAssignment(
            propertyName,
            attribute.initializer,
          ),
        );
      }

      if (ts.isJsxElement(node)) {
        serializableProps.push(
          ts.factory.createPropertyAssignment(
            ts.factory.createStringLiteral("children"),
            ts.factory.createArrayLiteralExpression(
              node.children
                .map((child) => {
                  if (ts.isJsxExpression(child)) {
                    if (child.dotDotDotToken && child.expression) {
                      return ts.factory.createSpreadElement(child.expression);
                    }
                    return child.expression ?? null;
                  }
                  if (ts.isExpression(child)) {
                    return child;
                  }

                  if (child.text === undefined) {
                    return null;
                  }

                  return ts.factory.createStringLiteral(child.text.trim());
                })
                .filter((child) => child !== null),
              false,
            ),
          ),
        );
      }

      const moduleId = options.elementImportMap.get(tagNamePath.join("."));

      if (!moduleId) {
        return node;
      }

      const info: IslandInfo = {
        hash: options.hash.call(options.ctx, moduleId),
        moduleId,
        tagName: tagNamePath.join("."),
        props: serializableProps,
        node: node,
      };

      options.onIslandTransform?.call(options.ctx, info);

      return ts.factory.createJsxFragment(
        ts.factory.createJsxOpeningFragment(),
        [
          ...(options.siblings?.call(options.ctx, moduleId) ?? []),
          ts.factory.createJsxElement(
            ts.factory.createJsxOpeningElement(
              ts.factory.createIdentifier("div"),
              undefined,
              createJsxAttributes({
                style: ts.factory.createStringLiteral("display:contents"),
                "data-island-hash": ts.factory.createStringLiteral(info.hash),
                "data-island-component": ts.factory.createStringLiteral(
                  info.tagName,
                ),
                "data-island-hydrated": ts.factory.createStringLiteral("false"),
                "data-island-props":
                  info.props.length === 0
                    ? undefined
                    : ts.factory.createJsxExpression(
                        undefined,
                        ts.factory.createCallExpression(
                          ts.factory.createPropertyAccessExpression(
                            ts.factory.createIdentifier("JSON"),
                            ts.factory.createIdentifier("stringify"),
                          ),
                          undefined,
                          [
                            ts.factory.createObjectLiteralExpression(
                              info.props,
                            ),
                          ],
                        ),
                      ),
              }),
            ),
            [node as ts.JsxElement],
            ts.factory.createJsxClosingElement(
              ts.factory.createIdentifier("div"),
            ),
          ),
        ],
        ts.factory.createJsxJsxClosingFragment(),
      );
    }

    return node;
  }

  return (source: ts.SourceFile) =>
    ts.visitNode(source, transformIslandElements) as ts.SourceFile;
}
