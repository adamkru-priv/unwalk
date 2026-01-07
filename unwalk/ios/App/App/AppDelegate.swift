import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.

        print("[App] didFinishLaunching")
        print("[App] Bundle identifier: \(Bundle.main.bundleIdentifier ?? "unknown")")
        print("[App] HealthKitPlugin should auto-register via .m file")

        // Helpful for diagnosing missing APNs token.
        print("[APNs] Notifications enabled (user setting): \(UIApplication.shared.isRegisteredForRemoteNotifications)")

        // MARK: - Capacitor plugin diagnostics
        // Confirms whether the APNs token plugin class is linked into the app and visible at runtime.
        let candidates = [
            // Expected plugin class names (Swift)
            "ApnsTokenPlugin",
            "App.ApnsTokenPlugin",
            "CapacitorApnsToken.ApnsTokenPlugin",

            // Legacy/experimental bridge class (should be absent)
            "ApnsTokenPluginBridge",
            "App.ApnsTokenPluginBridge",
            "CapApp_SPM.ApnsTokenPluginBridge",
            "CapApp-SPM.ApnsTokenPluginBridge"
        ]
        for name in candidates {
            let cls = NSClassFromString(name)
            print("[Capacitor] NSClassFromString(\(name)) -> \(cls != nil ? "FOUND" : "nil")")
        }

        // MARK: - Capacitor config diagnostics
        if let url = Bundle.main.url(forResource: "capacitor.config", withExtension: "json"),
           let data = try? Data(contentsOf: url),
           let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let pcl = obj["packageClassList"] as? [String] {
            print("[Capacitor] capacitor.config.json packageClassList: \(pcl)")

            let legacyBridgeEntries = ["App.ApnsTokenPluginBridge", "ApnsTokenPluginBridge"]
            let hasLegacyBridge = legacyBridgeEntries.contains(where: { pcl.contains($0) })
            print("[Capacitor] packageClassList contains ApnsToken bridge entry: \(hasLegacyBridge)")
        } else {
            print("[Capacitor] ⚠️ Could not read bundled capacitor.config.json")
        }

        // MARK: - ApnsToken plugin sanity check
        // We no longer use a CAPBridgedPlugin bridge class; the plugin is registered via the Objective-C
        // CAP_PLUGIN shim (ApnsTokenPlugin.m) + the Swift plugin class.
        if let cls = NSClassFromString("ApnsTokenPlugin") as? NSObject.Type {
            _ = cls.init()
            print("[Capacitor] ✅ Instantiated ApnsTokenPlugin")
        } else if let cls = NSClassFromString("App.ApnsTokenPlugin") as? NSObject.Type {
            _ = cls.init()
            print("[Capacitor] ✅ Instantiated App.ApnsTokenPlugin")
        } else {
            print("[Capacitor] ❌ ApnsTokenPlugin class not found at runtime")
        }

        // MARK: - BackgroundStepCheck plugin sanity check
        if let cls = NSClassFromString("BackgroundStepCheckPlugin") as? NSObject.Type {
            _ = cls.init()
            print("[Capacitor] ✅ Instantiated BackgroundStepCheckPlugin")
        } else if let cls = NSClassFromString("App.BackgroundStepCheckPlugin") as? NSObject.Type {
            _ = cls.init()
            print("[Capacitor] ✅ Instantiated App.BackgroundStepCheckPlugin")
        } else {
            print("[Capacitor] ❌ BackgroundStepCheckPlugin class not found at runtime")
        }

        // MARK: - Initialize Capacitor Window and WebView
        // Create window
        window = UIWindow(frame: UIScreen.main.bounds)
        
        // Create Capacitor bridge view controller
        let rootViewController = CAPBridgeViewController()
        window?.rootViewController = rootViewController
        
        // Show window
        window?.makeKeyAndVisible()
        
        print("[App] ✅ Capacitor WebView initialized and window shown")

        return true
    }

    // MARK: - APNs diagnostics

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Convert token to hex string (for logs + optional fallback storage)
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        print("[APNs] ✅ didRegisterForRemoteNotificationsWithDeviceToken: \(token)")

        // Save to UserDefaults as fallback
        UserDefaults.standard.set(token, forKey: "apns_device_token")
        
        // ✅ FIX: Forward to Capacitor PushNotifications plugin
        // This ensures the 'registration' event reaches JavaScript
        NotificationCenter.default.post(
            name: Notification.Name.capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
        print("[APNs] ✅ Forwarded token to Capacitor PushNotifications plugin")
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[APNs] ❌ didFailToRegisterForRemoteNotificationsWithError: \(error)")
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers.
        print("[App] 📱 App entered background")
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state.
        print("[App] 📱 App entering foreground")
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused while the application was inactive.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
