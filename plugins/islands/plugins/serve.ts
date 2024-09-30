import { normalizePath, Plugin } from "vite";
import { IslandsConfig } from "../config";
import path from "path";
import { getOrCreate } from "../helpers/map";
import islandsHydrate from "./hydrate";
import islandsTransformElements from "./transfor-island-elements";
import { createJsxScriptTag } from "../helpers/ast";

export default function islandsServe(islandsConfig: IslandsConfig): Plugin[] {
  const islandsModuleMeta = new Map<string, Set<string>>();

  function file(id: string) {
    // like "/src/components/button.tsx"
    return "/" + normalizePath(path.relative(process.cwd(), id));
  }

  return [
    islandsTransformElements({
      apply: "serve",
      getHash: file,
      getSiblings(id) {
        return [createJsxScriptTag("module", file(id))];
      },
      onIslandTransform(moduleId, element) {
        getOrCreate(islandsModuleMeta, moduleId, () => new Set()).add(element);
      },
    }),
    islandsHydrate({
      apply: "serve",
      islandsConfig,
      getElements(id) {
        return getOrCreate(islandsModuleMeta, id, () => new Set());
      },
      getHash: file,
    }),
  ];
}
