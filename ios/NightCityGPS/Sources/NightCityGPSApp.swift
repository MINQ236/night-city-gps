import SwiftUI
import WebKit

// Native iOS shell for the hosted PWA. This is not a CarPlay app.
// iOS WebKit may impose different GPS/speech behavior than Safari: test on a device.
@main
struct NightCityGPSApp: App {
    var body: some Scene {
        WindowGroup {
            NightCityHome()
        }
    }
}

struct NightCityHome: View {
    @State private var reloadToken = UUID()
    var body: some View {
        ZStack(alignment: .topTrailing) {
            NightCityWebView(token: reloadToken)
                .ignoresSafeArea()
            Button {
                reloadToken = UUID()
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 14, weight: .bold))
                    .padding(10)
                    .foregroundStyle(.cyan)
                    .background(.black.opacity(0.7))
                    .clipShape(Circle())
            }
            .accessibilityLabel("Reload Night City GPS")
            .padding(.top, 55)
            .padding(.trailing, 10)
        }
        .background(Color(red: 6/255, green: 23/255, blue: 46/255))
    }
}

struct NightCityWebView: UIViewRepresentable {
    let token: UUID
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 6/255, green: 23/255, blue: 46/255, alpha: 1)
        webView.scrollView.isScrollEnabled = false
        webView.allowsBackForwardNavigationGestures = false
        webView.load(URLRequest(url: URL(string: "https://minq236.github.io/night-city-gps/")!))
        return webView
    }
    func updateUIView(_ view: WKWebView, context: Context) {
        if context.coordinator.lastToken != token {
            context.coordinator.lastToken = token
            view.reload()
        }
    }
    func makeCoordinator() -> Coordinator { Coordinator(token: token) }
    final class Coordinator {
        var lastToken: UUID
        init(token: UUID) { lastToken = token }
    }
}
