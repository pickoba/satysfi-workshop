import * as proc from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { Diagnostic, TextDocument, Uri, workspace } from "vscode";
import { Logger } from "./logger";
import { parseLog } from "./logParser";
import { getWorkPath } from "./util";

export async function buildSATySFi(
  executable: string,
  target: Uri | TextDocument,
  args: string[],
  signal: AbortSignal,
  logger?: Logger,
): Promise<{
  success: boolean;
  diagnostics: Map<string, Diagnostic[]>;
}> {
  const isDocument = !(target instanceof Uri);

  const targetUri = isDocument ? target.uri : target;
  const targetPath = targetUri.fsPath;
  const workPath = isDocument ? await copyToFile(target) : targetPath;
  const workdir = workspace.getWorkspaceFolder(targetUri)?.uri.fsPath ?? path.dirname(targetPath);

  const { code, stdout, stderr } = await spawnSATySFi(
    executable,
    workPath,
    workdir,
    args,
    signal,
    logger,
  ).finally(() => {
    if (isDocument) fs.unlink(workPath);
  });

  const diagnostics = parseLog(stdout + stderr);

  if (isDocument) {
    const ds = diagnostics.get(workPath);
    if (ds) {
      diagnostics.delete(workPath);
      diagnostics.set(targetPath, ds);
    }
  }

  return { success: code === 0, diagnostics };
}

function spawnSATySFi(
  executable: string,
  target: string,
  workDir: string,
  args: string[],
  signal: AbortSignal,
  logger?: Logger,
) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const spawned = proc.spawn(executable, [...args, target], {
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

async function copyToFile(document: TextDocument) {
  const tmpPath = getWorkPath(document.fileName);
  const content = document.getText();

  await fs.writeFile(tmpPath, content);

  return tmpPath;
}
