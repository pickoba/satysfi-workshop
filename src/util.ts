import { workspace } from "vscode";
import { ExtensionConfig } from "./types";

const configScope = "satysfi";

export function getConfig() {
  return workspace.getConfiguration(configScope) as unknown as ExtensionConfig;
}
