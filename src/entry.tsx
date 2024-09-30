import { FC, render } from "hono/jsx/dom";
import "./assets/root.css"

export function hydrate(container: HTMLElement, Element: FC<object>, props: object) {
  render(<Element {...props} />, container);
}
