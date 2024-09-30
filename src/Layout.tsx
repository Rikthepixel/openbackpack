import { raw } from "hono/html";
import { PropsWithChildren } from "hono/jsx";

export default function Layout(props: PropsWithChildren) {
  return (
    <>
      {raw("<!DOCTYPE html>")}
      <html>
        <head></head>
        <body>{props.children}</body>
      </html>
    </>
  );
}
