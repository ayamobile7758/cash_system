"use client";

import * as React from "react";
import { Settings } from "lucide-react";

type PosSettingsButtonProps = {
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
};

export function PosSettingsButton({ onClick, buttonRef }: PosSettingsButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="secondary-button pos-settings-button"
      aria-label="الإعدادات"
      onClick={onClick}
    >
      <Settings size={16} aria-hidden="true" />
      <span>الإعدادات</span>
    </button>
  );
}
