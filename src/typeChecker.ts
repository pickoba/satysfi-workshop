import {
  DiagnosticCollection,
  Disposable,
  languages,
  TextDocument,
  Uri,
  window,
  workspace,
} from "vscode";
import { ConfigProvider } from "./configProvider";
import { Context } from "./extension";
import { Logger } from "./logger";
import { buildSATySFi } from "./runner";
import { showErrorWithOpenSettings } from "./util";

export class TypeChecker implements Disposable {
  private readonly configProvider: ConfigProvider;
  private readonly logger: Logger;
  private readonly collection: DiagnosticCollection;
  private readonly disposables: Disposable[] = [];
  private abortController: AbortController | null = null;

  constructor(context: Context) {
    this.configProvider = context.configProvider;
    this.logger = context.logger;
    this.collection = languages.createDiagnosticCollection();

    this.disposables.push(
      workspace.onDidChangeTextDocument((evt) => {
        if (this.getConfig()?.when !== "onFileChange") return;
        this.checkDocument(evt.document, true);
      }, this),
    );
    this.disposables.push(
      workspace.onDidSaveTextDocument((i) => {
        if (this.getConfig()?.when !== "onSave") return;
        this.checkDocument(i);
      }, this),
    );

    if (this.getConfig()?.when === "onSave" || this.getConfig()?.when === "onFileChange") {
      workspace.textDocuments.forEach((i) => this.checkDocument(i), this);
    }
  }

  private async checkDocument(document: TextDocument, copy?: boolean) {
    const executable = this.configProvider.get()?.executable;
    const buildOptions = this.getConfig()?.buildOptions;
    if (executable == null || buildOptions == null) return;
    if (document.languageId !== "satysfi") return;

    this.abortController?.abort();
    this.abortController = new AbortController();

    try {
      const { diagnostics } = await buildSATySFi(
        executable,
        document.uri,
        buildOptions,
        this.abortController.signal,
        { content: copy ? document.getText() : undefined },
      );

      this.collection.clear();
      diagnostics.forEach((ds, key) => {
        this.collection.set(Uri.file(key), ds);
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }

      showErrorWithOpenSettings(
        `SATySFi executable not found. Please set the executable path in the settings.`,
        false,
      );

      this.logger.log(`TypeCheck ${e}`);
    }
  }

  public async checkCurrentDocument(): Promise<void> {
    const document = window.activeTextEditor?.document;
    if (document) this.checkDocument(document, true);
  }

  private getConfig() {
    return this.configProvider.get()?.typecheck;
  }

  public dispose(): void {
    this.collection.clear();
    this.collection.dispose();
    this.disposables.forEach((i) => i.dispose());
    this.abortController?.abort();
  }
}
