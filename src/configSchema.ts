import { z } from "zod";

export const ExtensionConfig = z.object({
  executable: z.string(),
  build: z.object({
    buildOptions: z.string().array(),
    when: z.enum(["never", "onSave"]),
    rootFile: z.string(),
  }),
  typecheck: z.object({
    buildOptions: z.string().array(),
    when: z.enum(["never", "onSave", "onFileChange"]),
  }),
  languageServer: z.object({
    enabled: z.boolean(),
    path: z.string(),
  }),
  packageCompletion: z.object({
    enabled: z.boolean(),
    searchPath: z.string(),
  }),
  mathPreview: z.object({
    buildOptions: z.string().array(),
    when: z.enum(["never", "onHover"]),
    template: z.string(),
    pdf2svg: z.string(),
  }),
});

export type ExtensionConfig = z.infer<typeof ExtensionConfig>;
