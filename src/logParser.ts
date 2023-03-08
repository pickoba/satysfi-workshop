import * as path from "path";
import { Diagnostic, DiagnosticSeverity, Range } from "vscode";

export function parseLog(output: string): Map<string, Diagnostic[]> {
  let target: string | undefined;
  // filename -> fullpath
  const filenameMap: Map<string, string> = new Map();
  const diagnostics: Map<string, Diagnostic[]> = new Map();

  // super duper long regex for SATySFi error parsing
  const regex =
    /^(?:(?<fileinfo> {2}(?:reading|parsing|type checking) '(?<filepath>.+?)' ...)|(?<diagnostic>! \[(?<type>.+?)\] at "(?<filename>.+)", (line (?<lineSingle>\d+), characters (?<startColSingle>\d+)-(?<endColSingle>\d+)|line (?<startLineMulti>\d+), character (?<startColMulti>\d+) to line (?<endLineMulti>\d+), character (?<endColMulti>\d+)):?\s*)\n(?<body>(?:\s{4}.*\n)+))/gm;

  for (const { groups } of output.matchAll(regex)) {
    if (groups == null) throw new Error(`Internal Error: match failed`);

    if (groups["fileinfo"]) {
      target = groups["filepath"];
      if (target) filenameMap.set(path.basename(target), target);
    } else if (groups["diagnostic"]) {
      // target should have been captured in the fileinfo line beforehand
      if (!target) throw new Error("failed to find reading/parsing/type checking line");

      // update current target
      if (groups["filename"] && path.basename(target) !== groups["filename"]) {
        target = filenameMap.get(groups["filename"]);
        if (!target) {
          throw new Error(`failed to determine the full path of ${groups["filename"]}`);
        }
      }

      // capture the error range
      const startLine = Number(groups["startLineMulti"] ?? groups["lineSingle"]);
      const endLine = Number(groups["endLineMulti"] ?? groups["lineSingle"]);
      const startCol = Number(groups["startColMulti"] ?? groups["startColSingle"]);
      const endCol = Number(groups["endColMulti"] ?? groups["endColSingle"]);
      const range = new Range(startLine - 1, startCol, endLine - 1, endCol);

      // check if warning
      const warnCase = groups["type"]?.match(/^Warning(?: about)? (.+)$/);
      const severity = warnCase ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error;
      const title = (warnCase ? warnCase[1] : groups["type"]) ?? "Error";

      // construct a diagnostic
      const body = groups["body"]?.replace(/^\s{4}/gm, "");
      const lines = body ? `${title}\n${body}` : title;
      const d = new Diagnostic(range, lines, severity);

      if (diagnostics.get(target)?.push(d) === undefined) diagnostics.set(target, [d]);
    }
  }

  return diagnostics;
}
