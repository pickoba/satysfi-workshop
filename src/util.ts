import { existsSync } from "fs";
import * as fp from "path";
import { commands, window, workspace } from "vscode";
import { EXTENSION_NAME } from "./const";
import { ExtensionConfig } from "./types";

const configScope = "satysfi";

export function getConfig() {
  return workspace.getConfiguration(configScope) as unknown as ExtensionConfig;
}

export async function showErrorWithOpenSettings(message: string, workspace: boolean) {
  const item = await window.showErrorMessage(message, "Open Settings");

  if (item === "Open Settings") {
    commands.executeCommand("workbench.action.openSettings", `@ext:${EXTENSION_NAME}`);
    if (workspace) commands.executeCommand("workbench.action.openWorkspaceSettings");
  }
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