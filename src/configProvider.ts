import { EventEmitter } from "events";
import { Disposable, ExtensionContext, workspace } from "vscode";
import { ZodError } from "zod";
import { ExtensionConfig } from "./configSchema";
import { CONFIG_SCOPE } from "./const";
import { showErrorWithOpenSettings } from "./util";

// config change event name
const CONFIG_CHANGE = "config";

export class ConfigProvider implements Disposable {
  private readonly eventEmitter: EventEmitter = new EventEmitter();
  private readonly disposables: Disposable[] = [];
  private config: ExtensionConfig | null;

  constructor(context: ExtensionContext) {
    this.disposables.push(
      workspace.onDidChangeConfiguration((e) => {
        if (!e.affectsConfiguration(CONFIG_SCOPE)) return;

        this.config = this.parse();

        this.eventEmitter.emit(CONFIG_CHANGE, this.config);
      }),
    );

    this.config = this.parse();

    context.subscriptions.push(this);
  }

  private parse() {
    const result = ExtensionConfig.safeParse(workspace.getConfiguration(CONFIG_SCOPE));

    if (result.success) {
      return result.data;
    } else {
      showErrorWithOpenSettings(
        `Setting has an invalid type: ${this.formatError(result.error)}`,
        false,
      );
      return null;
    }
  }

  private formatError(error: ZodError<ExtensionConfig>) {
    return error.issues.map((issue) => `${issue.path.join(".")}`).join(", ");
  }

  public get(): ExtensionConfig | null {
    return this.config;
  }

  public onChange(listener: (config: ExtensionConfig | null) => unknown): void {
    this.eventEmitter.addListener(CONFIG_CHANGE, listener);
  }

  public dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}
