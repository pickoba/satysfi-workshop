module.exports = {
  root: true,
  env: {
    node: true,
  },
  parserOptions: {
    project: "tsconfig.json",
  },
  ignorePatterns: ["out", "dist", "**/*.d.ts"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      },
    ],
  },
};
