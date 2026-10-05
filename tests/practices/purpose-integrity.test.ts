import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = process.env.PRACTICES_APP_DIR ?? fileURLToPath(new URL("../../frontend/", import.meta.url));
const { practices } = await import(pathToFileURL(join(appDir, "src/lib/practices/catalog.ts")).href);
const scriptures = practices.filter((practice: any) => practice.kind === "recitation");

describe("scripture traditional purposes", () => {
  test("covers all 54 scriptures with traditional purposes and source scope", () => {
    expect(scriptures).toHaveLength(54);
    for (const practice of scriptures) {
      const purpose = practice.scripturePurpose;
      expect(purpose).toBeDefined();
      expect(["source-described", "family-context", "unresolved"]).toContain(purpose.status);
      for (const key of ["summary", "intention", "context"]) expect(purpose[key]).toMatch(/[\u4e00-\u9fff]/);
      expect(purpose.referenceUrls.length).toBeGreaterThan(0);
      for (const url of purpose.referenceUrls) expect(new URL(url).protocol).toMatch(/^https?:$/);
      for (const use of purpose.traditionalUses) {
        expect(use.label.trim().length).toBeGreaterThan(0);
        expect(use.description).toMatch(/[\u4e00-\u9fff]/);
      }
    }
  });

  test("keeps ambiguous identities unresolved and does not prescribe energy scores or practice counts", () => {
    for (const id of ["SC18", "SC23", "SC33", "SC45", "SC49"]) {
      const practice = scriptures.find((item: any) => item.id === id);
      expect(practice.scripture.identificationStatus).toBe("uncertain");
      expect(practice.scripturePurpose.status).toBe("unresolved");
    }
    for (const practice of scriptures) expect(practice.observations).toEqual([]);
    expect(scriptures.filter((practice: any) => practice.scripture.originalName === "藥師佛儀軌").map((practice: any) => practice.id)).toEqual(["SC21", "SC22"]);
    expect(practices.filter((practice: any) => practice.kind !== "recitation").some((practice: any) => practice.scripturePurpose)).toBe(false);
  });
});
