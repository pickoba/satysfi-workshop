import * as assert from "assert";
import * as path from "path";
import { getWorkPath } from "../../util";

suite("test for util", () => {
  test("util: getWorkPath", () => {
    const originalPath = "/satysfi/doc.saty";
    const workPath = getWorkPath(originalPath);

    assert.notStrictEqual(workPath, originalPath);
    assert.strictEqual(path.dirname(workPath), path.dirname(originalPath));
    assert.strictEqual(path.extname(workPath), path.extname(originalPath));
  });
});
