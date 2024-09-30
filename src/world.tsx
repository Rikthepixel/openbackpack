import { Child } from "hono/jsx";
import { Nested } from "./nested";
import { useCount } from "./use-count";

export function World(props: IslandProps & { from: number, children? : Child}) {
  const count = useCount();
  return <>world {props.from + count} <Nested /> {props.children}</>;
}

