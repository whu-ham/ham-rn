import React from 'react';
import {StyleSheet, View} from 'react-native';
import {installE2EFetch, type CourseScenario} from '@/e2e/courseFixture';
import {
  CourseImportProbe,
  installCourseImportProbe,
} from '@/e2e/courseImportProbe';
import FetchCourseView from '@/components/education/course/FetchCourseView';

/**
 * Builds an end-to-end-only entry that renders the real `FetchCourseView`
 * against one canned education-system scenario.
 *
 * Why a separate entry per scenario rather than a flag on the production one:
 * the fixture overwrites `global.fetch`, and nothing in the shipped app should
 * ever be able to reach that code path. Keeping each behind its own AppRegistry
 * entry means the production entry is untouched and the fixture is opt-in by
 * the debug shell only.
 *
 * Why one entry per scenario instead of one entry that takes the scenario as an
 * initial property: the debug shell's home list is a hardcoded array in
 * `HomeView.swift` / `HomeActivity.kt`, so an entry is only reachable if it is
 * listed there, and a single entry with a parameter would need the shell to
 * pass parameters it does not pass today.
 *
 * The flow under test runs end to end: real `loginEducation`, real
 * `getCourseList`, real `parseResponse`, real `toNativeCoursePairing`, real
 * notice. Only the two HTTP calls are substituted.
 */

/** Every scenario the flows drive, by the suffix on its AppRegistry name. */
const scenarios: Record<string, CourseScenario | 'loginFailed'> = {
  Partial: 'partial',
  Clean: 'clean',
  AllFailed: 'allFailed',
  Empty: 'empty',
  LoginFailed: 'loginFailed',
};

/**
 * Installs the scenario when the entry mounts, not when this module loads.
 *
 * `global.fetch` is one slot shared by the whole process, so every entry in
 * this file cannot install its own at import time — they would each overwrite
 * the last, and whichever ran last would decide the scenario for all of them.
 * Mounting is the earliest point at which the entry being shown is known, and
 * only one entry is ever mounted.
 *
 * The install has to happen before the child's own mount effect fires, because
 * `FetchCourseView` fetches from that effect. A `useEffect` here would run
 * after the child's, so the first fetch would go to the real network. Doing it
 * in the render body — idempotently, via the scenario guard in
 * `installE2EFetch` — is what lands it in time.
 */
const courseImportEntry = (scenario: CourseScenario | 'loginFailed') => {
  const Entry = (): React.ReactElement => {
    installE2EFetch(scenario);
    installCourseImportProbe();
    return (
      <View style={styles.root}>
        {/* `FetchEducationView` sizes itself to 100% of its container, so it
            needs a bounded box of its own — otherwise it claims the full screen
            and leaves no room for the probe.

            The probe goes *below* the course screen, not above it. At the top
            it landed inside the status bar's band (y 10–47 under a 0–63 status
            bar on this device) and Maestro judged it not visible, because
            Maestro — unlike `uiautomator dump` — treats an occluded node as
            absent. The verdict rendered correctly the whole time; nothing about
            the import was ever broken. */}
        <View style={styles.screen}>
          <FetchCourseView />
        </View>
        <CourseImportProbe />
      </View>
    );
  };
  return Entry;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
});

const entries = Object.fromEntries(
  Object.entries(scenarios).map(([suffix, scenario]) => [
    suffix,
    courseImportEntry(scenario),
  ]),
);

export {entries};
export default entries.Partial;
