import { IslandsConfig, PartialIslandsConfig } from "./config";
import islandsJsxImportSource from "./plugins/jsx-import-source";
import islandsServe from "./plugins/build";
import islandsBuild from "./plugins/serve";

export default function islands(partialConfig: PartialIslandsConfig = {}) {
  const islandsConfig: IslandsConfig = {
    pattern: "src/*.{tsx,jsx}",
    imports: [],
    ...partialConfig,
    jsx: {
      clientImportSource: "hono/jsx/dom",
      serverImportSource: "hono/jsx",
      hydrate(jsxElement, htmlElement) {
        return `
            const { render } = await import("hono/jsx/dom"); 
            render(${jsxElement}, ${htmlElement})
          `;
      },
      ...partialConfig.jsx,
    },
  };

  return [
    islandsServe(islandsConfig),
    islandsBuild(islandsConfig),
    islandsJsxImportSource(islandsConfig),
  ];
}
