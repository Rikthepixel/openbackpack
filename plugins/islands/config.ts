export type IslandsJsxConfig = {
  /**
   * A importSource for the jsx, akin to what you might see in a `tsconfig.json`
   *
   * When building for the client this importSource will be used instead of the `serverImportSource`
   *
   * @default "hono/jsx/dom"
   */
  clientImportSource: string;
  /**
   * A importSource for the jsx, akin to what you might see in a `tsconfig.json`
   *
   * When building for the server this importSource will be used instead of the `clientImportSource`
   *
   * @default "hono/jsx"
   */
  serverImportSource: string;

  /**
   * @description
   *
   * Either:
   * - A function that returns the TypeScript/JavaScript code that should be used for hydrating/rendering the islands.
   * - A string that leads to an entrypoint file that exports `hydrate(container: HtmlElement, Element: any, props: object): void`.
   *
   * @default "const { render } = await import("hono/jsx/dom"); render(${jsxElement}, ${htmlElement})"
   */
  hydrate: ((jsxElement: string, htmlElement: string) => string) | string;
};

export type IslandsConfig = {
  /**
   * A glob pattern used to find files that may contain islands at build-time.
   *
   * @default "src/*.{tsx,jsx}"
   */
  pattern: string | string[];

  /**
   * Adds import statements at the top of all island files. The import can either be relative or absolute
   *
   * @default `[]`
   *
   * @example Importing css
   * `["./src/assets/index.css"]`
   * @example Importing an init file
   * `["./src/init.ts"]`
   * @example Absolute
   * `[path.resolve(process.cwd(), "./src/init.ts")]`
   */
  imports: string[];

  /** JSX configuration */
  jsx: IslandsJsxConfig;
};

export type PartialIslandsConfig = Partial<Omit<IslandsConfig, "jsx">> & {
  jsx?: Partial<IslandsJsxConfig>;
};
