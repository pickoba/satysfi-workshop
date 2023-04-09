import path from "path";
import Parser from "web-tree-sitter";

let parser: Parser | null = null;

export async function getParser(extensionPath: string): Promise<Parser> {
  if (!parser) {
    await Parser.init({
      locateFile: () => path.join(extensionPath, "parsers", "tree-sitter.wasm"),
    });
    parser = new Parser();

    const language = await Parser.Language.load(
      path.join(extensionPath, "parsers", "tree-sitter-satysfi.wasm"),
    );
    parser.setLanguage(language);
  }

  return parser;
}
