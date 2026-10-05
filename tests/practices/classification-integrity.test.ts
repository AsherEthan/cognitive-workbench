import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = process.env.PRACTICES_APP_DIR ?? fileURLToPath(new URL("../../frontend/", import.meta.url));
const { practices } = await import(pathToFileURL(join(appDir, "src/lib/practices/catalog.ts")).href);
const { practicePathMap } = await import(pathToFileURL(join(appDir, "src/lib/practices/pathway-map.ts")).href);
const { PRACTICE_PATHWAYS, parsePracticePath, getPracticePathIds } = await import(pathToFileURL(join(appDir, "src/lib/practices/pathways.ts")).href);

describe("practice paths", () => {
  test("classifies every existing record without adding records or duplicating assignments", () => {
    expect(practices).toHaveLength(253);
    expect(Object.keys(practicePathMap).sort()).toEqual(practices.map((p: any) => p.id).sort());
    const valid = new Set(PRACTICE_PATHWAYS.map((p: any) => p.id));
    for (const practice of practices) {
      const ids = getPracticePathIds(practice.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(valid.has(id)).toBe(true);
    }
  });
  test("retains all eight supplied paths and a separate cross-tradition path", () => {
    expect(PRACTICE_PATHWAYS.map((p: any) => p.title)).toEqual([
      "止觀禪修", "參究法門", "念佛法門", "持戒法門", "慧解脫法",
      "念處專業觀修", "特殊方便法門", "密宗體系", "其他身心實踐",
    ]);
    expect(practices.filter((p: any) => getPracticePathIds(p.id).includes("chan-inquiry"))).toHaveLength(0);
    expect(PRACTICE_PATHWAYS.find((p: any) => p.id === "chan-inquiry").scopeNote).toContain("尚未收錄");
  });
  test("keeps similar names and unrelated traditions distinct", () => {
    expect(getPracticePathIds("INC03")).toEqual(["body-mind"]);
    expect(getPracticePathIds("CN13")).toEqual(["body-mind"]);
    expect(getPracticePathIds("YZ01")).toEqual(["body-mind"]);
    expect(getPracticePathIds("P12")).not.toContain("vajrayana");
    expect(getPracticePathIds("SC13")).toContain("ethical-conduct");
    expect(getPracticePathIds("SC17")).toContain("wisdom-study");
    expect(getPracticePathIds("SC52")).toContain("buddha-remembrance");
  });
  test("supports stable URL selection and rejects unknown paths", () => {
    for (const path of PRACTICE_PATHWAYS) expect(parsePracticePath(path.id)).toBe(path.id);
    expect(parsePracticePath(null)).toBe("all");
    expect(parsePracticePath("missing")).toBe("all");
    expect(parsePracticePath("constructor")).toBe("all");
    expect(getPracticePathIds("missing")).toEqual([]);
  });
});
