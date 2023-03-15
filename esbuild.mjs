import { build, context } from "esbuild";
import { copy } from "esbuild-plugin-copy";
import glob from "glob";

const minify = process.argv.includes("--minify");
const watch = process.argv.includes("--watch");

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ["src/extension.ts", "src/test/runTest.ts", ...glob.sync("src/test/suite/*.ts")],
  bundle: true,
  minify: minify,
  sourcemap: true,
  outdir: "out",
  external: ["mocha", "vscode"],
  format: "cjs",
  platform: "node",
  plugins: [
    copy({
      assets: [
        {
          from: ["./tree-sitter-satysfi.wasm"],
          to: ["tree-sitter-satysfi.wasm", "test/suite/tree-sitter-satysfi.wasm"],
        },
        {
          from: ["./node_modules/web-tree-sitter/tree-sitter.wasm"],
          to: ["tree-sitter.wasm", "test/suite/tree-sitter.wasm"],
        },
      ],
    }),
  ],
};

/** @type {import('esbuild').BuildOptions} */
const watchOptions = {
  ...options,
  plugins: [
    ...options.plugins,
    {
      name: "watch",
      setup(build) {
        build.onEnd((result) => {
          console.log("[watch] build started");
          if (result.errors.length !== 0) {
            result.errors.forEach((error) =>
              console.error(
                `> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`,
              ),
            );
          } else {
            console.log("[watch] build finished");
          }
        });
      },
    },
  ],
};

if (watch) {
  const watchContext = await context(watchOptions);
  watchContext.watch();
} else {
  build(options);
}
