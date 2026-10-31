"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { TextField } from "./TextField";
import { Button } from "./Button";
import { Card } from "./Card";
import { validatePassword } from "./validators";

export interface ChangePasswordFormProps {
  onSubmit: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  onSuccess?: () => void;
  testIdPrefix?: string;
  className?: string;
}

export function ChangePasswordForm({ onSubmit, onSuccess, testIdPrefix = "profile", className = "" }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword.trim()) { setError("Current password is required"); return; }
    if (!newPassword.trim()) { setError("New password is required"); return; }
    const pwErr = validatePassword(newPassword);
    if (pwErr) { setError(pwErr); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }

    setSaving(true);
    try {
      await onSubmit({ currentPassword, newPassword });
      setSuccess("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={`p-6 space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Shield className="w-5 h-5" /> Change Password
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <TextField label="Current Password" type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="Enter current password" data-testid={`${testIdPrefix}-current-password`} />
        <TextField label="New Password" type="password" value={newPassword} onChange={setNewPassword} placeholder="Min 12 chars, uppercase, digit, special" data-testid={`${testIdPrefix}-new-password`} />
        <TextField label="Confirm New Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter new password" data-testid={`${testIdPrefix}-confirm-password`} />
        {error && <p data-testid={`${testIdPrefix}-password-error`} className="text-sm text-destructive">{error}</p>}
        {success && <p data-testid={`${testIdPrefix}-password-success`} className="text-sm text-success">{success}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </Card>
  );
}
