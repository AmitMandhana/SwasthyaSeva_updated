"use client";

import React, { useState, useEffect } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Mascot } from "./Mascot";

export interface NavItem {
  name: string;
  path: string;
  icon?: React.ReactNode;
}

export interface NavbarProps {
  appName: string;
  navItems: NavItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  userMenu?: React.ReactNode;
}

export function Navbar({
  appName,
  navItems,
  currentPath,
  onNavigate,
  userMenu,
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <nav style={{ position: "sticky", top: 0, zIndex: 50 }} className="bg-card border-b border-border shadow-sm">
        <div className="px-5">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {navItems.length > 0 && (
                <button
                  onClick={toggleMenu}
                  className="md:hidden p-2 rounded-md text-card-alt hover:bg-muted transition-colors"
                  aria-label="Toggle menu"
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>
              )}
              <div
                className="flex items-center gap-2 cursor-pointer shrink-0"
                onClick={() => onNavigate("/")}
              >
                <Mascot size={24} />
                <span className="text-xl font-bold text-primary whitespace-nowrap">{appName}</span>
              </div>

              {/* Desktop nav items */}
              <nav className="hidden md:flex items-center gap-1 ml-4">
                {navItems.map((item) => {
                  const isActive = currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => onNavigate(item.path)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-alt hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-card-alt hover:bg-muted transition-colors"
                aria-label="Toggle theme"
              >
                {mounted && (resolvedTheme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                ))}
              </button>
              {userMenu}
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar overlay */}
      {isOpen && navItems.length > 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9998 }}>
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeMenu}
          />

          <div className="absolute top-0 left-0 h-full w-72 max-w-[85vw] bg-card border-r border-border shadow-xl">
            <div className="p-5 pt-5">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold text-card-alt">Navigation</h2>
                <button
                  onClick={closeMenu}
                  className="p-1.5 rounded-md text-muted-alt hover:text-card-alt hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        onNavigate(item.path);
                        closeMenu();
                      }}
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors text-left ${
                        isActive
                          ? "bg-primary text-primary-alt font-medium"
                          : "text-card-alt hover:bg-muted"
                      }`}
                    >
                      {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
