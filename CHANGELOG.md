# Change Log
All notable changes to the "satysfi-workshop" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.4.1] - 2024-02-23
- load tree-sitter parser only when math preview is enabled
- update dependencies

## [1.4.0] - 2023-04-09
- support math hover preview
- enhance diagnostics (parsing constraints' section)
- use esbuild for bundling
- use zod for user settings' validation
- stricter tsconfig
- update VS Marketplace badge
- update dependencies
- remove `npm-run-all` (not actively maintained)

## [1.3.0] - 2022-10-09
- add indentation rules
- performance improvement for type checking (especially for `when == onFileChange`)
- add syntax highlight for embedding in math mode and escapes in inline text
- support restarting language server (`satysfi-workshop.restartLanguageServer`)
- fix typo in snippets
- restore language extension patterns in `package.json`
- update vscode-languageclient and its settings
- update dependencies

## [1.2.0] - 2022-05-11
- embed string support for inline-text
- enhanced support for bracket pair colorization/matching
- fix syntax highlight for operators/symbols/literals/commands
- update primitve definitions
- update dependencies

## [1.1.1] - 2022-03-10
- update vscode engine version

## [1.1.0] - 2022-03-10
- set default value for language server path
- add / update bracket definitions
- fix / improve syntax highlight
- syntax highlight for text-mode files
- fix error messsage on build fail
- update dependencies

## [1.0.1] - 2021-12-20
- fix syntax highlight for integers

## [1.0.0] - 2021-12-20
- Initial release as SATySFi Workshop

[Unreleased]: https://github.com/pickoba/satysfi-workshop/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/pickoba/satysfi-workshop/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/pickoba/satysfi-workshop/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/pickoba/satysfi-workshop/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/pickoba/satysfi-workshop/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/pickoba/satysfi-workshop/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/pickoba/satysfi-workshop/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/pickoba/satysfi-workshop/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/pickoba/satysfi-workshop/releases/tag/v1.0.0
