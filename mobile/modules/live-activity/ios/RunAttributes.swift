import ActivityKit
import Foundation

// ATENÇÃO: este struct precisa ser IDÊNTICO ao de
// targets/widget/RunAttributes.swift — o ActivityKit casa a Live Activity
// (disparada aqui) com o widget pelo nome do tipo + forma do ContentState.
// Qualquer divergência quebra o match.
struct RunAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var distanceKm: Double
    var paceSec: Double // segundos por km (0 = sem pace ainda)
    var durationSec: Int
    var calories: Int
    var kmProgress: Double // 0..1 progresso dentro do km atual
  }
}
