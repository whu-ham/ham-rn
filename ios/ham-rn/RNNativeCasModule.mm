#import <RNNativeModuleSpec/RNNativeModuleSpec.h>

@interface RNNativeCasModule : NativeCasModuleSpecBase <NativeCasModuleSpec>
@end

@implementation RNNativeCasModule

RCT_EXPORT_MODULE(NativeCasModule)

- (NSString *)requestCasCookie {
  NSLog(@"[RNNativeCasModule] requestCasCookie");
  return @"";
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeCasModuleSpecJSI>(params);
}

@end
