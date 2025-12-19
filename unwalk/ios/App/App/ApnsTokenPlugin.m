#import <Capacitor/Capacitor.h>

// Classic Capacitor plugin registration (Objective-C shim).
// This deterministically registers the Swift class ApnsTokenPlugin with JS name "ApnsToken".
CAP_PLUGIN(ApnsTokenPlugin, "ApnsToken",
           CAP_PLUGIN_METHOD(getToken, CAPPluginReturnPromise);
)
