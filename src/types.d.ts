export interface ExtensionConfig {
  executable: string;
  build: {
    buildOptions: string[];
    rootFile: string;
  };
  typecheck: {
    buildOptions: string[];
    when: "never" | "onSave" | "onFileChange";
  };
}
