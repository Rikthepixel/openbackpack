import { normalizePath, PluginOption } from "vite";
import { IslandsConfig } from "../config";
import path from "path";
import { getOrCreate } from "../helpers/map";
import islandsHydrate from "./hydrate";
import islandsTransformElements from "./transform-elements";
import { createJsxScriptTag } from "../helpers/ast";
import { islandsImports } from "./imports";

export default function islandsServe(
  islandsConfig: IslandsConfig,
): PluginOption[] {
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
    islandsImports({
      apply: "serve",
      islandsConfig,
      isIsland(id) {
        return getOrCreate(islandsModuleMeta, id, () => new Set()).size > 0;
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
