import { commands, ExtensionContext } from "vscode";
import { Builder } from "./builder";
import { COMMAND_BUILD, COMMAND_OPEN_BUILD_LOG } from "./const";
import { DiagnosticsProvider } from "./diagnostics";
import { LanguageServer } from "./languageServer";
import { Logger } from "./logger";
import { StatusBar } from "./statusbar";

export interface Context {
  logger: Logger;
  statusBar: StatusBar;
}

export async function activate(extContext: ExtensionContext) {
  const context = {
    logger: new Logger(),
    statusBar: new StatusBar(extContext),
  };

  const builder = new Builder(context);
  extContext.subscriptions.push(builder);

  const diagnosticsProvider = new DiagnosticsProvider(context);
  extContext.subscriptions.push(diagnosticsProvider);

  const languageServer = new LanguageServer(context);
  extContext.subscriptions.push(languageServer);

  commands.registerCommand(COMMAND_BUILD, () => builder.buildProject());
  commands.registerCommand(COMMAND_OPEN_BUILD_LOG, () => context.logger.showBuildLog());
}
