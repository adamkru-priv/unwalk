import Foundation
import Capacitor

@objcMembers
@objc(ApnsTokenPlugin)
public class ApnsTokenPlugin: CAPPlugin {
  @objc public func getToken(_ call: CAPPluginCall) {
    let token = UserDefaults.standard.string(forKey: "apns_device_token")
    call.resolve(["token": token as Any])
  }
}

// NOTE:
// We intentionally do NOT rely on CAPBridgedPlugin registration here.
// This project uses storyboard-based CAPBridgeViewController, and we observed that
// even with packageClassList including the bridged class, JS still reports
// "ApnsToken" as UNIMPLEMENTED.
// The plugin is registered via the Objective-C shim (ApnsTokenPlugin.m) using CAP_PLUGIN.
