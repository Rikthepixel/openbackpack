/// <reference path="./import-meta.d.ts" />

import { FC } from "hono/jsx";

declare global {
  export type IslandProps = {
    "island-load"?: boolean;
  };
}

export {};
