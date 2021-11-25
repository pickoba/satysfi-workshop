import * as fs from "fs/promises";
import { homedir } from "os";
import * as fp from "path";
import { CompletionItem, CompletionItemKind, Disposable, languages, window } from "vscode";
import { getConfig } from "./util";

export function packageCompletion(): Disposable[] {
  const listCompletionsProvider = languages.registerCompletionItemProvider("satysfi", {
    async provideCompletionItems(document, position) {
      if (!getConfig().packageCompletion.enabled) return undefined;

      const linePrefix = document.lineAt(position).text.substr(0, position.character);
      if (linePrefix.startsWith("@require:")) {
        return await listPackageCompletions(linePrefix.replace(/^@require:\s*/, ""));
      } else if (linePrefix.startsWith("@import:")) {
        return await listLocalCompletions(linePrefix.replace(/^@import:\s*/, ""));
      }

      return [];
    },
  });

  const requireImportProvider = languages.registerCompletionItemProvider(
    "satysfi",
    {
      provideCompletionItems(document, position) {
        if (position.character !== 1) return undefined;

        return ["require", "import"].map((label) => {
          const item = new CompletionItem(label, CompletionItemKind.Keyword);
          item.insertText = `${label}: `;
          if (getConfig().packageCompletion.enabled) {
            item.command = { command: "editor.action.triggerSuggest", title: "package" };
          }
          return item;
        });
      },
    },
    "@",
  );

  return [listCompletionsProvider, requireImportProvider];
}

function listPackageCompletions(dir: string) {
  const defaultSearchRoot = fp.join(homedir(), ".satysfi", "dist", "packages");
  const searchRoot = getConfig().packageCompletion.searchPath || defaultSearchRoot;
  const searchPath = fp.join(searchRoot, dir);

  return listCompletions(searchPath);
}

function listLocalCompletions(dir: string) {
  if (!window.activeTextEditor) return [];

  const searchRoot = fp.dirname(window.activeTextEditor.document.fileName);
  const searchPath = fp.join(searchRoot, dir);

  return listCompletions(searchPath);
}

async function listCompletions(path: string) {
  try {
    const dirents = await fs.readdir(path, { withFileTypes: true });

    return dirents.flatMap((d) => {
      let item: CompletionItem;

      if (d.isDirectory()) {
        item = new CompletionItem(d.name, CompletionItemKind.Folder);
        item.insertText = `${d.name}/`;
        item.command = { command: "editor.action.triggerSuggest", title: "package" };
      } else {
        const match = d.name.match(/^(.+)\.saty[hg]$/);
        if (!match) return [];
        item = new CompletionItem(match[1], CompletionItemKind.File);
      }

      return [item];
    });
  } catch (e) {
    console.log(e);

    return [];
  }
}
