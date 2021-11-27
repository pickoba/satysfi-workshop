import * as vscode from "vscode";
import { EXTENSION_NAME } from "../const";

export async function activate(
  filename: string,
): Promise<{ document: vscode.TextDocument; editor: vscode.TextEditor }> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ext = vscode.extensions.getExtension(EXTENSION_NAME)!;
  await ext.activate();

  const [docUri] = await vscode.workspace.findFiles(filename, null, 1);

  const document = await vscode.workspace.openTextDocument(docUri);
  const editor = await vscode.window.showTextDocument(document);

  return { document, editor };
}
