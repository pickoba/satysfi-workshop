import * as fs from "fs/promises";
import { homedir } from "os";
import * as path from "path";
import {
  CompletionItem,
  CompletionItemKind,
  Disposable,
  ExtensionContext,
  languages,
  Position,
  TextDocument,
  window,
} from "vscode";
import { ConfigProvider } from "./configProvider";

export class PackageCompletionProvider implements Disposable {
  private readonly disposables: Disposable[] = [];

  constructor(
    context: ExtensionContext,
    private readonly configProvider: ConfigProvider,
  ) {
    this.disposables.push(
      languages.registerCompletionItemProvider("satysfi", {
        provideCompletionItems: (d, p) => this.providePackageCompletion(d, p),
      }),
    );

    this.disposables.push(
      languages.registerCompletionItemProvider(
        "satysfi",
        {
          provideCompletionItems: (d, p) => this.provideRequireImportCompletion(d, p),
        },
        "@",
      ),
    );

    context.subscriptions.push(this);
  }

  private async providePackageCompletion(document: TextDocument, position: Position) {
    if (!this.getConfig()?.enabled) return undefined;

    const linePrefix = document.lineAt(position).text.substr(0, position.character);
    if (linePrefix.startsWith("@require:")) {
      return await this.listPackageCompletions(linePrefix.replace(/^@require:\s*/, ""));
    } else if (linePrefix.startsWith("@import:")) {
      return await this.listLocalCompletions(linePrefix.replace(/^@import:\s*/, ""));
    }

    return [];
  }

  private provideRequireImportCompletion(_: TextDocument, position: Position) {
    if (position.character !== 1) return undefined;

    return ["require", "import"].map((label) => {
      const item = new CompletionItem(label, CompletionItemKind.Keyword);
      item.insertText = `${label}: `;
      if (this.getConfig()?.enabled) {
        item.command = { command: "editor.action.triggerSuggest", title: "package" };
      }
      return item;
    });
  }

  private listPackageCompletions(dir: string) {
    const defaultSearchRoot = path.join(homedir(), ".satysfi", "dist", "packages");
    const searchRoot = (this.getConfig()?.searchPath ?? "") || defaultSearchRoot;
    const searchPath = path.join(searchRoot, dir);

    return this.listCompletions(searchPath);
  }

  private listLocalCompletions(dir: string) {
    if (!window.activeTextEditor) return [];

    const searchRoot = path.dirname(window.activeTextEditor.document.fileName);
    const searchPath = path.join(searchRoot, dir);

    return this.listCompletions(searchPath);
  }

  private async listCompletions(dir: string) {
    try {
      const dirents = await fs.readdir(dir, { withFileTypes: true });

      return dirents.flatMap((d) => {
        let item: CompletionItem;

        if (d.isDirectory()) {
          item = new CompletionItem(d.name, CompletionItemKind.Folder);
          item.insertText = `${d.name}/`;
          item.command = { command: "editor.action.triggerSuggest", title: "package" };
        } else {
          const match = d.name.match(/^(.+)\.saty[hg]$/);
          if (!match?.[1]) return [];
          item = new CompletionItem(match[1], CompletionItemKind.File);
        }

        return [item];
      });
    } catch (e) {
      console.log(e);

      return [];
    }
  }

  private getConfig() {
    return this.configProvider.safeGet()?.packageCompletion;
  }

  public dispose() {
    this.disposables.forEach((d) => {
      d.dispose();
    });
  }
}
