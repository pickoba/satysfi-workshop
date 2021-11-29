export interface ExtensionConfig {
  executable: string;
  build: {
    buildOptions: string[];
    when: "never" | "onSave";
    rootFile: string;
  };
  typecheck: {
    buildOptions: string[];
    when: "never" | "onSave" | "onFileChange";
  };
  languageServer: {
    enabled: boolean;
    path: string;
  };
  packageCompletion: {
    enabled: boolean;
    searchPath: string;
  };
}
