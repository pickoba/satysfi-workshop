import { Disposable } from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { IConfigProvider } from "./configProvider";
import { ExtensionConfig } from "./configSchema";
import { Context } from "./extension";
import { Logger } from "./logger";

export class LanguageServer implements Disposable {
  private enabled: boolean;
  private path: string;
  private client: LanguageClient | null = null;
  private readonly disposables: Disposable[] = [];
  private readonly configProvider: IConfigProvider;
  private readonly logger: Logger;

  constructor(context: Context) {
    this.configProvider = context.configProvider;
    this.logger = context.logger;

    const config = this.configProvider.get();
    this.enabled = config?.languageServer.enabled ?? false;
    this.path = config?.languageServer.path ?? "";

    this.configProvider.onChange((c) => this.onConfigChange(c));

    if (this.enabled) this.startServer();
  }

  private onConfigChange(config: ExtensionConfig | null) {
    if (config == null) return;

    if (config.languageServer.path !== this.path) {
      this.path = config.languageServer.path;
      if (this.enabled) {
        this.restartServer();
      }
    }

    if (config.languageServer.enabled !== this.enabled) {
      this.enabled = config.languageServer.enabled;
      if (this.enabled) {
        this.startServer();
      } else {
        this.stopServer();
      }
    }
  }

  private async startServer() {
    const serverOptions: ServerOptions = {
      run: { command: this.path },
      debug: { command: this.path },
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

    await this.client.start();

    this.logger.log(`Language Server: start ${this.path}`);
  }

  private async stopServer() {
    await this.client?.stop();
    this.client = null;

    this.logger.log("Language Server: stop");
  }

  public async restartServer() {
    await this.stopServer();
    return this.startServer();
  }

  public dispose(): void {
    this.stopServer();
    this.disposables.forEach((d) => d.dispose());
  }
}
