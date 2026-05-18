import ActivityKit
import ExpoModulesCore

public class LiveActivityModule: Module {
  // Guardado como Any? pra não exigir @available na propriedade da classe.
  // O cast pra Activity<RunAttributes> acontece dentro dos guards de versão.
  private var activityRef: Any?

  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    // True só em iOS 16.1+ com Live Activities habilitadas nas Settings.
    Function("isSupported") { () -> Bool in
      if #available(iOS 16.1, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    Function("startActivity") {
      (distanceKm: Double, paceSec: Double, durationSec: Int, calories: Int, kmProgress: Double) in
      if #available(iOS 16.1, *) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        self.endInternal() // garante que não há duas ativas
        let state = RunAttributes.ContentState(
          distanceKm: distanceKm,
          paceSec: paceSec,
          durationSec: durationSec,
          calories: calories,
          kmProgress: kmProgress
        )
        do {
          let activity = try Activity<RunAttributes>.request(
            attributes: RunAttributes(),
            contentState: state,
            pushType: nil
          )
          self.activityRef = activity
        } catch {
          NSLog("[LiveActivity] start error: \(error.localizedDescription)")
        }
      }
    }

    Function("updateActivity") {
      (distanceKm: Double, paceSec: Double, durationSec: Int, calories: Int, kmProgress: Double) in
      if #available(iOS 16.1, *) {
        guard let activity = self.activityRef as? Activity<RunAttributes> else { return }
        let state = RunAttributes.ContentState(
          distanceKm: distanceKm,
          paceSec: paceSec,
          durationSec: durationSec,
          calories: calories,
          kmProgress: kmProgress
        )
        Task { await activity.update(using: state) }
      }
    }

    Function("endActivity") {
      self.endInternal()
    }
  }

  private func endInternal() {
    if #available(iOS 16.1, *) {
      guard let activity = self.activityRef as? Activity<RunAttributes> else { return }
      Task { await activity.end(dismissalPolicy: .immediate) }
      self.activityRef = nil
    }
  }
}
