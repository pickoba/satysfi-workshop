import * as assert from "assert";
import * as vscode from "vscode";
import { activate, sleep } from "../helper";

suite("test for packageCompletion", () => {
  test("packageCompletion: @import (simple)", async () => {
    const { document, editor } = await activate("packageCompletion/empty.saty");
    const completions = await completeAfterType(document, editor, "@import: ");

    const expected = [
      { label: "file01", insertText: "file01", kind: vscode.CompletionItemKind.File },
      { label: "file02", insertText: "file02", kind: vscode.CompletionItemKind.File },
      { label: "file03", insertText: "file03", kind: vscode.CompletionItemKind.File },
      { label: "folder01", insertText: "folder01/", kind: vscode.CompletionItemKind.Folder },
    ];

    expected.forEach((e, i) => {
      const actual = completions.items[i];

      assert.strictEqual(actual.label, e.label);
      assert.strictEqual(actual.insertText, e.insertText);
      assert.strictEqual(actual.kind, e.kind);
    });
  });

  test("packageCompletion: @import (nested)", async () => {
    const { document, editor } = await activate("packageCompletion/empty.saty");
    const completions = await completeAfterType(document, editor, "@import: folder01/");

    const expected = [
      { label: "file04", insertText: "file04", kind: vscode.CompletionItemKind.File },
    ];

    expected.forEach((e, i) => {
      const actual = completions.items[i];

      assert.strictEqual(actual.label, e.label);
      assert.strictEqual(actual.insertText, e.insertText);
      assert.strictEqual(actual.kind, e.kind);
    });
  });
});

async function completeAfterType(
  document: vscode.TextDocument,
  editor: vscode.TextEditor,
  content: string,
) {
  const all = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length),
  );
  await editor.edit((eb) => eb.replace(all, content));
  await sleep(500);
  console.log(`text: ${document.getText()}`);
  return (await vscode.commands.executeCommand(
    "vscode.executeCompletionItemProvider",
    document.uri,
    document.positionAt(document.getText().length),
  )) as vscode.CompletionList;
}
