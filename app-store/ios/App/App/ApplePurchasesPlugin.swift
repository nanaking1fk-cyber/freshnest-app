import Capacitor
import StoreKit
import UIKit

// Apple's verified, signed transaction is passed to our authenticated server.
// Native verification alone never grants server-side AI credits.
@objc(ApplePurchasesPlugin)
public class ApplePurchasesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ApplePurchasesPlugin"
    public let jsName = "ApplePurchases"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "entitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manage", returnType: CAPPluginReturnPromise)
    ]
    private let productID = "com.bibiniifarms.workandworkout.ai.plus.monthly"
    private var updates: Task<Void, Never>?
    private var pending: [String: Transaction] = [:]
    private var purchasing = false

    public override func load() {
        updates = Task { @MainActor [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                if let item = self.payload(result) {
                    self.notifyListeners("transactionsChanged", data: ["transaction": item])
                }
            }
        }
    }
    deinit { updates?.cancel() }

    @MainActor private func payload(_ result: VerificationResult<Transaction>) -> JSObject? {
        guard case .verified(let transaction) = result, transaction.productID == productID else { return nil }
        pending[String(transaction.id)] = transaction
        return ["id": String(transaction.id), "signedTransaction": result.jwsRepresentation]
    }
    @MainActor private func collect() async -> [JSObject] {
        var items: [String: JSObject] = [:]
        for await result in Transaction.currentEntitlements {
            if let item = payload(result), let id = item["id"] as? String { items[id] = item }
        }
        for await result in Transaction.unfinished {
            if let item = payload(result), let id = item["id"] as? String { items[id] = item }
        }
        return Array(items.values)
    }
    @objc public func products(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                let products = try await Product.products(for: [productID])
                guard let product = products.first, let subscription = product.subscription,
                      subscription.subscriptionPeriod.unit == .month, subscription.subscriptionPeriod.value == 1 else {
                    call.resolve(["available": false]); return
                }
                call.resolve(["available": AppStore.canMakePayments, "id": product.id,
                              "displayPrice": product.displayPrice, "period": "month"])
            } catch { call.reject("Apple subscriptions are unavailable. Please try again later.", "APPLE_UNAVAILABLE") }
        }
    }
    @objc public func purchase(_ call: CAPPluginCall) {
        guard let value = call.getString("appAccountToken"), let token = UUID(uuidString: value) else {
            call.reject("Sign in before subscribing.", "ACCOUNT_REQUIRED"); return
        }
        Task { @MainActor in
            guard !purchasing else { call.reject("A purchase is already in progress."); return }
            purchasing = true
            defer { purchasing = false }
            do {
                guard AppStore.canMakePayments, let product = try await Product.products(for: [productID]).first,
                      product.subscription?.subscriptionPeriod.unit == .month,
                      product.subscription?.subscriptionPeriod.value == 1 else {
                    call.reject("This subscription is not available from Apple yet.", "APPLE_UNAVAILABLE"); return
                }
                switch try await product.purchase(options: [.appAccountToken(token)]) {
                case .success(let result):
                    guard let item = payload(result) else {
                        call.reject("Apple could not verify this purchase. Please restore it later.", "APPLE_UNVERIFIED"); return
                    }
                    // Do not finish here: delivery must first be saved by the server.
                    call.resolve(["status": "purchased", "transaction": item])
                case .pending: call.resolve(["status": "pending"])
                case .userCancelled: call.resolve(["status": "cancelled"])
                @unknown default: call.resolve(["status": "pending"])
                }
            } catch { call.reject("The purchase could not finish. Please try again or restore purchases.", "APPLE_UNAVAILABLE") }
        }
    }
    @objc public func entitlements(_ call: CAPPluginCall) {
        Task { @MainActor in call.resolve(["transactions": await collect()]) }
    }
    @objc public func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            do { try await AppStore.sync(); call.resolve(["transactions": await collect()]) }
            catch { call.reject("Apple could not restore purchases. Please try again.", "APPLE_UNAVAILABLE") }
        }
    }
    @objc public func finish(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let id = call.getString("transactionId"), let transaction = pending[id] else {
                call.reject("Refresh purchases before confirming delivery."); return
            }
            await transaction.finish()
            pending.removeValue(forKey: id)
            call.resolve()
        }
    }
    @objc public func manage(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = bridge?.viewController?.view.window?.windowScene else {
                call.reject("Open Settings, then your Apple Account and Subscriptions."); return
            }
            do { try await AppStore.showManageSubscriptions(in: scene); call.resolve() }
            catch { call.reject("Open Settings, then your Apple Account and Subscriptions.") }
        }
    }
}

class WorkWorkoutBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(ApplePurchasesPlugin())
    }
}
