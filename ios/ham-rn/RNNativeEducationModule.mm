#import <RNNativeModuleSpec/RNNativeModuleSpec.h>

@interface RNNativeEducationModule : NativeEducationModuleSpecBase <NativeEducationModuleSpec>
@end

@implementation RNNativeEducationModule

RCT_EXPORT_MODULE(NativeEducationModule)

- (void)onGetCourseList:(NSArray *)courseList
       courseGridEntity:(NSArray *)courseGridEntity
           errorMessage:(NSString * _Nullable)errorMessage {
  NSLog(@"[RNNativeEducationModule] onGetCourseList: courseList=%@, errorMessage=%@", courseList, errorMessage);
}

- (void)onGetScoreList:(NSString *)scoreList
              userInfo:(NSString *)userInfo
          errorMessage:(NSString * _Nullable)errorMessage {
  NSLog(@"[RNNativeEducationModule] onGetScoreList: scoreList=%@, userInfo=%@, errorMessage=%@", scoreList, userInfo, errorMessage);
}

- (NSDictionary *)getCourseConfig {
  NSLog(@"[RNNativeEducationModule] getCourseConfig");
  return @{
    @"year": @2026,
    @"semester": @1
  };
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeEducationModuleSpecJSI>(params);
}

@end
