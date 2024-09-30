import path from "path";
import { InputOption } from "rollup";
import crypto from "crypto";
import { normalizePath } from "vite";

export function mergeInput(
  base: InputOption,
  additions: string[],
): Record<string, string> {
  let merged: Record<string, string> = Object.fromEntries(
    additions.map((input) => [path.basename(input), input]),
  );

  if (typeof base === "string") {
    merged[base] = base;
  } else if (Array.isArray(base)) {
    merged = Object.assign(
      {},
      Object.fromEntries(base.map((input) => [path.basename(input), input])),
      merged,
    );
  } else {
    merged = Object.assign({}, base, merged);
  }

  return merged;
}

export function filePathHash(filePath: string) {
  return crypto
    .createHash("sha256")
    .update(normalizePath(filePath))
    .digest("base64url");
}
