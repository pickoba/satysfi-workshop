import { existsSync } from "fs";
import * as path from "path";
import { commands, window } from "vscode";
import { EXTENSION_NAME } from "./const";

export async function showErrorWithOpenSettings(
  message: string,
  workspace: boolean,
): Promise<void> {
  const item = await window.showErrorMessage(message, "Open Settings");

  if (item === "Open Settings") {
    commands.executeCommand("workbench.action.openSettings", `@ext:${EXTENSION_NAME}`);
    if (workspace) commands.executeCommand("workbench.action.openWorkspaceSettings");
  }
}

export function getWorkPath(originalPath: string): string {
  const ext = path.extname(originalPath);
  const namebase = path.join(path.dirname(originalPath), path.basename(originalPath, ext));

  let name: string;
  do {
    const nonce = Math.random().toString(36).slice(-8);
    name = `${namebase}.check-${nonce}${ext}`;
  } while (existsSync(name));

  return name;
}
