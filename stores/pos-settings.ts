import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PosDensity = "compact" | "comfortable" | "spacious";
export type PosFontSize = "sm" | "md" | "lg" | "xl";
export type PosContrast = "off" | "soft" | "strong";

type PosSettingsState = {
  density: PosDensity;
  fontSize: PosFontSize;
  contrast: PosContrast;
};

type PosSettingsStore = PosSettingsState & {
  hydrated: boolean;
  set: (next: Partial<PosSettingsState>) => void;
  reset: () => void;
};

export const POS_SETTINGS_DEFAULTS: PosSettingsState = {
  density: "comfortable",
  fontSize: "md",
  contrast: "off"
};

export const POS_SETTINGS_STORAGE_KEY = "aya.pos-settings.v1";

export const usePosSettingsStore = create<PosSettingsStore>()(
  persist(
    (set) => ({
      ...POS_SETTINGS_DEFAULTS,
      hydrated: false,
      set(next) {
        set((state) => ({
          ...state,
          ...next
        }));
      },
      reset() {
        set((state) => ({
          ...POS_SETTINGS_DEFAULTS,
          hydrated: state.hydrated
        }));
      }
    }),
    {
      name: POS_SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        density: state.density,
        fontSize: state.fontSize,
        contrast: state.contrast
      }),
      merge: (persistedState, currentState) => {
        const snapshot =
          persistedState && typeof persistedState === "object"
            ? (persistedState as Partial<PosSettingsState>)
            : {};

        return {
          ...currentState,
          ...snapshot,
          hydrated: false
        };
      }
    }
  )
);
