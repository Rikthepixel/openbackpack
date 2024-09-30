import { ConfigEnv, Plugin, ResolvedConfig } from "vite";
import { parseTs } from "../helpers/ast";
import { makeAnalyzeIslandElements } from "../transforms/analyze-island-elements";
import { makeTransformIslandElements } from "../transforms/transform-island-elements";
import ts from "typescript";

type IslandsTransformElementsConfig = {
  apply: "build" | "serve";
  getHash(id: string): string;
  getSiblings(id: string): ts.JsxChild[];
  onIslandTransform(moduleId: string, element: string): void;
};

export default function islandsTransformElements({
  apply,
  getHash,
  getSiblings,
  onIslandTransform,
}: IslandsTransformElementsConfig): Plugin {
  let viteConfig: ResolvedConfig;
  let viteEnv: ConfigEnv;

  return {
    name: "vite-plugin-islands--transform-elements--" + apply,
    enforce: "pre",
    apply,

    config(_, env) {
      viteEnv = env;
    },
    configResolved(config) {
      viteConfig = config;
    },
    async transform(_, id) {
      if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) {
        return;
      }

      const [source, checker] = parseTs(id);

      const elementImportMap = new Map<string, string>();

      await makeAnalyzeIslandElements(
        checker,
        async (id, element, importPath) => {
          const resolved = await this.resolve(importPath ?? id, id);
          if (!resolved) return;
          elementImportMap.set(element, resolved.id);
        },
      )(id, source);

      let transformed = makeTransformIslandElements({
        checker,
        id,
        elementImportMap,
        ctx: this,
        hash: getHash,
        siblings: getSiblings,
        onIslandTransform(info) {
          onIslandTransform(info.moduleId, info.tagName);
        },
      })(source) as ts.SourceFile;

      return {
        code: ts
          .createPrinter({ removeComments: false })
          .printNode(
            ts.EmitHint.Unspecified,
            transformed,
            ts.createSourceFile("__temp-file.tsx", "", ts.ScriptTarget.ESNext),
          ),
      };
    },
  };
}
