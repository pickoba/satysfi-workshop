import {
  DiagnosticCollection,
  Disposable,
  ExtensionContext,
  languages,
  TextDocument,
  Uri,
  window,
  workspace,
} from "vscode";
import { ConfigProvider } from "./configProvider";
import { withErrorHandler } from "./error";
import { Logger } from "./logger";
import { buildSATySFi } from "./runner";

export class TypeChecker implements Disposable {
  private readonly collection: DiagnosticCollection;
  private readonly disposables: Disposable[] = [];
  private abortController: AbortController | null = null;

  constructor(
    context: ExtensionContext,
    private readonly configProvider: ConfigProvider,
    private readonly logger: Logger,
  ) {
    this.collection = languages.createDiagnosticCollection();

    this.disposables.push(
      workspace.onDidChangeTextDocument(
        withErrorHandler(async (evt) => {
          if (this.getConfig()?.when !== "onFileChange") return;
          await this.checkDocument(evt.document, true);
        }, this.logger),
      ),
    );
    this.disposables.push(
      workspace.onDidSaveTextDocument(
        withErrorHandler(async (i) => {
          if (this.getConfig()?.when !== "onSave") return;
          await this.checkDocument(i);
        }, this.logger),
      ),
    );

    if (this.getConfig()?.when === "onSave" || this.getConfig()?.when === "onFileChange") {
      workspace.textDocuments.forEach((i) => this.checkDocument(i), this);
    }

    context.subscriptions.push(this);
  }

  private async checkDocument(document: TextDocument, copy?: boolean) {
    if (document.languageId !== "satysfi") return;
    const config = this.configProvider.get();

    this.abortController?.abort();
    this.abortController = new AbortController();

    const { diagnostics } = await buildSATySFi(
      config.executable,
      document.uri,
      config.typecheck.buildOptions,
      this.abortController.signal,
      { content: copy ? document.getText() : undefined },
    );

    this.collection.clear();
    diagnostics.forEach((ds, key) => {
      this.collection.set(Uri.file(key), ds);
    });
  }

  public async checkCurrentDocument(): Promise<void> {
    const document = window.activeTextEditor?.document;
    if (document) await this.checkDocument(document, true);
  }

  private getConfig() {
    return this.configProvider.safeGet()?.typecheck;
  }

  public dispose(): void {
    this.collection.clear();
    this.collection.dispose();
    this.disposables.forEach((i) => i.dispose());
    this.abortController?.abort();
  }
}
