"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown, KeyRound } from "lucide-react";
import { Modal, ChangePasswordForm } from "@swasthyaseva/ui";
import { updateAdminProfile } from "@/lib/api";

interface UserMenuDropdownProps {
  username: string;
  onLogout: () => void;
}

export default function UserMenuDropdown({ username, onLogout }: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <>
      <div ref={ref} className="relative">
        <button
          data-testid="user-menu-trigger"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-alt hover:text-card-alt hover:bg-muted transition-colors"
        >
          <span className="hidden sm:inline">{username}</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div
            data-testid="user-menu-dropdown"
            className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-card shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium text-card-alt">{username}</p>
              <p className="text-xs text-muted-alt">Administrator</p>
            </div>

            <button
              data-testid="user-menu-change-password"
              onClick={() => { setOpen(false); setShowPasswordModal(true); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-card-alt hover:bg-muted transition-colors"
            >
              <KeyRound size={15} className="text-muted-alt" />
              Change Password
            </button>

            <div className="border-t border-border my-1" />

            <button
              data-testid="user-menu-logout"
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        )}
      </div>

      {showPasswordModal && (
        <Modal title="Change Password" onClose={() => setShowPasswordModal(false)} maxWidth="lg">
          <ChangePasswordForm
            onSubmit={async ({ currentPassword, newPassword }) => {
              await updateAdminProfile({ currentPassword, newPassword });
            }}
            testIdPrefix="user-menu"
          />
        </Modal>
      )}
    </>
  );
}
