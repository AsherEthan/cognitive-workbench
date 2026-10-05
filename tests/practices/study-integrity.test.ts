import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const appDir = process.env.PRACTICES_APP_DIR ?? fileURLToPath(new URL("../../frontend/", import.meta.url));
const { practices } = await import(pathToFileURL(join(appDir, "src/lib/practices/catalog.ts")).href);
const scriptures = practices.filter((practice: any) => practice.kind === "recitation");
const scopes = ["mantra", "excerpt", "title", "full", "none"];
const statuses = ["available", "source-only", "not-applicable", "unresolved"];

describe("scripture languages and annotations", () => {
  test("distinguishes available texts, titles, excerpts and unavailable language versions", () => {
    for (const practice of scriptures) {
      const study = practice.study;
      expect(study).toBeDefined();
      for (const section of [study.sanskrit, study.pronunciation]) {
        expect(scopes).toContain(section.scope);
        expect(statuses).toContain(section.status);
        expect(section.note.trim().length).toBeGreaterThan(10);
        if (section.status === "available") {
          expect(section.scope).not.toBe("none");
          expect(section.referenceUrls.length).toBeGreaterThan(0);
        }
      }
      if (study.sanskrit.status === "available") expect(!!(study.sanskrit.iast || study.sanskrit.devanagari)).toBe(true);
      if (study.pronunciation.status === "available") expect(study.pronunciation.text.trim().length).toBeGreaterThan(0);
      if (study.sanskrit.devanagari) expect(study.sanskrit.devanagari).toMatch(/[\u0900-\u097f]/);
    }
  });

  test("keeps explanatory Chinese content and safe provenance for every item", () => {
    for (const practice of scriptures) {
      const study = practice.study;
      expect(study.annotation.overview).toMatch(/[\u4e00-\u9fff]/);
      expect(study.annotation.overview.trim().length).toBeGreaterThan(30);
      expect(study.annotation.note.trim().length).toBeGreaterThan(0);
      for (const passage of study.annotation.passages) {
        expect(passage.label.trim().length).toBeGreaterThan(0);
        expect(passage.meaning).toMatch(/[\u4e00-\u9fff]/);
      }
      for (const term of study.annotation.terms) expect(term.meaning.trim().length).toBeGreaterThan(0);
      for (const section of [study.sanskrit, study.pronunciation, study.annotation]) {
        for (const url of section.referenceUrls) expect(new URL(url).protocol).toMatch(/^https?:$/);
      }
      if (study.pronunciation.audioUrl) expect(new URL(study.pronunciation.audioUrl).protocol).toMatch(/^https?:$/);
      if (study.pronunciation.chineseApproximation) expect(study.pronunciation.chineseApproximationNote.trim().length).toBeGreaterThan(0);
    }
  });

  test("preserves unresolved identities and distinct language scopes", () => {
    const byId = (id: string) => scriptures.find((practice: any) => practice.id === id);
    for (const id of ["SC18", "SC23", "SC33", "SC45", "SC49"]) expect(byId(id).scripture.identificationStatus).toBe("uncertain");
    expect(scriptures.some((practice: any) => practice.study.sanskrit.status === "not-applicable")).toBe(true);
    expect(scriptures.some((practice: any) => practice.study.sanskrit.status === "unresolved")).toBe(true);
    expect(scriptures.filter((practice: any) => practice.scripture.originalName === "藥師佛儀軌").map((practice: any) => practice.id)).toEqual(["SC21", "SC22"]);
  });
});
