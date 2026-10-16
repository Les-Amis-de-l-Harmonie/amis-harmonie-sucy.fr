// Déclaration minimale : mjml n'est utilisé que par scripts/build-emails.mjs et son test.
declare module "mjml" {
  interface MjmlError {
    line?: number;
    message: string;
    formattedMessage?: string;
  }
  interface MjmlResult {
    html: string;
    errors: MjmlError[];
  }
  interface MjmlOptions {
    validationLevel?: "strict" | "soft" | "skip";
    minify?: boolean;
  }
  export default function mjml2html(input: string, options?: MjmlOptions): Promise<MjmlResult>;
}
