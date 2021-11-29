import { commands, ExtensionContext } from "vscode";
import { Builder } from "./builder";
import { COMMAND_BUILD, COMMAND_OPEN_BUILD_LOG, COMMAND_TYPECHECK } from "./const";
import { LanguageServer } from "./languageServer";
import { Logger } from "./logger";
import { packageCompletion } from "./packageCompletion";
import { StatusBar } from "./statusbar";
import { TypeChecker } from "./typeChecker";

export interface Context {
  logger: Logger;
  statusBar: StatusBar;
}

export function activate(extContext: ExtensionContext): void {
  const context = {
    logger: new Logger(),
    statusBar: new StatusBar(extContext),
  };

  const builder = new Builder(context);
  extContext.subscriptions.push(builder);

  const typeChecker = new TypeChecker(context);
  extContext.subscriptions.push(typeChecker);

  extContext.subscriptions.push(...packageCompletion());

  const languageServer = new LanguageServer(context);
  extContext.subscriptions.push(languageServer);

  commands.registerCommand(COMMAND_BUILD, () => builder.buildProject());
  commands.registerCommand(COMMAND_TYPECHECK, () => typeChecker.checkCurrentDocument());
  commands.registerCommand(COMMAND_OPEN_BUILD_LOG, () => context.logger.showBuildLog());
}
