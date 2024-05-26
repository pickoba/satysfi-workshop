import { ZodError } from "zod";
import { ExtensionConfig } from "./configSchema";
import { MessageAction, showErrorMessage } from "./dialog";
import { Logger } from "./logger";

export interface ExtensionErrorPayload {
  dialog?: {
    message: string;
    action?: MessageAction;
  };
  log?: string;
}

export function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
  return typeof e === "object" && e != null && "code" in e;
}

export class ExtensionError extends Error {
  constructor(
    public readonly payload: ExtensionErrorPayload,
    options?: ErrorOptions,
  ) {
    super(payload.dialog?.message, options);
  }
}

export class ConfigError extends ExtensionError {
  constructor(cause: ZodError<ExtensionConfig>) {
    super(
      {
        dialog: {
          message: `Setting has an invalid type: ${formatZodError(cause)}`,
          action: { type: "openSettings", scope: "user" },
        },
      },
      { cause },
    );
  }
}

export class CommandNotFoundError extends ExtensionError {
  constructor(command: string, options?: ErrorOptions) {
    super(
      {
        dialog: {
          message: `Command "${command}" not found. Install it or configure it in the settings.`,
          action: { type: "openSettings", scope: "user" },
        },
      },
      options,
    );
  }
}

export function withErrorHandler<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  logger: Logger,
  thisArgs?: unknown,
): (...args: T) => Promise<R | null> {
  const bindedFn = thisArgs ? fn.bind(thisArgs) : fn;
  return async (...args: T): Promise<R | null> => {
    try {
      return await bindedFn(...args);
    } catch (e: unknown) {
      await handleError(e, logger);
      return null;
    }
  };
}

export async function handleError(e: unknown, logger: Logger): Promise<void> {
  if (!(e instanceof Error)) return;

  const { dialog, log } = createMessage(e);
  if (log) logger.log(log);
  if (dialog) await showErrorMessage(dialog.message, dialog.action, logger);
}

function createMessage(e: Error): ExtensionErrorPayload {
  if (e.name === "AbortError") return {};
  if (e instanceof ExtensionError) return e.payload;

  return {
    dialog: {
      message: "Unknown error occurred.",
      action: { type: "openLog" },
    },
    log: `${e.name}: ${e.message}`,
  };
}

function formatZodError(error: ZodError<ExtensionConfig>) {
  return error.issues.map((issue) => issue.path.join(".")).join(", ");
}
