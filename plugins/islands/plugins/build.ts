import ts from "typescript";
import {
  ConfigEnv,
  Manifest,
  mergeConfig,
  normalizePath,
  PluginOption,
  ResolvedConfig,
  UserConfig,
} from "vite";
import { createJsxScriptTag, createJsxStylesheetLinkTag } from "../helpers/ast";
import { IslandsConfig } from "../config";
import { getOrCreate } from "../helpers/map";
import { glob } from "glob";
import { mergeInput, filePathHash } from "../helpers/vite";
import path from "path";
import fs from "fs/promises";
import islandsHydrate from "./hydrate";
import islandsTransformElements from "./transform-elements";
import { makeAnalyzeIslandElements } from "../transforms/analyze-island-elements";
import { islandsImports } from "./imports";

export default function islandsBuild(
  islandsConfig: IslandsConfig,
): PluginOption[] {
  let config: ResolvedConfig;
  let env: ConfigEnv;
  let manifest: Manifest;
  const islandsModuleMeta = new Map<string, Set<string>>();

  function hash(id: string) {
    return filePathHash(path.relative(process.cwd(), id)).substring(0, 12);
  }

  function unixTimestamp() {
    return new Date(Date.now()).getTime();
  }

  return [
    {
      name: "vite-plugin-islands--build--prepare-inputs",
      enforce: "pre",
      apply: "build",
      async config(config, viteEnv) {
        env = viteEnv;

        // On the client-side we want to gather the inputs
        if (env.isSsrBuild) {
          return mergeConfig(config, {
            build: {
              emptyOutDir: false,
            },
          } as UserConfig);
        }

        const potentialIslands = await glob(islandsConfig.pattern);

        const program = ts.createProgram({
          rootNames: potentialIslands,
          options: {
            target: ts.ScriptTarget.ESNext,
          },
        });

        const checker = program.getTypeChecker();
        const entries = new Set<string>();

        const analyzeIslandElements = makeAnalyzeIslandElements(
          checker,
          (file, element, importPath) => {
            let id = importPath ?? file;
            if (!path.isAbsolute(id)) {
              id = normalizePath(
                path.resolve(path.dirname(path.join(process.cwd(), file)), id),
              );
            }

            getOrCreate(islandsModuleMeta, id, () => new Set()).add(element);
            entries.add(id);
          },
        );

        const entriesTasks = potentialIslands.map(async (file) => {
          const source = program.getSourceFile(file);
          if (!source) {
            throw new Error("For some reason a file could not be found");
          }

          await analyzeIslandElements(file, source);
        });

        await Promise.all(entriesTasks);

        if (config.build?.rollupOptions?.input === "index.html") {
          config.build.rollupOptions.input = undefined;
        }

        const entriesConfig: UserConfig = {
          build: {
            manifest: true,
            rollupOptions: {
              input: mergeInput(
                config.build?.rollupOptions?.input ?? {},
                Array.from(entries),
              ),
            },
          },
        };

        return mergeConfig(config, entriesConfig);
      },
      async configResolved(resolved) {
        config = resolved;
        if (env.isSsrBuild) {
          manifest = await fs
            .readFile(
              path.resolve(resolved.build.outDir, ".vite/manifest.json"),
            )
            .then((file) => file.toString())
            .then<Manifest>(JSON.parse);
        }
      },
      async buildStart() {
        for (const [file, meta] of Array.from(islandsModuleMeta)) {
          const resolved = await this.resolve(file);
          if (!resolved) continue;
          islandsModuleMeta.delete(file);
          islandsModuleMeta.set(resolved.id, meta);
        }
      },
    },
    islandsTransformElements({
      apply: "build",
      getHash: hash,
      getSiblings(id) {
        if (!env.isSsrBuild) {
          return [];
        }

        const fileManifest =
          manifest[normalizePath(path.relative(process.cwd(), id))];

        if (!fileManifest) {
          console.error("No file manifest found for: " + id);
          return [];
        }

        const sibilings = [
          createJsxScriptTag(
            "module",
            config.base + fileManifest.file + "?t=" + unixTimestamp(),
          ),
        ];

        for (const css of fileManifest.css ?? []) {
          sibilings.push(
            createJsxStylesheetLinkTag(
              config.base + css + "?t=" + unixTimestamp(),
            ),
          );
        }

        return sibilings;
      },
      onIslandTransform(id, element) {
        getOrCreate(islandsModuleMeta, id, () => new Set()).add(element);
      },
    }),
    islandsImports({
      apply: "build",
      islandsConfig,
      isIsland(id) {
        return getOrCreate(islandsModuleMeta, id, () => new Set()).size > 0;
      },
    }),
    islandsHydrate({
      apply: "build",
      islandsConfig,
      getElements(id) {
        return getOrCreate(islandsModuleMeta, id, () => new Set());
      },
      getHash: hash,
    }),
  ];
}
