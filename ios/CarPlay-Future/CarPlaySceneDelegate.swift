// FUTURE REFERENCE ONLY. Not compiled into the iOS shell build.
// Before enabling: Apple must grant the navigation CarPlay entitlement and
// you must implement a native CarPlay-suitable navigation engine/map renderer.
// CPMapTemplate overlays a map that YOUR app draws in the provided CPWindow.
// The sample deliberately uses MKMapView only to demonstrate scene wiring;
// it does NOT render our Cyberpunk style or offer turn-by-turn CarPlay guidance.

import UIKit
import CarPlay
import MapKit

final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    private var mapView: MKMapView?
    private weak var controller: CPInterfaceController?

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                  didConnect interfaceController: CPInterfaceController,
                                  to window: CPWindow) {
        controller = interfaceController
        let host = UIViewController()
        let map = MKMapView(frame: .zero)
        map.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        map.frame = window.bounds
        map.showsUserLocation = true
        host.view.addSubview(map)
        window.rootViewController = host
        mapView = map
        let template = CPMapTemplate()
        interfaceController.setRootTemplate(template, animated: false, completion: nil)
    }

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                  didDisconnect interfaceController: CPInterfaceController,
                                  from window: CPWindow) {
        mapView = nil
        controller = nil
        window.rootViewController = nil
    }
}
