import * as proc from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { Diagnostic, Uri, workspace } from "vscode";
import { CommandNotFoundError, isErrnoException } from "./error";
import { parseLog } from "./logParser";
import { Logger } from "./logger";
import { getAuxPath, getWorkPath } from "./util";

export interface RunnerResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

export async function buildSATySFi(
  executable: string,
  targetUri: Uri,
  args: string[],
  signal: AbortSignal,
  options?: { content?: string; logger?: Logger },
): Promise<{
  success: boolean;
  diagnostics: Map<string, Diagnostic[]>;
}> {
  const targetPath = targetUri.fsPath;
  const workPath = options?.content ? await copyToFile(targetPath, options.content) : targetPath;
  const workdir = workspace.getWorkspaceFolder(targetUri)?.uri.fsPath ?? path.dirname(targetPath);

  const { code, stdout, stderr } = await spawn(executable, [...args, workPath], {
    signal,
    cwd: workdir,
    logger: options?.logger,
  }).finally(() => {
    if (options?.content) {
      fs.unlink(workPath);
      // Failure to delete is not a problem because aux files are not always generated.
      fs.unlink(getAuxPath(workPath)).catch(() => undefined);
    }
  });

  const diagnostics = parseLog(stdout + stderr, new Map([[workPath, targetPath]]));

  return { success: code === 0, diagnostics };
}

export function spawn(
  command: string,
  args?: readonly string[],
  options?: proc.SpawnOptionsWithoutStdio & { logger?: Logger },
) {
  return new Promise<RunnerResult>((resolve, reject) => {
    const spawned = proc.spawn(command, args, options);

    let stdout = "";
    let stderr = "";

    spawned.stdout.on("data", (data) => {
      stdout += data.toString();
      if (options?.logger) options.logger.logBuild(data.toString());
    });

    spawned.stderr.on("data", (data) => {
      stderr += data.toString();
      if (options?.logger) options.logger.logBuild(data.toString());
    });

    spawned.on("error", (err) => {
      if (isErrnoException(err) && err.code === "ENOENT") {
        reject(new CommandNotFoundError(command, { cause: err }));
      } else {
        reject(err);
      }
    });

    spawned.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function copyToFile(basepath: string, content: string) {
  const tmpPath = getWorkPath(basepath);

  await fs.writeFile(tmpPath, content);

  return tmpPath;
}
