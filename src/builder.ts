import { Disposable, Uri, window, workspace } from "vscode";
import { Context } from "./extension";
import { Logger } from "./logger";
import { spawnSATySFi } from "./runner";
import { StatusBar } from "./statusbar";
import { getConfig, showErrorWithOpenSettings } from "./util";

export class Builder {
  private readonly disposables: Disposable[] = [];
  private readonly logger: Logger;
  private readonly statusBar: StatusBar;

  constructor(context: Context) {
    this.logger = context.logger;
    this.statusBar = context.statusBar;
  }

  private build(target: Uri) {
    const workDir = workspace.getWorkspaceFolder(target);
    if (!workDir) {
      window.showErrorMessage(`No workspace folder found for ${target}`);
      return;
    }

    this.logger.clearLogBuild();
    this.statusBar.show("sync~spin", "Building...");

    const options = getConfig().build.buildOptions;
    const { spawned } = spawnSATySFi(target.fsPath, workDir.uri.fsPath, options);

    spawned.stdout.on("data", (data) => {
      this.logger.logBuild(data.toString());
    });

    spawned.stderr.on("data", (data) => {
      this.logger.logBuild(data.toString());
    });

    spawned.on("error", (err) => {
      this.logger.logBuild(err.message);
    });

    spawned.on("close", (code) => {
      console.log(`build ${target}: exited with code ${code}`);

      this.statusBar.hide();

      switch (code) {
        case 0:
          this.onBuildSuccess(target);
          break;
        case -2:
          showErrorWithOpenSettings(
            `SATySFi executable not found. Please set the executable path in the settings.`,
            false,
          );
          break;
        default:
          this.onBuildFail(target);
          break;
      }
    });
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

  public async buildProject() {
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

  public dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}
