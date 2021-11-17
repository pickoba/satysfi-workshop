export interface ExtensionConfig {
  executable: string;
  build: {
    buildOptions: string[];
    rootFile: string;
  };
  diagnostics: {
    enabled: boolean;
    onChange: boolean;
    buildOptions: string[];
  };
}
