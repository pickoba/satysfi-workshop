"use strict";

import * as proc from "child_process";
import * as fs from "fs";
import * as fp from "path";
import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  Disposable,
  languages,
  Range,
  TextDocument,
  Uri,
  window,
  workspace,
} from "vscode";

// eslint-disable-next-line @typescript-eslint/naming-convention
const SATySFi_SCOPE = "satysfi";
const EXEC_CONF_KEY = "executable";
const CHECK_ON_CHANGE_CONF_KEY = "diagnostics.onChange";
const ENABLE_DIAG_KEY = "diagnostics.enabled";

export default class SATySFiProvider implements Disposable {
  private collection: DiagnosticCollection;
  private satysfi: string;
  private disposables: Disposable[];
  private checkOnChange: boolean;
  private enabled: boolean;

  constructor() {
    const conf = workspace.getConfiguration(SATySFi_SCOPE);
    this.satysfi = conf.get(EXEC_CONF_KEY, "satysfi");
    this.enabled = conf.get(ENABLE_DIAG_KEY, true);
    this.disposables = [];
    this.collection = languages.createDiagnosticCollection();
    this.checkOnChange = conf.get(CHECK_ON_CHANGE_CONF_KEY, false);
    workspace.onDidChangeConfiguration(async (evt) => {
      if (evt.affectsConfiguration(SATySFi_SCOPE + "." + EXEC_CONF_KEY)) {
        this.satysfi = workspace.getConfiguration(SATySFi_SCOPE).get(EXEC_CONF_KEY, this.satysfi);
      } else if (evt.affectsConfiguration(SATySFi_SCOPE + "." + CHECK_ON_CHANGE_CONF_KEY)) {
        this.checkOnChange = workspace
          .getConfiguration(SATySFi_SCOPE)
          .get(CHECK_ON_CHANGE_CONF_KEY, this.checkOnChange);
      } else if (evt.affectsConfiguration(SATySFi_SCOPE + "." + ENABLE_DIAG_KEY)) {
        this.enabled = workspace.getConfiguration(SATySFi_SCOPE).get(ENABLE_DIAG_KEY, true);
        if (this.enabled) {
          workspace.textDocuments.forEach((i) => this.checkSATySFi(i));
        } else {
          this.collection.clear();
        }
      }
    });
    workspace.onDidChangeTextDocument(async (evt) => {
      if (this.checkOnChange && this.enabled) {
        const src = evt.document.getText();
        let tmpPath: string;
        const origPath = evt.document.uri.fsPath;
        const ext = fp.extname(origPath);
        const namebase = fp.basename(origPath, ext);
        do {
          const nonce = Math.random().toString(36).slice(-8);
          const name = `${namebase}.check-${nonce}${ext}`;
          tmpPath = fp.join(fp.dirname(origPath), name);
        } while (fs.existsSync(tmpPath));
        fs.writeFileSync(tmpPath, src);
        try {
          await this.checkSATySFi(tmpPath, origPath);
        } finally {
          fs.unlinkSync(tmpPath);
        }
      }
    }, this);
    workspace.onDidSaveTextDocument((i) => {
      if (this.enabled) {
        this.checkSATySFi(i);
      }
    }, this);
    workspace.textDocuments.forEach((i) => {
      if (this.enabled) {
        this.checkSATySFi(i);
      }
    }, this);
  }

  private async checkSATySFi(document: TextDocument | string, originalPath?: string) {
    if (typeof document !== "string" && document.languageId !== "satysfi") {
      return;
    }
    let origin: string;
    let canonic = (p: string) => (p === origin && originalPath ? originalPath : p);
    if (typeof document === "string") {
      origin = document;
    } else {
      origin = document.fileName;
    }
    let options = workspace.rootPath ? { cwd: workspace.rootPath } : undefined;
    let { stdout, stderr, error } = proc.spawnSync(
      this.satysfi,
      ["--full-path", "--type-check-only", "--bytecomp", origin],
      options,
    );
    if (error) {
      window.showErrorMessage(error.message);
      return;
    }
    const output = String(stdout) + "\n" + String(stderr);
    let target: string | undefined;
    const diagnostics: Map<string, Diagnostic[]> = new Map();
    let regex =
      /^(?:(  (?:reading|parsing) '(.+?)' ...)|(! \[(.+?)\] at "(.+)", (line (\d+), characters (\d+)-(\d+)|line (\d+), character (\d+) to line (\d+), character (\d+)):?\s*))$/gm;
    let pos: RegExpExecArray | null;
    let rawTarget: string | undefined;
    while ((pos = regex.exec(output))) {
      if (pos[1]) {
        // Parsing or Reading file
        target = canonic(pos[2]);
        rawTarget = pos[2];
      } else if (pos[3]) {
        // Diagnostics found
        let path = target || canonic(pos[5]);
        if (!rawTarget || fp.basename(rawTarget) !== canonic(pos[5])) {
          path = canonic(pos[5]);
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
          severity = DiagnosticSeverity.Warning;
        }
        let range = new Range(startLine - 1, startCol, endLine - 1, endCol);

        let msg: RegExpExecArray | null;
        let lines = title + "\n";
        const rest = output.slice(regex.lastIndex + 1);

        if ((msg = /(^\s{4,}(.*?)\n)+/gm.exec(rest))) {
          lines += msg[0];
        }
        let d = new Diagnostic(range, lines.replace(/^\s{4}/gm, ""), severity);

        let ds: Diagnostic[] | undefined = diagnostics.get(canonic(path));
        if (!ds) {
          ds = [];
          diagnostics.set(canonic(path), ds);
        }
        ds.push(d);
      }
    }

    if (diagnostics.size === 0) {
      this.collection.clear();
      return;
    }
    diagnostics.forEach((ds, key) => {
      if (!fp.isAbsolute(key)) {
        key = fp.join(fp.dirname(origin), key);
      }
      this.collection.set(Uri.parse(`file://${key}`), ds);
    });
  }

  public dispose() {
    this.collection.clear();
    this.collection.dispose();
    this.disposables.forEach((i) => i.dispose());
  }
}
