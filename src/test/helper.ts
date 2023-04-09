import * as assert from "assert";
import * as vscode from "vscode";
import { ExtensionConfig } from "../configSchema";
import { EXTENSION_NAME } from "../const";

export async function activateExtension(): Promise<void> {
  const ext = vscode.extensions.getExtension(EXTENSION_NAME);
  assert.ok(ext);
  await ext.activate();
}

export async function activateFile(
  filename: string,
): Promise<{ document: vscode.TextDocument; editor: vscode.TextEditor }> {
  const [docUri] = await vscode.workspace.findFiles(filename, null, 1);
  if (!docUri) throw new Error(`File not found: ${filename}`);

  const document = await vscode.workspace.openTextDocument(docUri);
  const editor = await vscode.window.showTextDocument(document);

  return { document, editor };
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const defaultConfig: ExtensionConfig = {
  executable: "satysfi",
  build: {
    buildOptions: [],
    when: "never",
    rootFile: "",
  },
  typecheck: {
    buildOptions: ["--full-path", "--type-check-only", "--bytecomp"],
    when: "onSave",
  },
  languageServer: {
    enabled: false,
    path: "satysfi-language-server",
  },
  packageCompletion: {
    enabled: true,
    searchPath: "",
  },
  mathPreview: {
    buildOptions: ["--full-path"],
    when: "never",
    template: "",
    pdf2svg: "pdf2svg",
  },
};
