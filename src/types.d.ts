export interface ExtensionConfig {
  executable: string;
  diagnostics: {
    enabled: boolean;
    onChange: boolean;
    buildOptions: string[];
  };
}
