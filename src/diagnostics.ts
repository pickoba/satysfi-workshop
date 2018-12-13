"use strict";

import * as proc from "child_process";

import {
  DiagnosticCollection,
  Disposable,
  languages,
  TextDocument,
  Diagnostic,
  workspace,
  DiagnosticSeverity,
  Range,
  Uri
} from "vscode";
import * as fp from "path";

export default class SATySFiProvider implements Disposable {
  private collection: DiagnosticCollection;
  private satysfi: string;
  private disposables: Disposable[];

  constructor() {
    const conf = workspace.getConfiguration();
    this.satysfi = conf.get("satysfi.executable", "satysfi");
    const onChange = conf.get("satysfi.diagnostics.onChange", false);
    this.disposables = [];
    this.collection = languages.createDiagnosticCollection();
    if (onChange) {
      workspace.onDidOpenTextDocument(this.checkSATySFi, this);
    }
    workspace.onDidSaveTextDocument(this.checkSATySFi, this);
    workspace.textDocuments.forEach(this.checkSATySFi, this);
  }

  private checkSATySFi(document: TextDocument) {
    if (document.languageId !== "satysfi") {
      return;
    }

    let options = workspace.rootPath ? { cwd: workspace.rootPath } : undefined;
    let satysfi = proc.spawn(
      this.satysfi,
      ["--full-path", "--type-check-only", "--bytecomp", document.fileName],
      options
    );
    let output = "";
    if (satysfi.pid) {
      satysfi.stdout.on("data", i => (output += i));
      satysfi.stderr.on("data", i => (output += i));
      let target: string;
      satysfi.on("close", (code, _sig) => {
        const diagnostics: Map<string, Diagnostic[]> = new Map();
        // Do Something
        let regex = /^(?:(  (?:reading|parsing) '(.+?)' ...)|(! \[(.+?)\] at "(.+)", (line (\d+), characters (\d+)-(\d+)|line (\d+), character (\d+) to line (\d+), character (\d+)):?\s*))$/gm;
        let pos: RegExpExecArray | null;

        while ((pos = regex.exec(output))) {
          if (pos[1]) {
            // Parsing or Reading file
            target = pos[2];
          } else if (pos[3]) {
            // Diagnostics found

            let path = target || pos[5];
            if (!target || fp.basename(target) !== pos[5]) {
              path = pos[5];
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
            let severity = DiagnosticSeverity.Error;
            let title = pos[4];
            let warnCase;
            if ((warnCase = /^Warning(?: about)? (.+)$/.exec(pos[4]))) {
              title = warnCase[1];
            }
            let range = new Range(startLine - 1, startCol, endLine - 1, endCol);

            let msg: RegExpExecArray | null;
            let lines = title + "\n";
            const rest = output.slice(regex.lastIndex + 1);

            if ((msg = /(^\s{4,}(.*?)\n)+/gm.exec(rest))) {
              lines += msg[0];
            }
            let d = new Diagnostic(
              range,
              lines.replace(/^\s{4}/gm, ""),
              severity
            );

            let ds: Diagnostic[] | undefined = diagnostics.get(path);
            if (!ds) {
              ds = [];
              diagnostics.set(path, ds);
            }
            ds.push(d);
          }
        }
        diagnostics.forEach((ds, key) => {
          if (!fp.isAbsolute(key)) {
            key = fp.join(fp.dirname(document.fileName), key);
          }
          this.collection.set(Uri.parse(`file://${key}`), ds);
        });
      });
    }
  }

  public dispose() {
    this.collection.clear();
    this.collection.dispose();
    this.disposables.forEach(i => i.dispose());
  }
}
