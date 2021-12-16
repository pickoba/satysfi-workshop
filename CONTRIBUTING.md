# [WIP] Contribution Guide

Thanks for taking the time to contribute!

**Note:** At the moment, this guide only explains how to make changes to the code.

## Getting Started

```sh
git clone https://github.com/pickoba/satysfi-workshop.git
cd satysfi-workshop
npm ci
code .
```

It is recommended to use `npm ci` instead of `npm install` to avoid unintentional rewriting of `package-lock.json`.

When you open the workspace for the first time, VS Code will prompt you to install the following extensions:

* [dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
* [esbenp.prettier-vscode](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

These are necessary for linting and formatting, so please install them.

## Debugging

You can debug the extension from the Run view:

1. Open the Run view (ctrl/cmd + shift + D)
2. Select "Extension" using the dropdown
3. Press F5 to start debugging (The program will be compiled automatically)

## Testing

Because of VS Code's limitation, you cannot run the tests on CLI if you are using VS Code stable (see [here](https://code.visualstudio.com/api/working-with-extensions/testing-extension#using-insiders-version-for-extension-development)). I recommend running the tests from the debug launch configuration from within VS Code itself:

1. Open the Run view (ctrl/cmd + shift + D)
2. Select "Extension Tests" using the dropdown
3. Press F5 to run the tests

The results of the tests can be checked from the DEBUG CONSOLE panel.

## Linting / Formatting

This project uses [ESLint](https://eslint.org) for linting and [Prettier](https://prettier.io) for formatting. Run

```sh
npm run lint
```

to check and

```sh
npm run fix
```

to fix the problems.
