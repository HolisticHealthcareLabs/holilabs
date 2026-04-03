'use client';

interface ThreePanelLayoutProps {
  header?: React.ReactNode;
  banner?: React.ReactNode;
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
}

export function ThreePanelLayout({
  header,
  banner,
  left,
  center,
  right,
}: ThreePanelLayoutProps) {
  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden">
      {header}
      {banner && <div className="shrink-0 px-2 py-0.5">{banner}</div>}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-800">
          {left}
        </aside>
        <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          {center}
        </main>
        <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-gray-200 dark:border-gray-800">
          {right}
        </aside>
      </div>
    </div>
  );
}
