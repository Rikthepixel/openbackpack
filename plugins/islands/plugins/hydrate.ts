import path from "path";
import { ConfigEnv, Plugin } from "vite";
import { IslandsConfig } from "../config";

type IslandsHydrateConfig = {
  apply: "build" | "serve";
  islandsConfig: IslandsConfig;
  getElements: (id: string) => Iterable<string>;
  getHash: (id: string) => string;
};

const HTML_ELEMENT = "ISLAND_HTML_ELEMENT";
const VIRTUAL_HYDRATOR = "virtual:island-hydrator";

/** Adds hydration code to all islands */
export default function islandsHydrate({
  apply,
  islandsConfig,
  getElements,
  getHash,
}: IslandsHydrateConfig): Plugin {
  let viteEnv: ConfigEnv;
  return {
    name: "vite-plugin-islands--hydrate--" + apply,
    enforce: "pre",
    apply,

    config(_, env) {
      viteEnv = env;
    },

    async resolveId(source, importer) {
      if (source === VIRTUAL_HYDRATOR) {
        if (typeof islandsConfig.jsx.hydrate !== "string") {
          throw new Error(
            `File: "${importer}" attempted to import ${source}, but \`jsx.hydrate\` was not a string (entrypoint file)`,
          );
        }

        return path.isAbsolute(islandsConfig.jsx.hydrate)
          ? islandsConfig.jsx.hydrate
          : path.resolve(process.cwd(), islandsConfig.jsx.hydrate);
      }

      return null;
    },

    async transform(code, id) {
      const elements = Array.from(getElements(id));

      if (elements.length === 0 || viteEnv.isSsrBuild) {
        return;
      }

      return {
        code:
          code +
          `\nif (typeof document !== "undefined") {
          ${Array.from(elements)
            .map((element) => {
              const hydrator =
                typeof islandsConfig.jsx.hydrate === "string"
                  ? `await import("virtual:island-hydrator").then(({ hydrate }) => {
                      hydrate(${HTML_ELEMENT}, ${element}, JSON.parse(${HTML_ELEMENT}.dataset.islandProps ?? "{}"))
                    })`
                  : islandsConfig.jsx.hydrate(
                      `<${element} {...JSON.parse(${HTML_ELEMENT}.dataset.islandProps ?? "{}")} />`,
                      HTML_ELEMENT,
                    );

              return `document
                .querySelectorAll('[data-island-hash="${getHash(id)}"][data-island-component="${element}"]:not([data-island-hydrated="true"])')
                .forEach(async(${HTML_ELEMENT}) => {
                  ${hydrator}
                  ${HTML_ELEMENT}.dataset.islandHydrated = "true";
                })`;
            })
            .join("\n")}
        }`,
      };
    },
  };
}
