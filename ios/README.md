# iPhone / CarPlay development, from Windows

## What this folder actually builds

- `project.yml`: XcodeGen specification to create an iOS Xcode project.
- `NightCityGPS/Sources/NightCityGPSApp.swift`: tiny SwiftUI iPhone app wrapper that loads the public website in a WKWebView. It is a starting native app, **not CarPlay** and it is **not signed for real-device installation**.
- `NightCityGPS/Info.plist`: bundle/location metadata.
- `CarPlay-Future/CarPlaySceneDelegate.swift`: example of connecting an Apple-approved CarPlay navigation scene to CPMapTemplate using a *generic* MKMapView. Not included in builds; NOT a complete CarPlay renderer.

## Build with a cloud Mac on GitHub

1. Upload the full project to your existing public GitHub repo (see main README).
2. In the repository **Actions** tab, find **iOS simulator build (cloud Mac)**.
3. Click **Run workflow**, then open the job logs.
4. When it succeeds, an artifact called `NightCityGPS-iOS-Simulator-UNSIGNED-NOT-FOR-IPHONE` appears.
5. **The .app artifact runs only in the iOS Simulator, not on your iPhone 15 Pro.** It is not an IPA, not an App Store binary and will not appear on CarPlay.

This workflow rents nothing from you directly: it runs on a temporary GitHub-hosted macOS runner subject to the current usage/billing limits for your plan and repo visibility. Check GitHub Actions usage settings before running costly jobs.

## What you will still need to install on your real iPhone

To install a native iOS app on hardware you need a valid iOS provisioning profile and code signature. Typical supported workflow is a Mac running Xcode with your Apple account; GitHub Actions can automate signing only if you set up certificates, provisioning and appropriate Apple credentials. Do not upload your private signing keys or Apple password into a public repository; use encrypted GitHub secrets and an audited build workflow.

An Apple Developer Program membership may be needed for distribution, Apple-specific capabilities or TestFlight. Simply downloading the unsigned simulator artifact to Windows cannot install it on an iPhone.

## What is still needed for CarPlay

Apple must grant `com.apple.developer.carplay-maps` (CarPlay navigation) entitlement. An entitlement isn't automatically granted merely by using Swift or GitHub Actions. The current iPhone web app cannot be embedded into CarPlay as an ordinary web page.

After approval, developers must:

1. Configure an appropriate CarPlay scene in `Info.plist` (`CPTemplateApplicationSceneSessionRoleApplication`, `CPTemplateApplicationScene`, matching scene delegate), plus Apple's approved entitlement.
2. Draw CarPlay map content in the CarPlay window with a supported rendering approach; `CPMapTemplate` is **only the navigation-control overlay**. The included example uses MKMapView and **does not** reproduce our Cyberpunk colors.
3. Share position, route progress, maneuvers and destination state with the actual native navigation engine (web `app.mjs` is not a safe CarPlay engine).
4. Implement CarPlay guidance/`CPTrip`, routing choices, route preview, navigation session and display updates according to Apple's APIs and guidelines, including hands-free interaction and safety controls.
5. Run and test on Xcode's CarPlay Simulator and on an eligible physical car when possible; Apple may still deny app review/entitlements.

CarPlay navigation docs: https://developer.apple.com/documentation/carplay/integrating-carplay-with-your-navigation-app
CarPlay entitlement info: https://developer.apple.com/documentation/carplay/requesting-carplay-entitlements

**Do not claim this repo builds a complete CarPlay app today.** The native shell + simulator build are a legitimate preparation step, not an entitlement bypass.
