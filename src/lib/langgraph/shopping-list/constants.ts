export const NODE_PROGRESS: Record<
  string,
  { progress: number; label: string }
> = {
  fetch_profile: { progress: 5, label: "loader.fetchingProfile" },
  macro_calc: { progress: 15, label: "loader.calculatingMacros" },
  pantry_health_check: { progress: 18, label: "loader.checkingPantry" },
  fetch_history: { progress: 20, label: "loader.fetchingHistory" },
  inventory_scan: { progress: 25, label: "loader.scanningInventory" },
  build_prompt: { progress: 30, label: "loader.buildingPrompt" },
  ai_generator: { progress: 60, label: "loader.generatingList" },
  merger: { progress: 80, label: "loader.merging" },
  macro_validator: { progress: 85, label: "loader.validatingMacros" },
  final_format: { progress: 90, label: "loader.formatting" },
  save_to_db: { progress: 95, label: "loader.saving" },
  notify_user: { progress: 100, label: "loader.done" },
};
