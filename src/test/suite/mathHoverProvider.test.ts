import * as assert from "assert";
import { Position, Range } from "vscode";
import { MathHoverProvider } from "../../mathHoverProvider";
import { getParser } from "../../parserProvider";
import { TreeSitterProvider } from "../../treeSitterProvider";
import { activateFile, defaultConfig } from "../helper";

suite("test for mathHoverProvider", () => {
  test("mathHoverProvider: simple", async () => {
    const provider = await mathHoverProvider();
    const { document } = await activateFile("mathHoverProvider/file01.satyh");

    const cases = [
      { cursor: new Position(2, 0), range: undefined },
      { cursor: new Position(2, 9), range: new Range(2, 8, 2, 19) },
      { cursor: new Position(3, 13), range: new Range(3, 11, 5, 1) },
      { cursor: new Position(4, 18), range: new Range(3, 11, 5, 1) },
      { cursor: new Position(5, 1), range: new Range(3, 11, 5, 1) },
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
        cursor: new Position(2, 13),
        hoverRange: new Range(2, 13, 2, 24),
      },
      {
        editRange: new Range(3, 0, 3, 0),
        editContent: "\n",
        cursor: new Position(5, 1),
        hoverRange: new Range(4, 11, 6, 1),
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
  const parser = await getParser();
  const treeSitterProvider = new TreeSitterProvider(parser);
  return new MathHoverProvider(
    {
      get() {
        return { ...defaultConfig, mathPreview: { ...defaultConfig.mathPreview, when: "onHover" } };
      },
      onChange: () => {
        return;
      },
    },
    treeSitterProvider,
  );
}
