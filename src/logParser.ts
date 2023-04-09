import * as path from "path";
import {
  Diagnostic,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  Location,
  Range,
  Uri,
} from "vscode";

// super duper long regex for SATySFi error parsing
const regexAll =
  /^(?:(?<fileinfo> {2}(?:reading|parsing|type checking) '(?<filepath>.+?)' ...)|(?<diagnostic>! \[(?<type>.+?)\] at "(?<filename>.+)", (line (?<lineSingle>\d+), characters (?<startColSingle>\d+)-(?<endColSingle>\d+)|line (?<startLineMulti>\d+), character (?<startColMulti>\d+) to line (?<endLineMulti>\d+), character (?<endColMulti>\d+)):?\s*)\n(?<body>(?:\s{4}.*\n)+))/gm;

const regexConstraint =
  /This constraint is required by the expression\nat "(?<filename>.+)", (line (?<lineSingle>\d+), characters (?<startColSingle>\d+)-(?<endColSingle>\d+)|line (?<startLineMulti>\d+), character (?<startColMulti>\d+) to line (?<endLineMulti>\d+), character (?<endColMulti>\d+))\./m;

export function parseLog(
  output: string,
  fileRenameMap: Map<string, string>,
): Map<string, Diagnostic[]> {
  let target: string | undefined;
  // filename -> fullpath
  const filenameMap: Map<string, string> = new Map();
  const diagnostics: Map<string, Diagnostic[]> = new Map();

  for (const { groups } of output.matchAll(regexAll)) {
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

      // check if warning
      const warnCase = groups["type"]?.match(/^Warning(?: about)? (.+)$/);
      const severity = warnCase ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error;
      const title = (warnCase ? warnCase[1] : groups["type"]) ?? "Error";

      // construct a diagnostic
      const range = parseRange(groups);
      const { message, relatedInformation } = parseBody(
        groups["body"] ?? "",
        filenameMap,
        fileRenameMap,
      );
      const d = new Diagnostic(range, `${title}\n${message}`, severity);
      d.relatedInformation = relatedInformation;

      const storeTarget = fileRenameMap.get(target) ?? target;
      if (diagnostics.get(storeTarget)?.push(d) === undefined) diagnostics.set(storeTarget, [d]);
    }
  }

  return diagnostics;
}

function parseRange(groups: { [key: string]: string }) {
  const startLine = Number(groups["startLineMulti"] ?? groups["lineSingle"]);
  const endLine = Number(groups["endLineMulti"] ?? groups["lineSingle"]);
  const startCol = Number(groups["startColMulti"] ?? groups["startColSingle"]);
  const endCol = Number(groups["endColMulti"] ?? groups["endColSingle"]);
  return new Range(startLine - 1, startCol, endLine - 1, endCol);
}

function parseBody(
  message: string,
  filenameMap: Map<string, string>,
  fileRenameMap: Map<string, string>,
) {
  message = message.replace(/^\s{4}/gm, "").trim();

  const match = message.match(regexConstraint);
  if (!match || !match.groups || !match.groups["filename"]) {
    return { message, relatedInformation: [] };
  }

  const filePath = filenameMap.get(match.groups["filename"]);
  if (!filePath) {
    return { message, relatedInformation: [] };
  }

  const storePath = fileRenameMap.get(filePath) ?? filePath;
  const range = parseRange(match.groups);
  const location = new Location(Uri.file(storePath), range);
  const relatedText = match[0]
    .replace(/\n/g, " ")
    .replace(path.basename(filePath), path.basename(storePath));

  return {
    message: message.replace(regexConstraint, "").trim(),
    relatedInformation: [new DiagnosticRelatedInformation(location, relatedText)],
  };
}
