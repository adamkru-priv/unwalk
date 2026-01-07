import Foundation
import Capacitor

@objcMembers
@objc(BackgroundStepCheckPlugin)
public class BackgroundStepCheckPlugin: CAPPlugin {
    
    // MARK: - Cached Steps Access (for JS layer)
    
    @objc func getCachedSteps(_ call: CAPPluginCall) {
        let steps = UserDefaults.standard.integer(forKey: "cached_today_steps")
        let timestamp = UserDefaults.standard.double(forKey: "cached_steps_timestamp")
        
        call.resolve([
            "steps": steps,
            "timestamp": timestamp,
            "isCached": timestamp > 0
        ])
    }
}
