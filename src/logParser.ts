import * as fp from "path";
import { Diagnostic, DiagnosticSeverity, Range } from "vscode";

export function parseLog(output: string) {
  let target: string | undefined;
  // filename -> fullpath
  const filenameMap: Map<string, string> = new Map();
  const diagnostics: Map<string, Diagnostic[]> = new Map();
  let regex =
    /^(?:(  (?:reading|parsing|type checking) '(.+?)' ...)|(! \[(.+?)\] at "(.+)", (line (\d+), characters (\d+)-(\d+)|line (\d+), character (\d+) to line (\d+), character (\d+)):?\s*))$/gm;
  let pos: RegExpExecArray | null;
  while ((pos = regex.exec(output))) {
    if (pos[1]) {
      // Parsing or Reading file
      target = pos[2];
      filenameMap.set(fp.basename(target), target);
    } else if (pos[3]) {
      // Diagnostics found
      if (!target) throw new Error("failed to find reading/parsing/type checking line");
      if (fp.basename(target) !== pos[5]) {
        target = filenameMap.get(pos[5]);
        if (!target) {
          throw new Error(`failed to determine the full path of ${pos[5]}`);
        }
      }
      let startLine;
      let endLine;
      let startCol;
      let endCol;
      if (pos[7]) {
        startLine = endLine = Number(pos[7]);
        startCol = Number(pos[8]);
        endCol = Number(pos[9]);
      } else {
        startLine = Number(pos[10]);
        startCol = Number(pos[11]);
        endLine = Number(pos[12]);
        endCol = Number(pos[13]);
      }

      // check if warning
      const warnCase = /^Warning(?: about)? (.+)$/.exec(pos[4]);
      const severity = warnCase ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error;
      const title = warnCase ? warnCase[1] : pos[4];

      // get rest of the error message
      const rest = output.slice(regex.lastIndex + 1);
      const msg = /(^\s{4}(.*?)\n)+/gm.exec(rest)?.[0].replace(/^\s{4}/gm, "");
      const lines = msg ? `${title}\n${msg}` : title;

      const range = new Range(startLine - 1, startCol, endLine - 1, endCol);

      const d = new Diagnostic(range, lines, severity);
      if (diagnostics.get(target)?.push(d) === undefined) diagnostics.set(target, [d]);
    }
  }

  return diagnostics;
}
