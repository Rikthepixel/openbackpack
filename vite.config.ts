import { defineConfig } from "vite";
import islands from "./plugins/islands";
import devServer from "@hono/vite-dev-server";

export default defineConfig({
  plugins: [
    islands({
      imports: ["src/assets/index.css"],
    }),
    devServer({
      entry: "./src/app.tsx",
    }),
  ],
});
