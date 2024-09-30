import { Plugin } from "vite";
import { IslandsConfig } from "../config";
import path from "path";

type IslandsImportsConfig = {
  apply: "serve" | "build";
  islandsConfig: IslandsConfig;
  isIsland: (id: string) => boolean;
};

const VIRTUAL_IMPORTS_PREFIX = "virtual:islands-imports-";

export function islandsImports({
  apply,
  islandsConfig,
  isIsland,
}: IslandsImportsConfig): Plugin | null {
  if (!islandsConfig.imports || islandsConfig.imports.length === 0) {
    return null;
  }

  const imports = islandsConfig.imports.map((moduleId) => {
    return path.isAbsolute(moduleId)
      ? moduleId
      : path.resolve(process.cwd(), moduleId);
  });

  return {
    name: "vite-plugin-islands--imports--" + apply,
    enforce: "pre",
    apply,

    resolveId(source) {
      if (source.startsWith(VIRTUAL_IMPORTS_PREFIX)) {
        const idx = parseInt(source.substring(VIRTUAL_IMPORTS_PREFIX.length));
        return imports.at(idx);
      }

      return null;
    },

    transform(code, id, options) {
      if (options?.ssr || !isIsland(id)) {
        return;
      }

      return {
        code:
          islandsConfig.imports
            .map((_, idx) => {
              return `import "${VIRTUAL_IMPORTS_PREFIX}${idx}"`;
            })
            .join("\n") +
          "\n" +
          code,
      };
    },
  };
}
