import { Disposable, Uri, window, workspace } from "vscode";
import { IConfigProvider } from "./configProvider";
import { Context } from "./extension";
import { Logger } from "./logger";
import { buildSATySFi } from "./runner";
import { StatusBar } from "./statusbar";
import { showErrorWithOpenSettings } from "./util";

export class Builder implements Disposable {
  private readonly disposables: Disposable[] = [];
  private readonly configProvider: IConfigProvider;
  private readonly logger: Logger;
  private readonly statusBar: StatusBar;
  private abortController: AbortController | null = null;

  constructor(context: Context) {
    this.configProvider = context.configProvider;
    this.logger = context.logger;
    this.statusBar = context.statusBar;

    this.disposables.push(
      workspace.onDidSaveTextDocument((i) => {
        if (i.languageId !== "satysfi") return;
        if (this.configProvider.get()?.build.when !== "onSave") return;
        this.buildProject();
      }, this),
    );
  }

  private async build(target: Uri) {
    const config = this.configProvider.get();
    if (config == null) return;

    this.abortController?.abort();
    this.abortController = new AbortController();

    this.logger.clearLogBuild();
    this.statusBar.show("sync~spin", "Building...");

    try {
      // TODO: use diagnostics
      const { success } = await buildSATySFi(
        config.executable,
        target,
        config.build.buildOptions,
        this.abortController.signal,
        { logger: this.logger },
      );

      if (success) this.onBuildSuccess(target);
      else this.onBuildFail(target);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return;
      }

      showErrorWithOpenSettings(
        `SATySFi executable not found. Please set the executable path in the settings.`,
        false,
      );

      this.logger.log(`Build ${e}`);
    }

    this.statusBar.hide();
  }

  private async onBuildSuccess(target: Uri) {
    this.logger.log(`Build Success: ${target}`);
  }

  private async onBuildFail(target: Uri) {
    this.logger.log(`Build Fail: ${target}`);
    const item = await window.showErrorMessage(`failed to build ${target.fsPath}`, "Open Log");

    if (item === "Open Log") {
      this.logger.showBuildLog();
    }
  }

  public async buildProject(): Promise<void> {
    const config = this.configProvider.get();
    if (config == null) return;

    const document = window.activeTextEditor?.document;

    if (document && document.fileName.endsWith(".saty")) {
      // build current document
      this.build(document.uri);
      return;
    }

    // find root file in workspace
    const rootFilePath = config.build.rootFile;
    if (rootFilePath) {
      const [rootFile] = await workspace.findFiles(rootFilePath, null, 1);
      if (rootFile) {
        this.build(rootFile);
      } else {
        window.showErrorMessage(`Root file not found: ${rootFilePath}`);
      }
      return;
    }

    // find .saty file in workspace
    const satyFiles = await workspace.findFiles("**/*.saty", "**/.git/**", 2);
    switch (satyFiles.length) {
      case 0:
        window.showErrorMessage("No .saty file found in workspace.");
        break;
      case 1:
        if (satyFiles[0]) this.build(satyFiles[0]);
        break;
      default:
        showErrorWithOpenSettings(
          "Multiple .saty files found in workspace. Please set the root .saty file in settings.",
          true,
        );
        break;
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.abortController?.abort();
  }
}
