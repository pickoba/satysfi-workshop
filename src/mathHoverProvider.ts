/**
 * Some functions in this file are taken from LaTeX Workshop code (MIT-license).
 * The following is the license notice.
 *
 * @license
 * Copyright (c) 2016 James Yu
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import * as fs from "fs/promises";
import path from "path";
import { unescape } from "querystring";
import {
  DiagnosticSeverity,
  Disposable,
  Hover,
  HoverProvider,
  languages,
  MarkdownString,
  Position,
  Range,
  TextDocument,
  Uri,
} from "vscode";
import * as Parser from "web-tree-sitter";
import { IConfigProvider } from "./configProvider";
import { buildSATySFi, spawn } from "./runner";
import { TreeSitterProvider } from "./treeSitterProvider";
import { getTmpDir, isDarkTheme, pointToPosition } from "./util";

const defaultTemplatePath = path.join(path.dirname(__dirname), "templates", "mathPreview.saty");
const queryStr = `
(headers) @headers
(preamble) @preamble
(math) @math
`.trim();

export class MathHoverProvider implements HoverProvider, Disposable {
  private readonly configProvider: IConfigProvider;
  private readonly treeSitterProvider: TreeSitterProvider;
  private readonly query: Parser.Query;
  private readonly disposables: Disposable[] = [];
  private abortController: AbortController | null = null;

  constructor(configProvider: IConfigProvider, treeSitterProvider: TreeSitterProvider) {
    this.configProvider = configProvider;
    this.treeSitterProvider = treeSitterProvider;
    this.query = treeSitterProvider.createQuery(queryStr);

    this.disposables.push(languages.registerHoverProvider("satysfi", this));
  }

  public async provideHover(document: TextDocument, cursor: Position): Promise<Hover | null> {
    if (this.configProvider.get()?.mathPreview.when !== "onHover") return null;

    const captures = this.treeSitterProvider.executeQuery(document, this.query);
    let headers = "";
    let preambles = "";

    for (const { name, node } of captures) {
      if (name === "headers") {
        headers += node.text;
        continue;
      } else if (name === "preamble") {
        preambles += node.text;
        continue;
      }

      const range = new Range(
        pointToPosition(node.startPosition),
        pointToPosition(node.endPosition),
      );
      if (!range.contains(cursor)) continue;

      this.abortController?.abort();
      this.abortController = new AbortController();
      const signal = this.abortController.signal;

      // Convert math-text to PDF using SATySFi,
      // then generate Markdown (HTML) through SVG.
      // If fails, the hover shows the error message.
      const markdown = await this.generatePdf(headers, preambles, node.text, document.uri, signal)
        .then((pdf) => this.pdf2svg(pdf, signal))
        .then((svg) => this.generateMarkdown(svg))
        .catch((e) => new MarkdownString(e.message));

      return new Hover(markdown, range);
    }

    return null;
  }

  private async generatePdf(
    headers: string,
    preambles: string,
    mathText: string,
    uri: Uri,
    signal: AbortSignal,
  ) {
    const config = this.configProvider.get();
    if (config == null) throw new Error("Invalid configuration");

    const content = await this.readTemplate(headers, preambles, mathText, signal);

    const dir = await getTmpDir();
    const tmpPath = path.join(dir, "out.pdf");

    const { success, diagnostics } = await buildSATySFi(
      config.executable,
      uri,
      [...config.mathPreview.buildOptions, "-o", tmpPath],
      signal,
      {
        content,
      },
    );

    if (!success) {
      const message = [...diagnostics]
        .flatMap(([_, ds]) =>
          ds.filter((d) => d.severity == DiagnosticSeverity.Error).map((d) => d.message),
        )
        .join("\n---\n");

      throw new Error(message);
    }

    return tmpPath;
  }

  private async pdf2svg(pdfPath: string, signal: AbortSignal) {
    const config = this.configProvider.get();
    if (config == null) throw new Error("Invalid configuration");

    const dir = await getTmpDir();
    const tmpPath = path.join(dir, "out.svg");

    const buffer = await spawn(config.mathPreview.pdf2svg, [pdfPath, tmpPath], signal)
      .catch(() => {
        throw new Error("Math preview is not available: Please confirm that pdf2svg exists.");
      })
      .then(() => fs.readFile(tmpPath))
      .finally(() => {
        // Failure to delete is not a problem because the svg is not always generated.
        fs.unlink(tmpPath).catch(() => undefined);
        fs.unlink(pdfPath);
      });

    return buffer.toString();
  }

  private async generateMarkdown(svg: string) {
    if (isDarkTheme()) {
      const css = `svg { filter: invert(1) hue-rotate(180deg) }`;
      svg = svg.replace(/<defs>/, `<defs><style>${css}</style>`);
    }

    const mdString = new MarkdownString(`![math](${this.svgToDataUrl(svg)})`);
    mdString.supportHtml = true;
    return mdString;
  }

  private async readTemplate(
    headers: string,
    preambles: string,
    mathText: string,
    signal: AbortSignal,
  ) {
    const templatePath = this.configProvider.get()?.mathPreview.template || defaultTemplatePath;

    const template = await fs
      .readFile(templatePath, { signal })
      .then((buffer) => buffer.toString());

    return template
      .replace("{{HEADERS}}", headers)
      .replace("{{PREAMBLES}}", preambles)
      .replace("{{MATH_TEXT}}", mathText);
  }

  // https://github.com/James-Yu/LaTeX-Workshop/blob/master/src/utils/svg.ts
  private svgToDataUrl(svg: string) {
    const svg64 = Buffer.from(unescape(encodeURIComponent(svg)), "binary").toString("base64");
    const b64Start = "data:image/svg+xml;base64,";
    return b64Start + svg64;
  }

  public dispose(): void {
    this.disposables.forEach((i) => i.dispose());
  }
}
