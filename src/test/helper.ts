import * as assert from "assert";
import * as vscode from "vscode";
import { EXTENSION_NAME } from "../const";

export async function activate(
  filename: string,
): Promise<{ document: vscode.TextDocument; editor: vscode.TextEditor }> {
  const ext = vscode.extensions.getExtension(EXTENSION_NAME);
  assert.ok(ext);
  await ext.activate();

  const [docUri] = await vscode.workspace.findFiles(filename, null, 1);
  if (!docUri) throw new Error(`File not found: ${filename}`);

  const document = await vscode.workspace.openTextDocument(docUri);
  const editor = await vscode.window.showTextDocument(document);

  return { document, editor };
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
