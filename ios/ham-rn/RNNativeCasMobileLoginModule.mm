#import <RNNativeModuleSpec/RNNativeModuleSpec.h>
#import "RNCasSession.h"

NSString *RNCasCookie = @"";

@interface RNNativeCasMobileLoginModule : NativeCasMobileLoginModuleSpecBase <NativeCasMobileLoginModuleSpec>
@end

@implementation RNNativeCasMobileLoginModule

RCT_EXPORT_MODULE(NativeCasMobileLoginModule)

- (void)onRequestSuccess:(NSString *)studentId
                  password:(NSString *)password
                  cookie:(NSString *)cookie {
  RNCasCookie = [cookie copy];
  NSLog(@"[RNNativeCasMobileLoginModule] onRequestSuccess: studentId=%@, password=%@, cookie=%@", studentId, password, cookie);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeCasMobileLoginModuleSpecJSI>(params);
}

@end
