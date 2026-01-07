#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BackgroundStepCheckPlugin, "BackgroundStepCheck",
    CAP_PLUGIN_METHOD(getCachedSteps, CAPPluginReturnPromise);
)
