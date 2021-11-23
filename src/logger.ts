import * as vscode from "vscode";

export class Logger {
  private readonly mainPanel: vscode.OutputChannel;
  private readonly buildPanel: vscode.OutputChannel;

  constructor() {
    this.mainPanel = vscode.window.createOutputChannel("SATySFi");
    this.buildPanel = vscode.window.createOutputChannel("SATySFi (Build)");
  }

  log(message: string): void {
    this.mainPanel.appendLine(message);
  }

  logBuild(message: string): void {
    this.buildPanel.append(message);
  }

  clearLogBuild(): void {
    this.buildPanel.clear();
  }

  showLog(): void {
    this.mainPanel.show();
  }

  showBuildLog(): void {
    this.buildPanel.show();
  }
}
