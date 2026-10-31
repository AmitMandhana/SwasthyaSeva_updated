'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Camera } from 'lucide-react';
import { Card, useAuth, ChangePasswordForm, usePhotoUpload, PhotoPreviewModal } from '@swasthyaseva/ui';
import { getProfile, updateClinicProfile, getCloudinarySignature } from '@/lib/api';

export default function ProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const onPhotoUploaded = useCallback(async (url: string) => {
    await updateClinicProfile({ pfp_link: url });
    if (profile) setProfile({ ...profile, pfp_link: url });
  }, [profile]);

  const photo = usePhotoUpload({ getSignature: getCloudinarySignature, onUploaded: onPhotoUploaded });

  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data.profile);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div data-testid="profile-loading" className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pfpLink = (profile as Record<string, unknown>)?.pfp_link as string | undefined;
  const clinicInitial = (user?.username?.[0] || 'C').toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      <input ref={photo.fileInputRef} type="file" accept="image/*" className="hidden" onChange={photo.handleFileSelected} />

      <h2 className="text-xl font-bold text-foreground">Profile</h2>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <button data-testid="profile-avatar-btn" onClick={photo.handleAvatarClick} className="relative group cursor-pointer shrink-0" title="Change photo">
            {pfpLink ? (
              <img src={pfpLink} alt="Profile" className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold ring-2 ring-primary/20">
                {clinicInitial}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          <div>
            <p data-testid="profile-username" className="text-lg font-semibold text-foreground">{user?.username || 'User'}</p>
            <p data-testid="profile-role" className="text-xs text-muted-alt capitalize">{user?.role === 'clinic' ? 'Clinic Entity' : 'Clinic Admin'}</p>
            <p className="text-xs text-muted-alt mt-1">Click photo to change</p>
          </div>
        </div>
      </Card>

      <ChangePasswordForm onSubmit={async ({ currentPassword, newPassword }) => {
        await updateClinicProfile({ currentPassword, newPassword });
      }} />

      <PhotoPreviewModal photo={photo} />
    </div>
  );
}

import { componentTestSpec } from '@swasthyaseva/test-gen';

