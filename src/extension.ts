import { commands, ExtensionContext } from "vscode";
import { Builder } from "./builder";
import { ConfigProvider } from "./configProvider";
import {
  COMMAND_BUILD,
  COMMAND_OPEN_BUILD_LOG,
  COMMAND_RESTART_LANGUAGE_SERVER,
  COMMAND_TYPECHECK,
} from "./const";
import { withErrorHandler } from "./error";
import { LanguageServer } from "./languageServer";
import { Logger } from "./logger";
import { MathHoverProvider } from "./mathHoverProvider";
import { PackageCompletionProvider } from "./packageCompletion";
import { getParser } from "./parserProvider";
import { StatusBar } from "./statusbar";
import { TreeSitterProvider } from "./treeSitterProvider";
import { TypeChecker } from "./typeChecker";

export async function activate(context: ExtensionContext): Promise<ExtensionContext> {
  const configProvider = new ConfigProvider(context);
  const logger = new Logger();
  const statusBar = new StatusBar(context);

  const builder = new Builder(context, configProvider, logger, statusBar);
  const typeChecker = new TypeChecker(context, configProvider, logger);
  const languageServer = new LanguageServer(context, configProvider, logger);
  new PackageCompletionProvider(context, configProvider);

  if (configProvider.safeGet()?.mathPreview.when === "onHover") {
    const parser = await getParser(context.extensionPath);
    const treeSitterProvider = new TreeSitterProvider(context, parser);
    new MathHoverProvider(context, configProvider, treeSitterProvider);
  }

  commands.registerCommand(
    COMMAND_BUILD,
    withErrorHandler(() => builder.buildProject(), logger),
  );
  commands.registerCommand(
    COMMAND_TYPECHECK,
    withErrorHandler(() => typeChecker.checkCurrentDocument(), logger),
  );
  commands.registerCommand(COMMAND_OPEN_BUILD_LOG, () => logger.showBuildLog());
  commands.registerCommand(COMMAND_RESTART_LANGUAGE_SERVER, () => languageServer.restartServer());

  // returns the extension context for testing
  return context;
}
