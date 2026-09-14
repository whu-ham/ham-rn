import React from 'react';
import {installE2EFetch} from '@/e2e/courseFixture';
import FetchCourseView from '@/components/education/course/FetchCourseView';

/**
 * An end-to-end-only entry that renders the real `FetchCourseView` against a
 * canned education-system payload.
 *
 * Why a separate entry rather than a flag on the production one: the fixture
 * overwrites `global.fetch`, and nothing in the shipped app should ever be
 * able to reach that code path. Keeping it behind its own AppRegistry entry
 * means the production entry is untouched and the fixture is opt-in by the
 * debug shell only.
 *
 * The flow under test runs end to end: real `loginEducation`, real
 * `getCourseList`, real `parseResponse`, real `toNativeCoursePairing`, real
 * notice. Only the two HTTP calls are substituted.
 */
installE2EFetch();

const FetchCourseViewE2E = (): React.ReactElement => <FetchCourseView />;

export default FetchCourseViewE2E;
