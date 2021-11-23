import { Disposable, workspace } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { Context } from "./extension";
import { Logger } from "./logger";
import { getConfig } from "./util";

export class LanguageServer implements Disposable {
  private enabled: boolean;
  private path: string;
  private client: LanguageClient | null = null;
  private readonly disposables: Disposable[] = [];
  private readonly logger: Logger;

  constructor(context: Context) {
    this.logger = context.logger;

    const config = getConfig();
    this.enabled = config.languageServer.enabled;
    this.path = config.languageServer.path;

    this.disposables.push(
      workspace.onDidChangeConfiguration(() => {
        const config = getConfig();

        if (config.languageServer.path !== this.path) {
          if (this.enabled) {
            this.stopServer();
            this.startServer();
          }
        }

        if (config.languageServer.enabled !== this.enabled) {
          if (config.languageServer.enabled) {
            this.startServer();
          } else {
            this.stopServer();
          }
          this.enabled = config.languageServer.enabled;
        }
      }),
    );

    if (this.enabled) this.startServer();
  }

  private startServer() {
    const serverPath = getConfig().languageServer.path;

    const serverOptions: ServerOptions = {
      run: { command: serverPath, transport: TransportKind.pipe },
      debug: {
        command: serverPath,
        transport: TransportKind.pipe,
      },
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ scheme: "file", language: "satysfi" }],
    };

    this.client = new LanguageClient(
      "satysfi-language-server",
      "SATySFi Language Server",
      serverOptions,
      clientOptions,
    );

    this.client.start();

    this.logger.log(`Language Server: start ${serverPath}`);
  }

  private async stopServer() {
    await this.client?.stop();
    this.client = null;

    this.logger.log("Language Server: stop");
  }

  public dispose(): void {
    this.stopServer();
    this.disposables.forEach((d) => d.dispose());
  }
}
