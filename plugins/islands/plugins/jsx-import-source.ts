import { Plugin } from "vite";
import { IslandsConfig } from "../config";

/**
 * Makes sure that the correct jsx import source is used
 */
export default function islandsJsxImportSource(
  islandsConfig: IslandsConfig,
): Plugin {
  return {
    name: "vite-plugin-islands--jsx-import-source",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (
        islandsConfig.jsx.serverImportSource ===
        islandsConfig.jsx.clientImportSource
      ) {
        return null;
      }

      if (source === islandsConfig.jsx.serverImportSource && !options.ssr) {
        return this.resolve(islandsConfig.jsx.clientImportSource, importer, {
          isEntry: options.isEntry,
          attributes: options.attributes,
          custom: options.custom,
        });
      }

      if (source === islandsConfig.jsx.clientImportSource && options.ssr) {
        return this.resolve(islandsConfig.jsx.serverImportSource, importer, {
          isEntry: options.isEntry,
          attributes: options.attributes,
          custom: options.custom,
        });
      }

      return null;
    },
    transform(code, id, options) {
      if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) {
        return;
      }

      return {
        code:
          `/** @jsxImportSource ${options?.ssr ? islandsConfig.jsx.serverImportSource : islandsConfig.jsx.clientImportSource} */\n` +
          code,
      };
    },
  };
}
