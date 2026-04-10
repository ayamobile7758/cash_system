"use client";

import * as React from "react";
import type { ReactNode } from "react";

type TopbarContentContextValue = {
  topbarContent: ReactNode;
  setTopbarContent: (content: ReactNode) => void;
};

const TopbarContentContext = React.createContext<TopbarContentContextValue>({
  topbarContent: null,
  setTopbarContent: () => {}
});

export function TopbarContentProvider({ children }: { children: ReactNode }) {
  const [topbarContent, setTopbarContent] = React.useState<ReactNode>(null);
  
  const value = React.useMemo(() => ({ 
    topbarContent, 
    setTopbarContent 
  }), [topbarContent]);

  return (
    <TopbarContentContext.Provider value={value}>
      {children}
    </TopbarContentContext.Provider>
  );
}

export function useTopbarContent() {
  return React.useContext(TopbarContentContext);
}
