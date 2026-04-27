#import <RNNativeModuleSpec/RNNativeModuleSpec.h>

@interface RNNativeCommonModule : NativeCommonModuleSpecBase <NativeCommonModuleSpec>
@end

@implementation RNNativeCommonModule

RCT_EXPORT_MODULE(NativeCommonModule)

- (void)openUrl:(NSString *)url {
  NSLog(@"[RNNativeCommonModule] openUrl: %@", url);
}

- (void)showToast:(NSString *)type
          message:(NSString *)message
             hint:(NSString *)hint {
  NSLog(@"[RNNativeCommonModule] showToast: type=%@, message=%@, hint=%@", type, message, hint);
}

- (NSString *)getLocale {
  NSLog(@"[RNNativeCommonModule] getLocale");
  NSString *locale = [[NSLocale currentLocale] localeIdentifier];
  return locale ?: @"en";
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeCommonModuleSpecJSI>(params);
}

@end
