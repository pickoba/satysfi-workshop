import * as assert from "assert";
import * as vscode from "vscode";
import { parseLog } from "../../logParser";

suite("test for logParser", () => {
  test("logParser: parse error", () => {
    const log = `
  parsing '/satysfi/slide.saty' ...
! [Syntax Error at Lexer] at "slide.saty", line 40, characters 11-12:
    unexpected character 'a' in a vertical area
`;
    const parsed = parseLog(log);

    assert.strictEqual(parsed.size, 1);

    const diagnostics = parsed.get("/satysfi/slide.saty");
    assert.notStrictEqual(diagnostics, undefined);
    assert.strictEqual(diagnostics?.length, 1);

    const entry = diagnostics[0];
    assert.ok(entry);
    assert.strictEqual(entry.range.start.line, 40 - 1);
    assert.strictEqual(entry.range.start.character, 11);
    assert.strictEqual(entry.range.end.line, 40 - 1);
    assert.strictEqual(entry.range.end.character, 12);
    assert.strictEqual(entry.severity, vscode.DiagnosticSeverity.Error);

    const expectedMessage = `Syntax Error at Lexer
unexpected character 'a' in a vertical area`;
    assert.strictEqual(entry.message, expectedMessage);
  });

  test("logParser: single-line type error", () => {
    const log = ` ---- ---- ---- ----
  type checking '/satysfi/theme.satyh' ...
  type check passed.
 ---- ---- ---- ----
  type checking '/satysfi/slide.saty' ...
! [Type Error] at "slide.saty", line 53, characters 23-35:
    this expression has type
      block-text,
    but is expected of type
      inline-text.
    This constraint is required by the expression
    at "theme.satyh", line 100, characters 34-45.
`;
    const parsed = parseLog(log);

    assert.strictEqual(parsed.size, 1);

    const diagnostics = parsed.get("/satysfi/slide.saty");
    assert.notStrictEqual(diagnostics, undefined);
    assert.strictEqual(diagnostics?.length, 1);

    const entry = diagnostics[0];
    assert.ok(entry);
    assert.strictEqual(entry.range.start.line, 53 - 1);
    assert.strictEqual(entry.range.start.character, 23);
    assert.strictEqual(entry.range.end.line, 53 - 1);
    assert.strictEqual(entry.range.end.character, 35);
    assert.strictEqual(entry.severity, vscode.DiagnosticSeverity.Error);

    const expectedMessage = `Type Error
this expression has type
  block-text,
but is expected of type
  inline-text.`;
    assert.strictEqual(entry.message, expectedMessage);

    assert.strictEqual(entry.relatedInformation?.length, 1);
    const relatedInformation = entry.relatedInformation[0];
    assert.ok(relatedInformation);

    const expectedRelatedMessage = `This constraint is required by the expression at "theme.satyh", line 100, characters 34-45.`;
    assert.strictEqual(relatedInformation.message, expectedRelatedMessage);

    assert.strictEqual(relatedInformation.location.uri.path, "/satysfi/theme.satyh");
    assert.strictEqual(relatedInformation.location.range.start.line, 100 - 1);
    assert.strictEqual(relatedInformation.location.range.start.character, 34);
    assert.strictEqual(relatedInformation.location.range.start.line, 100 - 1);
    assert.strictEqual(relatedInformation.location.range.end.character, 45);
  });

  test("logParser: multi-line type error", () => {
    const log = ` ---- ---- ---- ----
  type checking '/satysfi/theme.satyh' ...
  type check passed.
 ---- ---- ---- ----
  type checking '/satysfi/slide.saty' ...
! [Type Error] at "slide.saty", line 32, character 13 to line 38, character 4:
    this expression has type
      (|author : inline-text list; date : inline-text list; institute : inline-text list; itle : inline-text list; subtitle : inline-text list|),
    but is expected of type
      (|author : inline-text list; date : inline-text list; institute : inline-text list; subtitle : inline-text list; title : inline-text list|).
    This constraint is required by the expression
    at "theme.satyh", line 93, characters 24-159.
`;
    const parsed = parseLog(log);

    assert.strictEqual(parsed.size, 1);

    const diagnostics = parsed.get("/satysfi/slide.saty");
    assert.notStrictEqual(diagnostics, undefined);
    assert.strictEqual(diagnostics?.length, 1);

    const entry = diagnostics[0];
    assert.ok(entry);
    assert.strictEqual(entry.range.start.line, 32 - 1);
    assert.strictEqual(entry.range.start.character, 13);
    assert.strictEqual(entry.range.end.line, 38 - 1);
    assert.strictEqual(entry.range.end.character, 4);
    assert.strictEqual(entry.severity, vscode.DiagnosticSeverity.Error);

    const expectedMessage = `Type Error
this expression has type
  (|author : inline-text list; date : inline-text list; institute : inline-text list; itle : inline-text list; subtitle : inline-text list|),
but is expected of type
  (|author : inline-text list; date : inline-text list; institute : inline-text list; subtitle : inline-text list; title : inline-text list|).`;
    assert.strictEqual(entry.message, expectedMessage);

    assert.strictEqual(entry.relatedInformation?.length, 1);
    const relatedInformation = entry.relatedInformation[0];
    assert.ok(relatedInformation);

    const expectedRelatedMessage = `This constraint is required by the expression at "theme.satyh", line 93, characters 24-159.`;
    assert.strictEqual(relatedInformation.message, expectedRelatedMessage);

    assert.strictEqual(relatedInformation.location.uri.path, "/satysfi/theme.satyh");
    assert.strictEqual(relatedInformation.location.range.start.line, 93 - 1);
    assert.strictEqual(relatedInformation.location.range.start.character, 24);
    assert.strictEqual(relatedInformation.location.range.start.line, 93 - 1);
    assert.strictEqual(relatedInformation.location.range.end.character, 159);
  });

  test("logParser: multiple warning", () => {
    const log = `
  type checking '/satysfi/header.satyh' ...
! [Warning about pattern-matching] at "header.satyh", line 19, character 21 to line 21, character 31
    non-exhaustive: CMYK(_, _, _, _)

! [Warning about pattern-matching] at "header.satyh", line 23, character 21 to line 25, character 31
    non-exhaustive: CMYK(_, _, _, _)
`;
    const parsed = parseLog(log);

    assert.strictEqual(parsed.size, 1);

    const diagnostics = parsed.get("/satysfi/header.satyh");
    assert.notStrictEqual(diagnostics, undefined);
    assert.strictEqual(diagnostics?.length, 2);

    const entry = diagnostics[0];
    assert.ok(entry);
    assert.strictEqual(entry.range.start.line, 19 - 1);
    assert.strictEqual(entry.range.start.character, 21);
    assert.strictEqual(entry.range.end.line, 21 - 1);
    assert.strictEqual(entry.range.end.character, 31);
    assert.strictEqual(entry.severity, vscode.DiagnosticSeverity.Warning);

    const expectedMessage = `pattern-matching
non-exhaustive: CMYK(_, _, _, _)`;
    assert.strictEqual(entry.message, expectedMessage);

    assert.strictEqual(entry.relatedInformation?.length, 0);
  });
});
