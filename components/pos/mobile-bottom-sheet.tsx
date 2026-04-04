"use client";

import * as React from "react";
import { Drawer } from "vaul";

type MobileBottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  footer?: React.ReactNode;
  snapPoints?: (number | string)[];
  dismissible?: boolean;
};

export function MobileBottomSheet({
  open,
  onOpenChange,
  children,
  title,
  footer,
  snapPoints,
  dismissible = true
}: MobileBottomSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
      dismissible={dismissible}
      shouldScaleBackground
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
        <Drawer.Content className="bg-slate-50 flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-50 outline-none h-full max-h-[96%] border-t border-slate-200/50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <div className="p-4 bg-white rounded-t-[20px] flex-1 flex flex-col items-center">
            {/* Grabber handle */}
            <div className="w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-300 mb-6" />

            {title && (
              <Drawer.Title className="font-bold text-xl mb-4 text-slate-800 w-full text-center">
                {title}
              </Drawer.Title>
            )}

            {/* Scrollable Body Content */}
            <div className="w-full max-h-[calc(100vh-200px)] overflow-y-auto pb-6 custom-scrollbar">
              {children}
            </div>
          </div>

          {/* Sticky Footer for CTA buttons (like Checkout/Pay) */}
          {footer && (
            <div className="p-4 border-t border-slate-200 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)] mt-auto sticky bottom-0 w-full z-10 pb-safe">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
