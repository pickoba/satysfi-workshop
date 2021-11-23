import * as vscode from "vscode";
import { COMMAND_OPEN_BUILD_LOG } from "./const";

export class StatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor({ subscriptions }: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    this.statusBarItem.command = COMMAND_OPEN_BUILD_LOG;
    subscriptions.push(this.statusBarItem);
  }

  public show(icon: string, message: string): void {
    this.statusBarItem.text = `$(${icon})${message}`;
    this.statusBarItem.show();
  }

  public hide(): void {
    this.statusBarItem.hide();
  }
}
