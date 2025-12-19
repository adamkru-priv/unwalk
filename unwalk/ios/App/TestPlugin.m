#import <Capacitor/Capacitor.h>
#import <Foundation/Foundation.h>

@interface TestPlugin : NSObject
@end

@implementation TestPlugin
+ (void)load {
    NSLog(@"🧪 TestPlugin.m loaded - Objective-C works!");
}
@end

// Register ApnsTokenPlugin (Swift) for the web layer
CAP_PLUGIN(ApnsTokenPlugin, "ApnsToken",
           CAP_PLUGIN_METHOD(getToken, CAPPluginReturnPromise)
)
