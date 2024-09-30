import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import path from "path";
import Layout from "./Layout";

const app = new Hono();

if (import.meta.env.PROD) {
  app.use(
    "/assets/*",
    serveStatic({
      root: path.relative(process.cwd(), import.meta.dirname),
    }),
  );
}

app.get("/", (c) => {
  const jsx = (
    <Layout>
    </Layout>
  );

  return c.html(jsx);
});

export type AppType = typeof app
export default app;
