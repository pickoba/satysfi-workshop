import { Disposable, ExtensionContext, TextDocument, Uri, window, workspace } from "vscode";
import { ConfigProvider } from "./configProvider";
import { showErrorMessage } from "./dialog";
import { withErrorHandler } from "./error";
import { Logger } from "./logger";
import { buildSATySFi } from "./runner";
import { StatusBar } from "./statusbar";

export class Builder implements Disposable {
  private readonly disposables: Disposable[] = [];
  private abortController: AbortController | null = null;

  constructor(
    context: ExtensionContext,
    private readonly configProvider: ConfigProvider,
    private readonly logger: Logger,
    private readonly statusBar: StatusBar,
  ) {
    this.disposables.push(
      workspace.onDidSaveTextDocument(
        withErrorHandler((d) => this.onDidSaveTextDocument(d), logger),
      ),
    );

    context.subscriptions.push(this);
  }

  private async onDidSaveTextDocument(document: TextDocument) {
    if (document.languageId !== "satysfi") return;

    const config = this.configProvider.get();

    if (config.build.when === "onSave") {
      await this.buildProject();
    }
  }

  private async build(target: Uri) {
    const config = this.configProvider.get();

    this.abortController?.abort();
    this.abortController = new AbortController();

    this.logger.clearLogBuild();
    this.statusBar.show("sync~spin", "Building...");

    // TODO: use diagnostics
    const { success } = await buildSATySFi(
      config.executable,
      target,
      config.build.buildOptions,
      this.abortController.signal,
      { logger: this.logger },
    ).finally(() => {
      this.statusBar.hide();
    });

    this.logger.log(success ? `Build Success: ${target.fsPath}` : `Build Fail: ${target.fsPath}`);

    if (!success) {
      await showErrorMessage(
        `Failed to build ${target.fsPath}`,
        { type: "openBuildLog" },
        this.logger,
      );
    }
  }

  public async buildProject(): Promise<void> {
    const config = this.configProvider.get();

    const document = window.activeTextEditor?.document;

    if (document?.fileName.endsWith(".saty")) {
      // build current document
      await this.build(document.uri);
      return;
    }

    // find root file in workspace
    const rootFilePath = config.build.rootFile;
    if (rootFilePath) {
      const [rootFile] = await workspace.findFiles(rootFilePath, null, 1);
      if (rootFile) {
        await this.build(rootFile);
      } else {
        await showErrorMessage(`Root file not found: ${rootFilePath}`, undefined, this.logger);
      }
      return;
    }

    // find .saty file in workspace
    const satyFiles = await workspace.findFiles("**/*.saty", "**/.git/**", 2);
    switch (satyFiles.length) {
      case 0:
        await showErrorMessage("No .saty file found in workspace.", undefined, this.logger);
        break;
      case 1:
        if (satyFiles[0]) await this.build(satyFiles[0]);
        break;
      default:
        await showErrorMessage(
          "Multiple .saty files found in workspace. Please set the root .saty file in settings.",
          { type: "openSettings", scope: "workspace" },
          this.logger,
        );
        break;
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => {
      d.dispose();
    });
    this.abortController?.abort();
  }
}
