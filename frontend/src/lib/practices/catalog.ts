import { practices as corePractices, practiceSources as coreSources } from "./catalog-core";
import { scripturePractices, scriptureSources } from "./scripture-catalog";
import { yunzhongPractices, yunzhongSources } from "./yunzhong-catalog";
import type { Practice, PracticeSource } from "./types";

export const practices: Practice[] = [...corePractices, ...scripturePractices, ...yunzhongPractices];
export const practiceSources: PracticeSource[] = [...coreSources, ...scriptureSources, ...yunzhongSources];
