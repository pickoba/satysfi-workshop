import * as assert from "assert";
import path from "path";
import sinon from "sinon";
import { Position, Range } from "vscode";
import { ConfigProvider } from "../../configProvider";
import { ExtensionConfig } from "../../configSchema";
import { MathHoverProvider } from "../../mathHoverProvider";
import { getParser } from "../../parserProvider";
import { TreeSitterProvider } from "../../treeSitterProvider";
import { activateExtension, activateFile, defaultConfig } from "../helper";

suite("test for mathHoverProvider", () => {
  test("mathHoverProvider: simple", async () => {
    const provider = await mathHoverProvider();
    const { document } = await activateFile("mathHoverProvider/file01.satyh");

    const cases = [
      { cursor: new Position(2, 0), range: undefined },
      { cursor: new Position(2, 10), range: new Range(2, 10, 2, 18) },
      { cursor: new Position(4, 2), range: new Range(4, 2, 4, 36) },
      { cursor: new Position(4, 8), range: new Range(4, 2, 4, 36) },
      { cursor: new Position(4, 36), range: new Range(4, 2, 4, 36) },
    ];
    for (const { cursor, range } of cases) {
      const hover = await provider.provideHover(document, cursor);
      assert.deepStrictEqual(hover?.range, range);
    }
  }).timeout(4000);

  test("mathHoverProvider: hover after typing", async () => {
    const provider = await mathHoverProvider();
    const { document, editor } = await activateFile("mathHoverProvider/file01.satyh");

    const cases = [
      {
        editRange: new Range(2, 8, 2, 8),
        editContent: "func ",
        cursor: new Position(2, 15),
        hoverRange: new Range(2, 15, 2, 23),
      },
      {
        editRange: new Range(3, 0, 3, 0),
        editContent: "\n",
        cursor: new Position(5, 2),
        hoverRange: new Range(5, 2, 5, 36),
      },
    ];
    for (const { editRange, editContent, cursor, hoverRange } of cases) {
      await editor.edit((eb) => eb.replace(editRange, editContent));
      const hover = await provider.provideHover(document, cursor);
      assert.deepStrictEqual(hover?.range, hoverRange);
    }
  }).timeout(4000);
});

async function mathHoverProvider() {
  const context = await activateExtension();

  const config: ExtensionConfig = {
    ...defaultConfig,
    mathPreview: { ...defaultConfig.mathPreview, when: "onHover" },
  };
  const configProvider = sinon.createStubInstance(ConfigProvider);
  configProvider.get.returns(config);
  configProvider.safeGet.returns(config);

  const parser = await getParser(path.dirname(path.dirname(path.dirname(__dirname))));
  const treeSitterProvider = new TreeSitterProvider(context, parser);

  return new MathHoverProvider(context, configProvider, treeSitterProvider);
}
