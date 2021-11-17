"use strict";

import * as fs from "fs/promises";
import * as fp from "path";
import {
  Diagnostic,
  DiagnosticCollection,
  Disposable,
  languages,
  TextDocument,
  Uri,
  window,
  workspace,
} from "vscode";
import { execSATySFi } from "./runner";
import { getConfig, getWorkPath } from "./util";

export default class DiagnosticsProvider implements Disposable {
  private collection: DiagnosticCollection;
  private readonly disposables: Disposable[] = [];

  constructor() {
    this.collection = languages.createDiagnosticCollection();

    this.disposables.push(
      workspace.onDidChangeTextDocument((evt) => {
        if (getConfig().typecheck.when !== "onFileChange") return;
        this.checkDocument(evt.document, true);
      }, this),
    );
    this.disposables.push(workspace.onDidSaveTextDocument((i) => this.checkDocument(i), this));

    workspace.textDocuments.forEach((i) => this.checkDocument(i), this);
  }

  private async checkDocument(document: TextDocument, copy?: boolean) {
    if (getConfig().typecheck.when === "never") return;
    if (document.languageId !== "satysfi") return;

    const originalPath = document.fileName;
    let workPath = originalPath;

    if (copy) {
      const content = document.getText();
      workPath = getWorkPath(originalPath);
      await fs.writeFile(workPath, content);
    }

    try {
      await this.checkFile(workPath, originalPath);
    } finally {
      if (copy) fs.unlink(workPath);
    }
  }

  private async checkFile(tmpPath: string, originalPath: string) {
    // originalPath: /path/to/workspace/target.saty
    // tmpPath:      /path/to/workspace/target.check-00000000.saty (when copy)
    // workPath:     /satysfi/target.check-00000000.saty (when using docker)

    const diagnostics = await this.execTypeCheck(tmpPath);

    this.collection.clear();

    diagnostics.forEach((ds, key) => {
      this.collection.set(Uri.file(key === tmpPath ? originalPath : key), ds);
    });
  }

  private async execTypeCheck(path: string) {
    const defaultOptions = getConfig().typecheck.buildOptions;
    const workdir = workspace.getWorkspaceFolder(Uri.file(path))?.uri.fsPath ?? fp.dirname(path);

    try {
      return await execSATySFi(path, workdir, defaultOptions);
    } catch (e) {
      if (e instanceof Error) {
        window.showErrorMessage(e.message);
      } else {
        window.showErrorMessage("Unknown error occured during type check");
      }

      return new Map<string, Diagnostic[]>();
    }
  }

  public dispose() {
    this.collection.clear();
    this.collection.dispose();
    this.disposables.forEach((i) => i.dispose());
  }
}
