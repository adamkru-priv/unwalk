#import <Capacitor/Capacitor.h>

CAP_PLUGIN(HealthKitPlugin, "HealthKitPlugin",
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestAuthorization, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getSteps, CAPPluginReturnPromise);
)
