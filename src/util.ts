import { existsSync } from "fs";
import * as fp from "path";
import { workspace } from "vscode";
import { ExtensionConfig } from "./types";

const configScope = "satysfi";

export function getConfig() {
  return workspace.getConfiguration(configScope) as unknown as ExtensionConfig;
}

export function getWorkPath(path: string) {
  const ext = fp.extname(path);
  const namebase = fp.join(fp.dirname(path), fp.basename(path, ext));

  let name: string;
  do {
    const nonce = Math.random().toString(36).slice(-8);
    name = `${namebase}.check-${nonce}${ext}`;
  } while (existsSync(name));

  return name;
}
