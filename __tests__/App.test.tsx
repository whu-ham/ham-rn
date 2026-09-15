import {readFileSync} from 'fs';
import {join} from 'path';
import {AppRegistry} from 'react-native';

/**
 * `index.js` is the host app's entry point: it registers the RN components
 * and one callable module. A rename or a deleted file would only surface at
 * runtime inside ham-ios / ham-android, so assert the registrations here.
 *
 * The module is imported lazily inside each test because `index.js` calls
 * `AppRegistry.registerComponent` at import time.
 */
const EXPECTED_COMPONENTS = [
  'RNCasMobileLogin',
  'RNCommon',
  'RNFetchCourseView',
  'RNFetchPostGraduateCourseView',
  'RNFetchScoreView',
  'RNScoreCalcView',
  // Present in every build, including Release: an AppRegistry entry is inert
  // until a native container asks for it, and the e2e flows run against the
  // Release app.
  'RNFetchCourseViewE2E',
  // One per branch of the course-import state machine. A flow can only reach a
  // scenario by launching its own entry, so a missing registration means a
  // branch no e2e flow can cover — and it would only surface as a blank
  // container at runtime.
  'RNFetchCourseViewE2EPartial',
  'RNFetchCourseViewE2EClean',
  'RNFetchCourseViewE2EAllFailed',
  'RNFetchCourseViewE2EEmpty',
  'RNFetchCourseViewE2ELoginFailed',
];

/**
 * Every scenario that has a row in the debug shell, which is how a flow reaches
 * it. Asserted against `HomeActivity.kt`'s list so the two cannot drift: an
 * entry registered here but not listed there is unreachable by Maestro.
 */
const E2E_SCENARIOS = ['Clean', 'AllFailed', 'Empty', 'LoginFailed'] as const;

describe('app entry registrations', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it.each(EXPECTED_COMPONENTS)('registers %s', name => {
    const registerComponent = jest.spyOn(AppRegistry, 'registerComponent');
    require('../index.js');
    expect(registerComponent).toHaveBeenCalledWith(name, expect.any(Function));
  });

  it('registers exactly the expected components, no more', () => {
    const registerComponent = jest.spyOn(AppRegistry, 'registerComponent');
    require('../index.js');
    const registered = registerComponent.mock.calls.map(call => call[0]);
    expect(registered.sort()).toEqual([...EXPECTED_COMPONENTS].sort());
  });

  it('registers the education callable module over the bridge', () => {
    const BatchedBridge =
      require('react-native/Libraries/BatchedBridge/BatchedBridge').default;
    const registerCallableModule = jest.spyOn(
      BatchedBridge,
      'registerCallableModule',
    );
    require('../index.js');
    expect(registerCallableModule).toHaveBeenCalledWith(
      'RNEducationCallable',
      expect.objectContaining({
        updateCourseList: expect.any(Function),
        updateScoreList: expect.any(Function),
      }),
    );
  });

  it('lists every scenario in the Android shell, so each is tappable', () => {
    // Two lists have to agree or a scenario becomes unreachable: the
    // registrations here, and `E2E_SCENARIOS` in HomeActivity.kt. The failure
    // mode is silent — a flow tapping a missing row fails on its first
    // assertion, which reads like a broken screen rather than a missing entry.
    const homeActivity = readFileSync(
      join(
        __dirname,
        '../android/app/src/main/java/com/nowcent/ham/rndebug/HomeActivity.kt',
      ),
      'utf8',
    );
    E2E_SCENARIOS.forEach(scenario => {
      expect(homeActivity).toContain(`RNFetchCourseViewE2E${scenario}`);
    });
  });

  it('lists every scenario in the iOS shell, so each is tappable', () => {
    const homeView = readFileSync(
      join(__dirname, '../ios/ham-rn/HomeView.swift'),
      'utf8',
    );
    E2E_SCENARIOS.forEach(scenario => {
      expect(homeView).toContain(`RNFetchCourseViewE2E${scenario}`);
    });
  });
});
