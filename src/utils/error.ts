/**
 * Renders whatever was thrown as a message the host can display.
 *
 * Two properties are load-bearing here, and both are easy to lose:
 *
 *   - It never returns `undefined`. The hosts read an absent errorMessage as
 *     success, so describing an undescribable rejection as `undefined` hands
 *     them an empty score list and has them write it to the database.
 *   - It cannot throw. `String()` tolerates values `JSON.stringify` rejects,
 *     such as an error carrying a circular reference. This matters because it
 *     runs inside rejection handlers: a helper that throws there leaves the
 *     request unanswered, and the host waits for a callback that never comes.
 */
const describeError = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

export {describeError};
