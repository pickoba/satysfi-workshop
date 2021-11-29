import { Disposable, Uri, window, workspace } from "vscode";
import { Context } from "./extension";
import { Logger } from "./logger";
import { buildSATySFi } from "./runner";
import { StatusBar } from "./statusbar";
import { getConfig, showErrorWithOpenSettings } from "./util";

export class Builder implements Disposable {
  private readonly disposables: Disposable[] = [];
  private readonly logger: Logger;
  private readonly statusBar: StatusBar;

  constructor(context: Context) {
    this.logger = context.logger;
    this.statusBar = context.statusBar;

    this.disposables.push(
      workspace.onDidSaveTextDocument((i) => {
        if (i.languageId !== "satysfi") return;
        if (getConfig().build.when !== "onSave") return;
        this.buildProject();
      }, this),
    );
  }

  private async build(target: Uri) {
    this.logger.clearLogBuild();
    this.statusBar.show("sync~spin", "Building...");

    try {
      // TODO: use diagnostics
      const { success } = await buildSATySFi(target, getConfig().build.buildOptions, this.logger);

      if (success) this.onBuildSuccess(target);
      else this.onBuildFail(target);
    } catch (e) {
      showErrorWithOpenSettings(
        `SATySFi executable not found. Please set the executable path in the settings.`,
        false,
      );

      this.logger.log(`Build ${e}`);
    } finally {
      this.statusBar.hide();
    }
  }

  private async onBuildSuccess(target: Uri) {
    this.logger.log(`Build Success: ${target}`);
  }

  private async onBuildFail(target: Uri) {
    this.logger.log(`Build Fail: ${target}`);
    const item = await window.showErrorMessage(`failed to build ${target}`, "Open Log");

    if (item === "Open Log") {
      this.logger.showBuildLog();
    }
  }

  public async buildProject(): Promise<void> {
    const document = window.activeTextEditor?.document;

    if (document && document.fileName.endsWith(".saty")) {
      // build current document
      this.build(document.uri);
      return;
    }

    // find root file in workspace
    const rootFilePath = getConfig().build.rootFile;
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
        this.build(satyFiles[0]);
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
  }
}
