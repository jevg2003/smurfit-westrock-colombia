// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadCsv, downloadText } from "./download";

function capture() {
  const blobs: Blob[] = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return "blob:test";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  return { blobs, click };
}

afterEach(() => vi.restoreAllMocks());

describe("download", () => {
  it("prefixes a UTF-8 BOM to CSV files so Excel reads accents", async () => {
    const { blobs, click } = capture();
    downloadCsv("a.csv", "señal,día");

    expect(click).toHaveBeenCalledTimes(1);
    const bytes = new Uint8Array(await blobs[0].arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(await blobs[0].text()).toBe("señal,día");
    expect(blobs[0].type).toContain("text/csv");
  });

  it("does not add a BOM to other text files", async () => {
    const { blobs } = capture();
    downloadText("a.md", "# Hola", { mime: "text/markdown" });

    const bytes = new Uint8Array(await blobs[0].arrayBuffer());
    expect(bytes[0]).toBe(0x23);
  });
});
