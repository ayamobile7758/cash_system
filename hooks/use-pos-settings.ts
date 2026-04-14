"use client";

import * as React from "react";
import { POS_SETTINGS_DEFAULTS, usePosSettingsStore } from "@/stores/pos-settings";

export function usePosSettings() {
  const density = usePosSettingsStore((state) => state.density);
  const fontSize = usePosSettingsStore((state) => state.fontSize);
  const contrast = usePosSettingsStore((state) => state.contrast);
  const hydrated = usePosSettingsStore((state) => state.hydrated);
  const set = usePosSettingsStore((state) => state.set);
  const reset = usePosSettingsStore((state) => state.reset);

  React.useEffect(() => {
    if (!usePosSettingsStore.getState().hydrated) {
      usePosSettingsStore.setState({ hydrated: true });
    }
  }, []);

  return {
    density: hydrated ? density : POS_SETTINGS_DEFAULTS.density,
    fontSize: hydrated ? fontSize : POS_SETTINGS_DEFAULTS.fontSize,
    contrast: hydrated ? contrast : POS_SETTINGS_DEFAULTS.contrast,
    hydrated,
    set,
    reset
  };
}
