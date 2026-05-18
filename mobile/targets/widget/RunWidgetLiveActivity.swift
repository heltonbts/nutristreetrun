import ActivityKit
import SwiftUI
import WidgetKit

// Paleta NSR (mesma do app: tokens.ts)
private extension Color {
  static let nsrBg = Color(red: 14 / 255, green: 17 / 255, blue: 16 / 255)
  static let nsrText = Color(red: 236 / 255, green: 239 / 255, blue: 238 / 255)
  static let nsrMute = Color(red: 140 / 255, green: 150 / 255, blue: 148 / 255)
  static let nsrBrand = Color(red: 95 / 255, green: 184 / 255, blue: 168 / 255)
}

private func fmtPace(_ secPerKm: Double) -> String {
  guard secPerKm > 0, secPerKm.isFinite, secPerKm < 5400 else { return "--'--\"" }
  let m = Int(secPerKm) / 60
  let s = Int(secPerKm) % 60
  return String(format: "%d'%02d\"", m, s)
}

private func fmtDuration(_ sec: Int) -> String {
  let h = sec / 3600
  let m = (sec % 3600) / 60
  let s = sec % 60
  return h > 0
    ? String(format: "%d:%02d:%02d", h, m, s)
    : String(format: "%d:%02d", m, s)
}

// Métrica vertical reutilizável (valor grande + label)
private struct Metric: View {
  let value: String
  let unit: String?
  let label: String
  var accent: Bool = false

  var body: some View {
    VStack(alignment: .leading, spacing: 1) {
      HStack(alignment: .firstTextBaseline, spacing: 2) {
        Text(value)
          .font(.system(size: 22, weight: .heavy, design: .rounded))
          .foregroundColor(accent ? .nsrBrand : .nsrText)
        if let unit {
          Text(unit).font(.system(size: 11, weight: .medium)).foregroundColor(.nsrMute)
        }
      }
      Text(label.uppercased())
        .font(.system(size: 9, weight: .semibold))
        .foregroundColor(.nsrMute)
        .tracking(0.5)
    }
  }
}

// Conteúdo do lock screen / banner
private struct LockScreenView: View {
  let state: RunAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        HStack(spacing: 6) {
          Circle().fill(Color.nsrBrand).frame(width: 7, height: 7)
          Text("CORRENDO")
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(.nsrBrand)
            .tracking(1.5)
        }
        Spacer()
        Text("NUTRISTREET RUN")
          .font(.system(size: 9, weight: .semibold))
          .foregroundColor(.nsrMute)
          .tracking(1)
      }

      HStack(alignment: .bottom) {
        Metric(
          value: String(format: "%.2f", state.distanceKm), unit: "km",
          label: "Distância", accent: true)
        Spacer()
        Metric(value: fmtPace(state.paceSec), unit: nil, label: "Pace /km")
        Spacer()
        Metric(value: fmtDuration(state.durationSec), unit: nil, label: "Tempo")
        Spacer()
        Metric(
          value: "\(state.calories)", unit: "kcal", label: "Calorias")
      }

      // Barra de progresso do km atual
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          Capsule().fill(Color.white.opacity(0.08))
          Capsule().fill(Color.nsrBrand)
            .frame(width: geo.size.width * max(0, min(1, state.kmProgress)))
        }
      }
      .frame(height: 4)
    }
    .padding(16)
    .activityBackgroundTint(Color.nsrBg)
    .activitySystemActionForegroundColor(Color.nsrBrand)
  }
}

struct RunWidgetLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RunAttributes.self) { context in
      LockScreenView(state: context.state)
    } dynamicIsland: { context in
      DynamicIsland {
        // Expanded (toque longo na ilha)
        DynamicIslandExpandedRegion(.leading) {
          Metric(
            value: String(format: "%.2f", context.state.distanceKm), unit: "km",
            label: "Distância", accent: true)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Metric(value: fmtPace(context.state.paceSec), unit: nil, label: "Pace /km")
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack {
            Metric(
              value: fmtDuration(context.state.durationSec), unit: nil, label: "Tempo")
            Spacer()
            Metric(value: "\(context.state.calories)", unit: "kcal", label: "Calorias")
          }
        }
      } compactLeading: {
        Text(String(format: "%.1f", context.state.distanceKm))
          .font(.system(size: 13, weight: .bold, design: .rounded))
          .foregroundColor(.nsrBrand)
      } compactTrailing: {
        Text(fmtPace(context.state.paceSec))
          .font(.system(size: 13, weight: .bold, design: .rounded))
          .foregroundColor(.nsrText)
      } minimal: {
        Text(String(format: "%.0f", context.state.distanceKm))
          .font(.system(size: 13, weight: .bold, design: .rounded))
          .foregroundColor(.nsrBrand)
      }
      .keylineTint(Color.nsrBrand)
    }
  }
}

@main
struct RunWidgetBundle: WidgetBundle {
  var body: some Widget {
    RunWidgetLiveActivity()
  }
}
