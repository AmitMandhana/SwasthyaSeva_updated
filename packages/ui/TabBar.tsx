"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="sticky top-16 z-40 bg-card border-b border-border shadow-sm">
      <div className="flex items-center justify-between px-6">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              data-testid={`tab-${id}`}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "text-primary border-primary"
                  : "text-muted-alt border-transparent hover:text-card-alt hover:border-border"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
