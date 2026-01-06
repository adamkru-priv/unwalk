#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BackgroundStepCheckPlugin, "BackgroundStepCheck",
    CAP_PLUGIN_METHOD(setCheckInterval, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getCheckInterval, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setActiveChallengeData, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearActiveChallengeData, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getCachedSteps, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(triggerManualCheck, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getBackgroundCheckStatus, CAPPluginReturnPromise);
)
