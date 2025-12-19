import Foundation
import Capacitor

@objc(ApnsTokenPlugin)
public class ApnsTokenPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ApnsTokenPlugin"
    public let jsName = "ApnsToken"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getToken", returnType: CAPPluginReturnPromise)
    ]

    @objc func getToken(_ call: CAPPluginCall) {
        let token = UserDefaults.standard.string(forKey: "apns_device_token")
        call.resolve(["token": token as Any])
    }
}
