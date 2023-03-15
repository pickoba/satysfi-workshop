import Parser from "web-tree-sitter";

let parser: Parser | null = null;

export async function getParser(): Promise<Parser> {
  if (!parser) {
    await Parser.init({
      locateFile: () => `${__dirname}/tree-sitter.wasm`,
    });
    parser = new Parser();

    const language = await Parser.Language.load(`${__dirname}/tree-sitter-satysfi.wasm`);
    parser.setLanguage(language);
  }

  return parser;
}
