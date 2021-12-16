import {
  DiagnosticCollection,
  Disposable,
  languages,
  TextDocument,
  Uri,
  window,
  workspace,
} from "vscode";
import { Context } from "./extension";
import { Logger } from "./logger";
import { buildSATySFi } from "./runner";
import { getConfig, showErrorWithOpenSettings } from "./util";

export class TypeChecker implements Disposable {
  private readonly logger: Logger;
  private readonly collection: DiagnosticCollection;
  private readonly disposables: Disposable[] = [];

  constructor(context: Context) {
    this.logger = context.logger;
    this.collection = languages.createDiagnosticCollection();

    this.disposables.push(
      workspace.onDidChangeTextDocument((evt) => {
        if (getConfig().typecheck.when !== "onFileChange") return;
        this.checkDocument(evt.document, true);
      }, this),
    );
    this.disposables.push(
      workspace.onDidSaveTextDocument((i) => {
        if (getConfig().typecheck.when !== "onSave") return;
        this.checkDocument(i);
      }, this),
    );

    if (getConfig().typecheck.when !== "never") {
      workspace.textDocuments.forEach((i) => this.checkDocument(i), this);
    }
  }

  private async checkDocument(document: TextDocument, copy?: boolean) {
    if (document.languageId !== "satysfi") return;

    try {
      const { diagnostics } = await buildSATySFi(
        copy ? document : document.uri,
        getConfig().typecheck.buildOptions,
      );

      this.collection.clear();
      diagnostics.forEach((ds, key) => {
        this.collection.set(Uri.file(key), ds);
      });
    } catch (e) {
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

  public dispose(): void {
    this.collection.clear();
    this.collection.dispose();
    this.disposables.forEach((i) => i.dispose());
  }
}
