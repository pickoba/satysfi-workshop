export interface ExtensionConfig {
  executable: string;
  build: {
    buildOptions: string[];
  };
  diagnostics: {
    enabled: boolean;
    onChange: boolean;
    buildOptions: string[];
  };
}
