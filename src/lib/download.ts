const UTF8_BOM = "\uFEFF";

export interface DownloadOptions {
  mime: string;
  /** Prefix a UTF-8 byte order mark so Excel opens accents correctly. */
  bom?: boolean;
}

/** Saves text as a file in the browser. */
export function downloadText(fileName: string, content: string, { mime, bom = false }: DownloadOptions): void {
  const blob = new Blob([bom ? UTF8_BOM + content : content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** CSV with a BOM so Excel reads UTF-8. */
export function downloadCsv(fileName: string, content: string): void {
  downloadText(fileName, content, { mime: "text/csv", bom: true });
}
