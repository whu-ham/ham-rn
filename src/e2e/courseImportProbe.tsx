import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import EducationModule from '@/modules/NativeEducationModule';
import type {NativeCourseEntity} from '@/modules/NativeEducationModule';
import {useColor} from '@/utils/color/color';

/**
 * Shows what the course import reported to the host, for the e2e flows.
 *
 * `EducationModule.onGetCourseList` is the only signal the host gets, and in
 * the debug shell it ends in `Log.i` — so a flow could see that the notice
 * appeared but never what the import decided. Every branch of the state machine
 * (clean import, partial import, total failure, login failure) ends in that
 * callback, and the branches are distinguished only by its payload. Without
 * this the flows could cover the machine's happy path and nothing else.
 *
 * It wraps the module rather than the component: `FetchCourseView` calls the
 * module through a module-level import, so intercepting at the module is the
 * one place every branch passes through. The wrapper records the call and then
 * forwards it, so the host still sees exactly what it would have seen.
 *
 * Only the e2e entry installs this — see `FetchCourseViewE2E`.
 */

/** What the last `onGetCourseList` call reported. */
interface ImportOutcome {
  courseCount: number;
  error: string | null;
  /** Monotonic id, so a flow can tell a fresh call from a stale one. */
  seq: number;
}

let outcome: ImportOutcome | null = null;
const listeners = new Set<(o: ImportOutcome | null) => void>();

const publish = (next: ImportOutcome | null) => {
  outcome = next;
  listeners.forEach(listener => listener(next));
};

/**
 * Records every `onGetCourseList` the host receives, and forwards it.
 *
 * `EducationModule` is a plain object at runtime, so the method is writable —
 * and it has to be replaced rather than wrapped at the call site, because
 * `FetchCourseView` holds no reference we could swap.
 */
const installCourseImportProbe = () => {
  // Guarded, because the entry calls this on every render and each unguarded
  // call would wrap the previous one: the probe would then publish once per
  // accumulated layer, and `seq` would restart at 0 in each layer.
  const installed = EducationModule.onGetCourseList as unknown as {
    __probe?: boolean;
  };
  if (installed.__probe) {
    return;
  }
  const original = EducationModule.onGetCourseList.bind(EducationModule);
  let seq = 0;
  const patched = (
    courseList: NativeCourseEntity[],
    courseGridEntity: unknown,
    errorMessage: string | null,
  ) => {
    seq += 1;
    publish({
      courseCount: courseList?.length ?? 0,
      error: errorMessage ?? null,
      seq,
    });
    original(courseList, courseGridEntity as never, errorMessage);
  };
  (patched as {__probe?: boolean}).__probe = true;
  (EducationModule as {onGetCourseList: unknown}).onGetCourseList = patched;
};

/**
 * `success` when the import committed a timetable, `failed` when it reported an
 * error. These are the two words the flows match on, and they are deliberately
 * not i18next copy — the flows cannot assert on translated strings, because the
 * language comes from the device locale.
 */
const verdict = (o: ImportOutcome | null): string | null => {
  if (!o) {
    return null;
  }
  return o.error ? 'failed' : 'success';
};

const useOutcome = (): ImportOutcome | null => {
  const [current, setCurrent] = React.useState(outcome);
  React.useEffect(() => {
    listeners.add(setCurrent);
    setCurrent(outcome);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return current;
};

const VERDICT_LABEL = 'courseImportVerdict';

const CourseImportProbe = (): React.ReactElement => {
  const color = useColor();
  const current = useOutcome();
  const verdictText = verdict(current);

  return (
    <View
      testID="course-import-probe"
      accessibilityLabel="courseImportProbe"
      style={[styles.probe, {backgroundColor: color.ham_bg_b2}]}>
      {verdictText ? (
        <Text
          testID="course-import-verdict"
          accessibilityLabel={VERDICT_LABEL}
          style={[styles.text, {color: color.ham_text_primary}]}>
          {verdictText}
        </Text>
      ) : (
        <Text
          testID="course-import-pending"
          accessibilityLabel="courseImportPending"
          style={[styles.text, {color: color.ham_text_secondary}]}>
          pending
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Placed below the course screen by `courseImportEntries`, out of the status
  // bar's band. An occluded node reads as absent to Maestro even though
  // `uiautomator dump` still lists it, so where this sits is load-bearing.
  probe: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontSize: 10,
  },
});

export {CourseImportProbe, installCourseImportProbe};
export type {ImportOutcome};
