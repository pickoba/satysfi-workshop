import * as proc from "child_process";
import { parseLog } from "./logParser";
import { getConfig } from "./util";

export function spawnSATySFi(target: string, workDir: string, args?: string[]) {
  const spawned = proc.spawn(getConfig().executable, [...(args ?? []), target], {
    cwd: workDir,
  });

  return { workPath: target, spawned };
}

export async function execSATySFi(target: string, workDir: string, args?: string[]) {
  const output = await new Promise<string>((resolve, reject) =>
    proc.execFile(
      getConfig().executable,
      [...(args ?? []), target],
      {
        cwd: workDir,
      },
      (err, stdout, stderr) => {
        if (err && err.code === "ENOENT") {
          reject(err.message);
        } else {
          resolve(`${stdout}\n${stderr}`);
        }
      },
    ),
  );

  const diagnostics = parseLog(output);

  return diagnostics;
}
