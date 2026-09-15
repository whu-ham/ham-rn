/**
 * @format
 */

import {AppRegistry} from 'react-native';
import CasMobileLogin from './src/components/cas/CasMobileLoginView';
import Common from './src/components/common/Common';
import FetchCourseView from './src/components/education/course/FetchCourseView';
import FetchPostGraduateCourseView from './src/components/education/course/FetchPostGraduateCourseView';
import FetchScoreView from './src/components/education/score/FetchScoreView';
import ScoreCalcView from './src/components/scorecalc/ScoreCalcView';
import BatchedBridge from 'react-native/Libraries/BatchedBridge/BatchedBridge';
import {educationCallableModule} from '@/business/education/module';

AppRegistry.registerComponent('RNCasMobileLogin', () => CasMobileLogin);
AppRegistry.registerComponent('RNCommon', () => Common);
AppRegistry.registerComponent('RNFetchCourseView', () => FetchCourseView);
AppRegistry.registerComponent(
  'RNFetchPostGraduateCourseView',
  () => FetchPostGraduateCourseView,
);
AppRegistry.registerComponent('RNFetchScoreView', () => FetchScoreView);
AppRegistry.registerComponent('RNScoreCalcView', () => ScoreCalcView);
BatchedBridge.registerCallableModule(
  'RNEducationCallable',
  educationCallableModule,
);
