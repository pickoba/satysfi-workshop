"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, ExtensionContext } from "vscode";
import { Builder } from "./builder";
import { COMMAND_BUILD, COMMAND_OPEN_BUILD_LOG } from "./const";
import DiagnosticsProvider from "./diagnostics";
import { Logger } from "./logger";
import { StatusBar } from "./statusbar";

export interface Context {
  logger: Logger;
  statusBar: StatusBar;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(extContext: ExtensionContext) {
  const context = {
    logger: new Logger(),
    statusBar: new StatusBar(extContext),
  };

  const builder = new Builder(context);
  extContext.subscriptions.push(builder);

  const diagnosticsProvider = new DiagnosticsProvider();
  extContext.subscriptions.push(diagnosticsProvider);

  commands.registerCommand(COMMAND_BUILD, () => builder.buildProject());
  commands.registerCommand(COMMAND_OPEN_BUILD_LOG, () => context.logger.showBuildLog());
}
