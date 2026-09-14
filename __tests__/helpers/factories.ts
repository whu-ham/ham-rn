import type {ScoreCalcItem} from '@/business/education/scorecalc/type';

/**
 * Shared builders and helpers for component tests.
 *
 * Tests should build fixtures through these helpers rather than inlining raw
 * objects, so that adding a field to a domain type does not break every test.
 */

let counter = 0;

/** Reset the auto-incrementing id used by {@link makeScoreCalcItem}. */
const resetIds = () => {
  counter = 0;
};

/** Build a {@link ScoreCalcItem} with sensible defaults. */
const makeScoreCalcItem = (
  overrides: Partial<ScoreCalcItem> = {},
): ScoreCalcItem => {
  counter += 1;
  return {
    title: `脚本 ${counter}`,
    date: '2026-04-29',
    author: 'orangeboyChen',
    version: 1,
    brief: `简介 ${counter}`,
    updateBrief: '初始版本',
    desc: `说明 ${counter}`,
    type: 'APP',
    url: `https://example.com/script/${counter}`,
    script: 'export default () => [0, []];',
    ...overrides,
  };
};

/**
 * Resolve a TurboModule mock that {@link jest.setup.ts} installed, with the
 * spec types intact. Casting is unavoidable here: the mock is a plain object at
 * runtime while the real module is typed by codegen.
 */
const nativeModule = <T>(path: string): T => require(path).default as T;

export {makeScoreCalcItem, nativeModule, resetIds};
