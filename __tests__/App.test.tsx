import {AppRegistry} from 'react-native';

/**
 * `index.js` is the host app's entry point: it registers five RN components
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
  'RNFetchScoreView',
  'RNScoreCalcView',
];

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
});
