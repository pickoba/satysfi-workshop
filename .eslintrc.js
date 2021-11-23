module.exports = {
  root: true,
  parserOptions: {
    project: "tsconfig.json",
  },
  ignorePatterns: ["out", "dist", "**/*.d.ts"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
};
