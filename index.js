/**
 * @format
 */

import {AppRegistry} from 'react-native';
import CasMobileLogin from './src/components/cas/CasMobileLoginView';
import Common from './src/components/common/Common';
import FetchCourseView from './src/components/education/course/FetchCourseView';
import FetchScoreView from './src/components/education/score/FetchScoreView';
import ScoreCalcView from './src/components/scorecalc/ScoreCalcView';
import BatchedBridge from 'react-native/Libraries/BatchedBridge/BatchedBridge';
import {educationCallableModule} from '@/business/education/module';
import {entries as courseImportEntries} from './src/e2e/courseImportEntries';

AppRegistry.registerComponent('RNCasMobileLogin', () => CasMobileLogin);
AppRegistry.registerComponent('RNCommon', () => Common);
AppRegistry.registerComponent('RNFetchCourseView', () => FetchCourseView);
AppRegistry.registerComponent('RNFetchScoreView', () => FetchScoreView);
AppRegistry.registerComponent('RNScoreCalcView', () => ScoreCalcView);
// Registered unconditionally: an AppRegistry entry is inert until a native
// container asks for it by name, and only the e2e flows do. Gating it on
// __DEV__ would instead keep it out of the Release build the flows run
// against, which is exactly where it is needed.
//
// One entry per branch of the course-import state machine, so a Maestro flow
// can reach any of them by tapping its row in the debug shell. The scenarios
// are distinguished only by what the server returns, so there is no other way
// in from outside the bundle. `RNFetchCourseViewE2E` stays as the partial
// scenario's name — the existing flow taps it.
AppRegistry.registerComponent(
  'RNFetchCourseViewE2E',
  () => courseImportEntries.Partial,
);
Object.entries(courseImportEntries).forEach(([suffix, Entry]) => {
  AppRegistry.registerComponent(`RNFetchCourseViewE2E${suffix}`, () => Entry);
});
BatchedBridge.registerCallableModule(
  'RNEducationCallable',
  educationCallableModule,
);
