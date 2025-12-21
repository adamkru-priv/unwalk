import UIKit
import Capacitor

@objc(SceneDelegate)
public class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    // If using a storyboard (Main.storyboard), UIKit will create the window automatically.
    // This method exists to satisfy UIScene lifecycle and allow future customization.
    guard let _ = (scene as? UIWindowScene) else { return }
  }
}
