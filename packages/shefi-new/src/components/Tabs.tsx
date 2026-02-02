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
        'flex w-full gap-1 rounded-full border-2 border-brand-accent/30 bg-white p-1',
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
              'flex-1 whitespace-nowrap rounded-full px-2 py-2 text-xs font-medium transition-all sm:px-4 sm:text-sm',
              isActive
                ? 'bg-gradient-to-r from-brand-pinkBtn to-brand-lavender text-brand-dark shadow-sm'
                : 'text-brand-dark/60 hover:text-brand-dark hover:bg-brand-pinkBtn/20',
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
