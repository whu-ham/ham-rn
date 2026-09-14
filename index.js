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
import FetchCourseViewE2E from './src/e2e/FetchCourseViewE2E';

AppRegistry.registerComponent('RNCasMobileLogin', () => CasMobileLogin);
AppRegistry.registerComponent('RNCommon', () => Common);
AppRegistry.registerComponent('RNFetchCourseView', () => FetchCourseView);
AppRegistry.registerComponent('RNFetchScoreView', () => FetchScoreView);
AppRegistry.registerComponent('RNScoreCalcView', () => ScoreCalcView);
// Registered unconditionally: an AppRegistry entry is inert until a native
// container asks for it by name, and only the e2e flows do. Gating it on
// __DEV__ would instead keep it out of the Release build the flows run
// against, which is exactly where it is needed.
AppRegistry.registerComponent('RNFetchCourseViewE2E', () => FetchCourseViewE2E);
BatchedBridge.registerCallableModule(
  'RNEducationCallable',
  educationCallableModule,
);
