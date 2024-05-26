import { Disposable, ExtensionContext } from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { ConfigProvider } from "./configProvider";
import { ExtensionConfig } from "./configSchema";
import { handleError } from "./error";
import { Logger } from "./logger";

export class LanguageServer implements Disposable {
  private enabled: boolean;
  private path: string;
  private client: LanguageClient | null = null;
  private readonly disposables: Disposable[] = [];

  constructor(
    context: ExtensionContext,
    private readonly configProvider: ConfigProvider,
    private readonly logger: Logger,
  ) {
    const config = this.configProvider.safeGet();
    this.enabled = config?.languageServer.enabled ?? false;
    this.path = config?.languageServer.path ?? "";

    this.configProvider.onChange((c) => this.onConfigChange(c));

    if (this.enabled) {
      this.startServer().catch((e: unknown) => handleError(e, this.logger));
    }

    context.subscriptions.push(this);
  }

  private async onConfigChange(config: ExtensionConfig | null) {
    if (config == null) return;

    if (config.languageServer.path !== this.path) {
      this.path = config.languageServer.path;
      if (this.enabled) {
        await this.restartServer();
      }
    }

    if (config.languageServer.enabled !== this.enabled) {
      this.enabled = config.languageServer.enabled;
      if (this.enabled) {
        await this.startServer();
      } else {
        await this.stopServer();
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

  public async dispose(): Promise<void> {
    await this.stopServer();
    this.disposables.forEach((d) => {
      d.dispose();
    });
  }
}
