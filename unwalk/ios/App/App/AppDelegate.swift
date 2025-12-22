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

        UserDefaults.standard.set(token, forKey: "apns_device_token")
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[APNs] ❌ didFailToRegisterForRemoteNotificationsWithError: \(error)")
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
