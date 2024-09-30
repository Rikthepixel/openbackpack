import { Nested } from "./nested";
import { useCount } from "./use-count";

export function World(props: IslandProps) {
  const count = useCount();
  return <>world {count} <Nested /></>;
}

