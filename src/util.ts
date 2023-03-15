import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { tmpdir } from "os";
import * as path from "path";
import { ColorThemeKind, commands, Position, window } from "vscode";
import * as Parser from "web-tree-sitter";
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

export function getAuxPath(originalPath: string): string {
  const ext = path.extname(originalPath);
  return path.join(path.dirname(originalPath), `${path.basename(originalPath, ext)}.satysfi-aux`);
}

export async function getTmpDir(): Promise<string> {
  const dir = path.join(tmpdir(), EXTENSION_NAME);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function positionToPoint(position: Position): Parser.Point {
  return { row: position.line, column: position.character };
}

export function pointToPosition(point: Parser.Point): Position {
  return new Position(point.row, point.column);
}

export function isDarkTheme(): boolean {
  switch (window.activeColorTheme.kind) {
    case ColorThemeKind.Light:
    case ColorThemeKind.HighContrastLight:
      return false;
    case ColorThemeKind.Dark:
    case ColorThemeKind.HighContrast:
      return true;
  }
}
