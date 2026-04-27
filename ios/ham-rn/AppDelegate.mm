#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>
#import "ham_rn-Swift.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"RNCasMobileLogin";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  self.dependencyProvider = [RCTAppDependencyProvider new];

  // Initialize React Native infrastructure (bridgeless runtime, bundleURL, etc.)
  [super application:application didFinishLaunchingWithOptions:launchOptions];

  // Replace the root view controller with SwiftUI HomeView
  // Note: Reuse the existing window created by super to keep the bridge/runtime alive
  UIViewController *homeVC = [self makeHomeViewController];
  self.window.rootViewController = homeVC;
  [self.window makeKeyAndVisible];

  return YES;
}

/// Creates the SwiftUI HomeView wrapped in a UIHostingController.
/// This is implemented in Swift via the bridging header.
- (UIViewController *)makeHomeViewController
{
  // Calls into Swift to create the SwiftUI HomeView
  return [HomeViewFactory createHomeViewController];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
