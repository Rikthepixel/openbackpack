import ts from "typescript";

export function parseTs(moduleId: string) {
  const program = ts.createProgram({
    rootNames: [moduleId],
    options: {
      target: ts.ScriptTarget.ESNext,
    },
  });

  return [program.getSourceFile(moduleId)!, program.getTypeChecker()] as const;
}

export function isJsxElementWithIslandLoadAttribute(
  node: ts.Node,
): node is ts.JsxElement | ts.JsxSelfClosingElement {
  if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
    return false;
  }

  for (const attribute of getJsxElementAttributes(node).properties) {
    if (
      ts.isJsxAttribute(attribute) &&
      attribute.name &&
      ts.isIdentifier(attribute.name) &&
      attribute.name.text === "island-load" &&
      (attribute.initializer === undefined ||
        (ts.isJsxExpression(attribute.initializer) &&
          attribute.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword))
    ) {
      return true;
    }
  }
  return false;
}

export function getJsxElementTagName(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
) {
  return node.kind === ts.SyntaxKind.JsxSelfClosingElement
    ? node.tagName
    : node.openingElement.tagName;
}
export function getJsxElementAttributes(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
) {
  return node.kind === ts.SyntaxKind.JsxSelfClosingElement
    ? node.attributes
    : node.openingElement.attributes;
}

export function isJsxElementWithTagName(
  node: ts.Node,
  tagName: string,
): node is ts.JsxElement | ts.JsxSelfClosingElement {
  if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
    return false;
  }

  const tag = ts.isJsxSelfClosingElement(node)
    ? node.tagName
    : node.openingElement.tagName;

  const [path] = getRootIdentifier(tag);

  return path.join(".") === tagName;
}

export function traceToDeclaration(
  node: ts.Node,
  checker: ts.TypeChecker,
): ["import", string] | ["literal" | "variable" | "unknown"] {
  const declarations = checker.getSymbolAtLocation(node)?.getDeclarations();

  if (!declarations || declarations.length === 0) {
    return ["literal"]; // Likely a literal element
  }

  for (const declaration of declarations) {
    if (ts.isImportSpecifier(declaration)) {
      const moduleSpecifier = declaration.parent.parent.parent.moduleSpecifier;

      if (ts.isStringLiteral(moduleSpecifier)) {
        return ["import", moduleSpecifier.text];
      }
    } else if (ts.isVariableDeclaration(node)) {
      return ["variable"];
    }
  }

  return ["unknown"];
}

export function getRootIdentifier(
  node: ts.JsxTagNameExpression,
  path: string[] = [],
): [string[], ts.Identifier] | [string[], null] {
  if (ts.isIdentifier(node)) {
    return [[node.escapedText.toString(), ...path], node];
  }

  if (node.kind === ts.SyntaxKind.JsxNamespacedName) {
    return [[node.namespace.text, node.name.text], node.namespace] as const;
  }

  if (node.kind === ts.SyntaxKind.ThisKeyword) {
    return [path, null];
  }

  return getRootIdentifier(node.expression, [node.name.text, ...path]);
}

export function getContainingScopes(node: ts.Node): ts.Node[] {
  const scopes: ts.Node[] = [];

  ts.findAncestor(node, (parent) => {
    if (ts.isSourceFile(parent) || ts.isFunctionLike(parent)) {
      scopes.push(parent);
    }
    return false;
  });

  return scopes;
}

export function createJsxAttributes(
  attributes: Record<string, ts.JsxAttributeValue | undefined>,
) {
  return ts.factory.createJsxAttributes(
    Object.entries(attributes)
      .filter(([, value]) => value)
      .map(([key, value]) => {
        return ts.factory.createJsxAttribute(
          ts.factory.createIdentifier(key),
          value,
        );
      }),
  );
}

export function createJsxScriptTag(type: string, src: string) {
  return ts.factory.createJsxSelfClosingElement(
    ts.factory.createIdentifier("script"),
    undefined,
    createJsxAttributes({
      type: ts.factory.createStringLiteral(type),
      src: ts.factory.createStringLiteral(src),
    }),
  );
}

export function createJsxStylesheetLinkTag(href: string) {
  return ts.factory.createJsxSelfClosingElement(
    ts.factory.createIdentifier("link"),
    undefined,
    createJsxAttributes({
      rel: ts.factory.createStringLiteral("stylesheet"),
      href: ts.factory.createStringLiteral(href),
    }),
  );
}
