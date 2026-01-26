'use client';

import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className = '' }: TabsProps) {
  return (
    <div
      className={cn(
        'flex gap-1 rounded-full border-2 border-brand-orange bg-white p-1',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all',
              isActive
                ? 'bg-brand-yellowBtn text-brand-dark shadow-sm'
                : 'text-brand-dark/60 hover:text-brand-dark',
              tab.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
