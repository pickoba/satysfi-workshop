import { commands, window } from "vscode";
import { EXTENSION_NAME } from "./const";
import { Logger } from "./logger";

export type MessageAction =
  | { type: "openSettings"; scope: "user" | "workspace" }
  | { type: "openLog" }
  | { type: "openBuildLog" };

export async function showErrorMessage(
  message: string,
  action: MessageAction | undefined,
  logger: Logger,
): Promise<void> {
  if (action) {
    const actionItems = getActionItems(action, logger);
    const selected = await window.showErrorMessage(
      message,
      ...actionItems.map(({ title }) => title),
    );
    if (selected) actionItems.find(({ title }) => title === selected)?.onClicked();
  } else {
    await window.showErrorMessage(message);
  }
}

function getActionItems(
  action: MessageAction,
  logger: Logger,
): { title: string; onClicked: () => unknown }[] {
  switch (action.type) {
    case "openSettings":
      return [
        {
          title: "Open Settings",
          onClicked: () => {
            commands.executeCommand("workbench.action.openSettings", `@ext:${EXTENSION_NAME}`);
            if (action.scope === "workspace") {
              commands.executeCommand("workbench.action.openWorkspaceSettings");
            }
          },
        },
      ];
    case "openLog":
      return [
        {
          title: "Open Log",
          onClicked: () => {
            logger.showLog();
          },
        },
      ];
    case "openBuildLog":
      return [
        {
          title: "Open Log",
          onClicked: () => {
            logger.showBuildLog();
          },
        },
      ];
  }
}