export const __test = componentTestSpec({
  parentRoute: '/dashboard',
  app: 'clinic',
  title: 'Profile Tab',
  elements: {
    profileTab: { role: 'button', name: /Profile/ },
    heading: { role: 'heading', name: 'Profile' },
    usernameDisplay: { testId: 'profile-username' },
    roleLabel: { testId: 'profile-role' },
    avatarButton: { testId: 'profile-avatar-btn' },
    currentPasswordInput: { role: 'textbox', name: 'Current Password' },
    newPasswordInput: { role: 'textbox', name: 'New Password', exact: true },
    confirmPasswordInput: { role: 'textbox', name: 'Confirm New Password' },
    updatePasswordBtn: { role: 'button', name: /Update Password/ },
    passwordError: { testId: 'profile-password-error' },
    passwordSuccess: { testId: 'profile-password-success' },
    loadingSpinner: { testId: 'profile-loading' },
    photoPreviewModal: { role: 'dialog', name: 'Change Profile Photo' },
    savePhotoButton: { role: 'button', name: /Save Photo/ },
  },
  flows: [
    {
      name: 'view profile information',
      steps: [
        { do: 'click', on: 'profileTab' },
        { do: 'waitFor', on: 'usernameDisplay' },
        { expect: 'visible', on: 'usernameDisplay' },
        { expect: 'visible', on: 'roleLabel' },
      ],
    },
    {
      name: 'avatar button is visible and clickable',
      after: 'view profile information',
      steps: [
        { expect: 'visible', on: 'avatarButton' },
      ],
    },
    {
      name: 'show password mismatch error',
      after: 'view profile information',
      steps: [
        { do: 'fill', on: 'currentPasswordInput', value: 'oldpassword' },
        { do: 'fill', on: 'newPasswordInput', value: 'ValidPass123!' },
        { do: 'fill', on: 'confirmPasswordInput', value: 'DifferentPass1!' },
        { do: 'click', on: 'updatePasswordBtn' },
        { expect: 'visible', on: 'passwordError' },
        { expect: 'text', on: 'passwordError', value: 'Passwords do not match' },
      ],
    },
    {
      name: 'upload photo shows preview modal',
      after: 'view profile information',
      steps: [
        { do: 'uploadFile', on: 'avatarButton', value: 'e2e/fixtures/test-avatar.png' },
        { expect: 'visible', on: 'photoPreviewModal' },
        { expect: 'visible', on: 'savePhotoButton' },
      ],
    },
    {
      name: 'show too short password error',
      after: 'view profile information',
      steps: [
        { do: 'fill', on: 'currentPasswordInput', value: 'oldpassword' },
        { do: 'fill', on: 'newPasswordInput', value: 'Short1!' },
        { do: 'fill', on: 'confirmPasswordInput', value: 'Short1!' },
        { do: 'click', on: 'updatePasswordBtn' },
        { expect: 'visible', on: 'passwordError' },
        { expect: 'text', on: 'passwordError', value: 'Password must be at least 12 characters long' },
      ],
    },
    {
      name: 'show no uppercase error',
      after: 'view profile information',
      steps: [
        { do: 'fill', on: 'currentPasswordInput', value: 'oldpassword' },
        { do: 'fill', on: 'newPasswordInput', value: 'abcdefgh1234!' },
        { do: 'fill', on: 'confirmPasswordInput', value: 'abcdefgh1234!' },
        { do: 'click', on: 'updatePasswordBtn' },
        { expect: 'visible', on: 'passwordError' },
        { expect: 'text', on: 'passwordError', value: 'Must contain uppercase letter' },
      ],
    },
    {
      name: 'show no digit error',
      after: 'view profile information',
      steps: [
        { do: 'fill', on: 'currentPasswordInput', value: 'oldpassword' },
        { do: 'fill', on: 'newPasswordInput', value: 'Abcdefghijkl!' },
        { do: 'fill', on: 'confirmPasswordInput', value: 'Abcdefghijkl!' },
        { do: 'click', on: 'updatePasswordBtn' },
        { expect: 'visible', on: 'passwordError' },
        { expect: 'text', on: 'passwordError', value: 'Must contain a digit' },
      ],
    },
    {
      name: 'show no special char error',
      after: 'view profile information',
      steps: [
        { do: 'fill', on: 'currentPasswordInput', value: 'oldpassword' },
        { do: 'fill', on: 'newPasswordInput', value: 'Abcdefgh1234' },
        { do: 'fill', on: 'confirmPasswordInput', value: 'Abcdefgh1234' },
        { do: 'click', on: 'updatePasswordBtn' },
        { expect: 'visible', on: 'passwordError' },
        { expect: 'text', on: 'passwordError', value: 'Must contain a special character' },
      ],
    },
    {
      name: 'show empty current password error',
      after: 'view profile information',
      steps: [
        { do: 'fill', on: 'currentPasswordInput', value: '' },
        { do: 'fill', on: 'newPasswordInput', value: 'ValidPass123!' },
        { do: 'fill', on: 'confirmPasswordInput', value: 'ValidPass123!' },
        { do: 'click', on: 'updatePasswordBtn' },
        { expect: 'visible', on: 'passwordError' },
        { expect: 'text', on: 'passwordError', value: 'Current password is required' },
      ],
    },
    {
      name: 'successful password change shows success message then restores',
      after: 'view profile information',
      steps: [
        { do: 'fill', on: 'currentPasswordInput', value: 'TestClinic@123' },
        { do: 'fill', on: 'newPasswordInput', value: 'TempNewPass@456' },
        { do: 'fill', on: 'confirmPasswordInput', value: 'TempNewPass@456' },
        { do: 'click', on: 'updatePasswordBtn' },
        { expect: 'visible', on: 'passwordSuccess' },
        { expect: 'text', on: 'passwordSuccess', value: 'Password updated successfully' },
        { do: 'fill', on: 'currentPasswordInput', value: 'TempNewPass@456' },
        { do: 'fill', on: 'newPasswordInput', value: 'TestClinic@123' },
        { do: 'fill', on: 'confirmPasswordInput', value: 'TestClinic@123' },
        { do: 'click', on: 'updatePasswordBtn' },
        { expect: 'visible', on: 'passwordSuccess' },
      ],
    },
    {
      name: 'wrong current password shows error',
      after: 'view profile information',
      steps: [
        { do: 'fill', on: 'currentPasswordInput', value: 'totally_wrong_password' },
        { do: 'fill', on: 'newPasswordInput', value: 'NewValidPass@123' },
        { do: 'fill', on: 'confirmPasswordInput', value: 'NewValidPass@123' },
        { do: 'click', on: 'updatePasswordBtn' },
        { expect: 'visible', on: 'passwordError' },
      ],
    },
  ],
});
