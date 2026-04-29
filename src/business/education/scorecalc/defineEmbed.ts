import type {CalcInput, CalcOutput, UserInfo} from './type';

/**
 * The signature of a calc implementation function.
 *
 * @param scoreList - Array of {@link ScoreJsItem} representing each course's score entry.
 * @param userInfo  - Extra user information ({@link UserInfo}), an open-ended key-value map.
 * @returns A {@link CalcOutput} tuple: `[calculatedScore, selectedCourseIds]`.
 */
type CalcFn = (scoreList: CalcInput, userInfo: UserInfo) => CalcOutput;

/**
 * Register a `calc` function on `globalThis`, making it callable from the native
 * JSContext (e.g. iOS JavaScriptCore).
 *
 * This helper takes care of:
 * 1. JSON-parsing the raw string arguments into typed objects
 *    ({@link CalcInput} = {@link ScoreJsItem}[], {@link UserInfo}).
 * 2. Providing a default empty `{}` when `userInfoStr` is omitted.
 * 3. Returning a {@link CalcOutput} tuple `[number, string[]]` back to the caller.
 *
 * @param fn - The actual calculation logic to execute.
 */
export function defineEmbed(fn: CalcFn): void {
  (globalThis as Record<string, unknown>).calc = (
    scoreListStr: string,
    userInfoStr?: string,
  ): CalcOutput => {
    const scoreList: CalcInput = JSON.parse(scoreListStr);
    const userInfo: UserInfo = userInfoStr
      ? JSON.parse(userInfoStr)
      : {userCollege: ''};
    return fn(scoreList, userInfo);
  };
}
