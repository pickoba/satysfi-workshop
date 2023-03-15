import { commands, ExtensionContext } from "vscode";
import { Builder } from "./builder";
import { ConfigProvider } from "./configProvider";
import {
  COMMAND_BUILD,
  COMMAND_OPEN_BUILD_LOG,
  COMMAND_RESTART_LANGUAGE_SERVER,
  COMMAND_TYPECHECK,
} from "./const";
import { LanguageServer } from "./languageServer";
import { Logger } from "./logger";
import { MathHoverProvider } from "./mathHoverProvider";
import { PackageCompletionProvider } from "./packageCompletion";
import { getParser } from "./parserProvider";
import { StatusBar } from "./statusbar";
import { TreeSitterProvider } from "./treeSitterProvider";
import { TypeChecker } from "./typeChecker";

export interface Context {
  configProvider: ConfigProvider;
  logger: Logger;
  statusBar: StatusBar;
}

export async function activate(extContext: ExtensionContext): Promise<void> {
  const configProvider = new ConfigProvider();
  extContext.subscriptions.push(configProvider);

  const context = {
    configProvider,
    logger: new Logger(),
    statusBar: new StatusBar(extContext),
  };

  const builder = new Builder(context);
  extContext.subscriptions.push(builder);

  const typeChecker = new TypeChecker(context);
  extContext.subscriptions.push(typeChecker);

  const packageCompletionProvider = new PackageCompletionProvider(context);
  extContext.subscriptions.push(packageCompletionProvider);

  const languageServer = new LanguageServer(context);
  extContext.subscriptions.push(languageServer);

  const parser = await getParser();
  const treeSitterProvider = new TreeSitterProvider(parser);
  extContext.subscriptions.push(treeSitterProvider);

  const mathHoverProvider = new MathHoverProvider(configProvider, treeSitterProvider);
  extContext.subscriptions.push(mathHoverProvider);

  commands.registerCommand(COMMAND_BUILD, () => builder.buildProject());
  commands.registerCommand(COMMAND_TYPECHECK, () => typeChecker.checkCurrentDocument());
  commands.registerCommand(COMMAND_OPEN_BUILD_LOG, () => context.logger.showBuildLog());
  commands.registerCommand(COMMAND_RESTART_LANGUAGE_SERVER, () => languageServer.restartServer());
}
