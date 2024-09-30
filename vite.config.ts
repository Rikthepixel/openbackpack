import { defineConfig } from "vite";
import islands from "./plugins/islands";
import devServer from "@hono/vite-dev-server";

export default defineConfig({
  plugins: [
    islands({
      jsx: {
        hydrate: "./src/entry.tsx"
      }
    }),
    devServer({
      entry: "./src/app.tsx",
    }),
  ],
});
