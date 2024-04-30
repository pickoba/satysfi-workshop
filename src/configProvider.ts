import { EventEmitter } from "events";
import { Disposable, ExtensionContext, workspace } from "vscode";
import { ExtensionConfig } from "./configSchema";
import { CONFIG_SCOPE } from "./const";
import { ConfigError } from "./error";

// config change event name
const CONFIG_CHANGE = "config";

export class ConfigProvider implements Disposable {
  private readonly eventEmitter: EventEmitter = new EventEmitter();
  private readonly disposables: Disposable[] = [];
  private parseResult: ExtensionConfig | ConfigError;

  constructor(context: ExtensionContext) {
    this.disposables.push(
      workspace.onDidChangeConfiguration((e) => {
        if (!e.affectsConfiguration(CONFIG_SCOPE)) return;

        this.parseResult = this.parse();

        this.eventEmitter.emit(CONFIG_CHANGE, this.safeGet());
      }),
    );

    this.parseResult = this.parse();

    context.subscriptions.push(this);
  }

  private parse(): ExtensionConfig | ConfigError {
    const result = ExtensionConfig.safeParse(workspace.getConfiguration(CONFIG_SCOPE));

    if (result.success) {
      return result.data;
    } else {
      return new ConfigError(result.error);
    }
  }

  /**
   * Get the current extension configuration.
   * @throws {ConfigError} If a type error exists.
   */
  public get(): ExtensionConfig {
    if (this.parseResult instanceof ConfigError) {
      throw this.parseResult;
    } else {
      return this.parseResult;
    }
  }

  /**
   * Get the current extension configuration.
   * @returns `ExtensionConfig` or null if a type error exists.
   */
  public safeGet(): ExtensionConfig | null {
    if (this.parseResult instanceof ConfigError) {
      return null;
    } else {
      return this.parseResult;
    }
  }

  public onChange(listener: (config: ExtensionConfig | null) => unknown): void {
    this.eventEmitter.addListener(CONFIG_CHANGE, listener);
  }

  public dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}
