"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext } from "vscode";
import SATySFiProvider from "./diagnostics";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
  let provider: SATySFiProvider = new SATySFiProvider();
  context.subscriptions.push(provider);
}
