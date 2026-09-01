import Foundation
import MetricKit

@available(iOS 14.0, *)
final class AppDiagnosticsReporter: NSObject, MXMetricManagerSubscriber {
    static let shared = AppDiagnosticsReporter()
    private let endpoint = URL(string: "https://www.workandworkout.com/api/v18/client-error")!

    func start() {
        MXMetricManager.shared.add(self)
    }

    func didReceive(_ payloads: [MXDiagnosticPayload]) {
        for payload in payloads {
            payload.crashDiagnostics?.forEach { diagnostic in
                send(
                    source: "native_crash",
                    release: diagnostic.applicationVersion,
                    name: "MXCrashDiagnostic",
                    message: diagnostic.terminationReason ?? "iOS native crash",
                    stack: text(diagnostic.callStackTree.jsonRepresentation())
                )
            }
            payload.hangDiagnostics?.forEach { diagnostic in
                send(
                    source: "native_hang",
                    release: diagnostic.applicationVersion,
                    name: "MXHangDiagnostic",
                    message: "iOS app hang",
                    stack: text(diagnostic.callStackTree.jsonRepresentation())
                )
            }
        }
    }

    private func text(_ data: Data) -> String {
        String(String(data: data, encoding: .utf8)?.prefix(4_000) ?? "")
    }

    private func release(_ value: String) -> String {
        let candidate = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if candidate.range(of: #"^\d+\.\d+\.\d+$"#, options: .regularExpression) != nil {
            return candidate
        }
        return Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0"
    }

    private func send(source: String, release: String, name: String, message: String, stack: String) {
        let report: [String: Any] = [
            "source": source,
            "category": "native",
            "release": self.release(release),
            "surface": "ios",
            "route": "/native/ios",
            "errorName": name,
            "message": String(message.prefix(240)),
            "stack": stack
        ]
        guard let body = try? JSONSerialization.data(withJSONObject: report), body.count <= 16_384 else { return }
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios", forHTTPHeaderField: "X-Work-Workout-Native")
        URLSession.shared.dataTask(with: request).resume()
    }
}
