import Foundation

/// Health records in the WebView must not enter an automatic iCloud backup.
/// Explicit, consented account sync remains the user's recovery option.
enum AppDataPrivacy {
    static func preparePrivateStorage() {
        let manager = FileManager.default
        guard let library = manager.urls(for: .libraryDirectory, in: .userDomainMask).first else { return }
        // WKWebsiteDataStore and Capacitor persist planner data in these containers.
        // Preserve every file; only the backup eligibility metadata changes.
        for name in ["WebKit", "Application Support"] {
            var directory = library.appendingPathComponent(name, isDirectory: true)
            do {
                try manager.createDirectory(at: directory, withIntermediateDirectories: true)
                var values = URLResourceValues()
                values.isExcludedFromBackup = true
                try directory.setResourceValues(values)
            } catch {
                // Never log the user's paths or stored contents.
                NSLog("Work + Workout: private storage backup protection could not be applied.")
            }
        }
    }
}
