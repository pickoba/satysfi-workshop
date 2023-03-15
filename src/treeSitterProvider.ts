import { Disposable, TextDocument, TextDocumentChangeEvent, Uri, workspace } from "vscode";
import * as Parser from "web-tree-sitter";
import { positionToPoint } from "./util";

export class TreeSitterProvider implements Disposable {
  private readonly parser: Parser;
  private readonly language: Parser.Language;
  private readonly treeCache: Map<Uri, Parser.Tree> = new Map();
  private readonly disposables: Disposable[];

  constructor(parser: Parser) {
    this.parser = parser;
    this.language = this.parser.getLanguage();

    this.disposables = [
      workspace.onDidOpenTextDocument(this.onOpen, this),
      workspace.onDidCloseTextDocument(this.onClose, this),
      workspace.onDidChangeTextDocument(this.onChange, this),
    ];

    workspace.textDocuments.forEach(this.onOpen, this);
  }

  private onOpen(document: TextDocument) {
    if (document.languageId !== "satysfi") return;

    this.updateTree(document);
  }

  private onClose(document: TextDocument) {
    if (document.languageId !== "satysfi") return;

    this.treeCache.delete(document.uri);
  }

  private onChange(event: TextDocumentChangeEvent) {
    if (event.document.languageId !== "satysfi") return;

    const tree = this.treeCache.get(event.document.uri);

    if (tree) {
      event.contentChanges.forEach((e) => {
        const startIndex = e.rangeOffset;
        const oldEndIndex = e.rangeOffset + e.rangeLength;
        const newEndIndex = e.rangeOffset + e.text.length;
        tree.edit({
          startIndex,
          oldEndIndex,
          newEndIndex,
          startPosition: positionToPoint(event.document.positionAt(startIndex)),
          oldEndPosition: positionToPoint(event.document.positionAt(oldEndIndex)),
          newEndPosition: positionToPoint(event.document.positionAt(newEndIndex)),
        });
      });
    }

    this.updateTree(event.document, tree);
  }

  public createQuery(query: string): Parser.Query {
    return this.language.query(query);
  }

  public executeQuery(
    document: TextDocument,
    query: Parser.Query,
    startPosition?: Parser.Point,
    endPosition?: Parser.Point,
  ): Parser.QueryCapture[] {
    const tree = this.treeCache.get(document.uri) ?? this.updateTree(document);

    return query.captures(tree.rootNode, startPosition, endPosition);
  }

  private updateTree(document: TextDocument, oldTree?: Parser.Tree) {
    const newTree = this.parser.parse(document.getText(), oldTree);
    this.treeCache.set(document.uri, newTree);
    return newTree;
  }

  public dispose(): void {
    this.disposables.forEach((i) => i.dispose());
  }
}
