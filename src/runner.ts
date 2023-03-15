import * as proc from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { Diagnostic, Uri, workspace } from "vscode";
import { Logger } from "./logger";
import { parseLog } from "./logParser";
import { getAuxPath, getWorkPath } from "./util";

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

  const { code, stdout, stderr } = await spawn(
    executable,
    [...args, workPath],
    signal,
    workdir,
    options?.logger,
  ).finally(() => {
    if (options?.content) {
      fs.unlink(workPath);
      fs.unlink(getAuxPath(workPath));
    }
  });

  const diagnostics = parseLog(stdout + stderr);

  if (options?.content) {
    const ds = diagnostics.get(workPath);
    if (ds) {
      diagnostics.delete(workPath);
      diagnostics.set(targetPath, ds);
    }
  }

  return { success: code === 0, diagnostics };
}

export function spawn(
  executable: string,
  args: string[],
  signal: AbortSignal,
  workDir?: string,
  logger?: Logger,
) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const spawned = proc.spawn(executable, args, {
      cwd: workDir,
      signal,
    });

    let stdout = "";
    let stderr = "";

    spawned.stdout.on("data", (data) => {
      stdout += data.toString();
      if (logger) logger.logBuild(data.toString());
    });

    spawned.stderr.on("data", (data) => {
      stderr += data.toString();
      if (logger) logger.logBuild(data.toString());
    });

    spawned.on("error", (err) => {
      reject(err);
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
