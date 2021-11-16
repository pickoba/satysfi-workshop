import * as vscode from "vscode";

export class Logger {
  private readonly mainPanel: vscode.OutputChannel;
  private readonly buildPanel: vscode.OutputChannel;

  constructor() {
    this.mainPanel = vscode.window.createOutputChannel("SATySFi");
    this.buildPanel = vscode.window.createOutputChannel("SATySFi (Build)");
  }

  log(message: string) {
    this.mainPanel.appendLine(message);
  }

  logBuild(message: string) {
    this.buildPanel.append(message);
  }

  clearLogBuild() {
    this.buildPanel.clear();
  }

  showLog() {
    this.mainPanel.show();
  }

  showBuildLog() {
    this.buildPanel.show();
  }
}
