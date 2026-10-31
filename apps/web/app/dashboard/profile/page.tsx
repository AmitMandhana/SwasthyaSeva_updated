'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Camera, ArrowLeft } from 'lucide-react';
import { Card, ChangePasswordForm, usePhotoUpload, PhotoPreviewModal, Button } from '@swasthyaseva/ui';
import { getPatientProfile, updatePatientProfile, getCloudinarySignature, type PatientProfile } from '../../../lib/patientApi';
import Link from 'next/link';
import { testSpec } from '@swasthyaseva/test-gen';

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return phone;
  return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
}

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [occupation, setOccupation] = useState('');
  const [savingOccupation, setSavingOccupation] = useState(false);

  const onPhotoUploaded = useCallback(async (url: string) => {
    await updatePatientProfile({ pfp_link: url });
    if (profile) setProfile({ ...profile, pfp_link: url });
  }, [profile]);

  const photo = usePhotoUpload({ getSignature: getCloudinarySignature, onUploaded: onPhotoUploaded });

  useEffect(() => {
    getPatientProfile()
      .then(({ profile: p }) => {
        setProfile(p);
        setOccupation(p.occupation || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 data-testid="profile-loading-spinner" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center py-10 text-muted-alt">Failed to load profile</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <input ref={photo.fileInputRef} type="file" accept="image/*" className="hidden" onChange={photo.handleFileSelected} />

      <Link href="/dashboard" className="text-sm text-primary hover:underline flex items-center gap-1">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      <h1 data-testid="profile-heading" className="text-2xl font-bold text-foreground">Profile</h1>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <button data-testid="profile-avatar" onClick={photo.handleAvatarClick} className="relative group cursor-pointer shrink-0" title="Change photo">
            {profile.pfp_link ? (
              <img src={profile.pfp_link} alt="Profile" className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold ring-2 ring-primary/20">
                {(profile.first_name?.[0] || '').toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          <div>
            <p data-testid="profile-name" className="text-lg font-semibold text-foreground">{profile.first_name} {profile.last_name}</p>
            <p className="text-sm text-muted-alt">{maskPhone(profile.phone)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-alt uppercase tracking-wide">Email</span>
            <p className="text-card-alt font-medium">{profile.email || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-alt uppercase tracking-wide">Gender</span>
            <p className="text-card-alt font-medium capitalize">{profile.gender || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-alt uppercase tracking-wide">Date of Birth</span>
            <p className="text-card-alt font-medium">{profile.dob ? new Date(profile.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-alt uppercase tracking-wide">Location</span>
            <p className="text-card-alt font-medium">{[profile.city, profile.state].filter(Boolean).join(', ') || '—'}</p>
          </div>
          <div className="col-span-full">
            <span className="text-xs text-muted-alt uppercase tracking-wide">Occupation</span>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                data-testid="profile-occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Teacher, Engineer, Homemaker"
                className="flex-1 px-3 py-1.5 text-sm border border-input rounded-md bg-background text-card-alt focus:outline-none focus:border-primary"
              />
              <Button
                onClick={async () => {
                  setSavingOccupation(true);
                  try {
                    await updatePatientProfile({ occupation });
                    if (profile) setProfile({ ...profile, occupation });
                  } catch {}
                  setSavingOccupation(false);
                }}
                disabled={savingOccupation || occupation === (profile.occupation || '')}
                size="sm"
              >
                {savingOccupation ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ChangePasswordForm onSubmit={async ({ currentPassword, newPassword }) => {
        await updatePatientProfile({ currentPassword, newPassword });
      }} />

      <PhotoPreviewModal photo={photo} />
    </div>
  );
}

export const __test = testSpec({
  route: '/dashboard/profile',
  auth: 'role:patient',
  app: 'web',
  title: 'Patient Profile',
  elements: {
    heading: { testId: 'profile-heading' },
    backToDashboard: { role: 'link', name: /Back to Dashboard/ },
    profileName: { testId: 'profile-name' },
    emailField: { text: 'Email' },
    genderField: { text: 'Gender' },
    dobField: { text: 'Date of Birth' },
    locationField: { text: 'Location' },
    changePasswordHeading: { role: 'heading', name: 'Change Password' },
    currentPasswordInput: { testId: 'profile-current-password' },
    newPasswordInput: { testId: 'profile-new-password' },
    confirmPasswordInput: { testId: 'profile-confirm-password' },
    updatePasswordBtn: { role: 'button', name: 'Update Password' },
    passwordError: { testId: 'profile-password-error' },
    passwordSuccess: { text: 'Password updated successfully' },
    occupationInput: { testId: 'profile-occupation' },
    occupationSaveBtn: { role: 'button', name: 'Save' },
    avatarButton: { testId: 'profile-avatar' },
    photoPreviewModal: { role: 'dialog', name: 'Change Profile Photo' },
    savePhotoButton: { role: 'button', name: /Save Photo/ },
    cancelPhotoButton: { role: 'button', name: 'Cancel' },
  },
  flows: [],
  flowTree: {
    name: 'patient profile',
    steps: [],
    children: [
      {
        name: 'view profile details',
        steps: [
          { do: 'waitFor', on: 'heading' },
          { expect: 'visible', on: 'heading' },
          { do: 'waitFor', on: 'profileName' },
          { expect: 'visible', on: 'profileName' },
          { expect: 'visible', on: 'emailField' },
          { expect: 'visible', on: 'genderField' },
        ],
        children: [
          {
            name: 'profile details are visible',
            steps: [],
          },
          {
            name: 'verify profile data persists after reload',
            steps: [
              { do: 'reload' },
              { do: 'waitFor', on: 'profileName' },
              { expect: 'visible', on: 'profileName' },
              { expect: 'visible', on: 'emailField' },
              { expect: 'visible', on: 'genderField' },
              { expect: 'visible', on: 'dobField' },
              { expect: 'visible', on: 'locationField' },
            ],
          },
        ],
      },
      {
        name: 'save occupation and verify it persists after reload',
        steps: [
          { do: 'waitFor', on: 'profileName' },
          { do: 'fill', on: 'occupationInput', value: 'QA Tester' },
          { do: 'click', on: 'occupationSaveBtn' },
          { expect: 'disabled', on: 'occupationSaveBtn' },
          { do: 'fill', on: 'occupationInput', value: 'Software Engineer' },
          { do: 'click', on: 'occupationSaveBtn' },
          { do: 'reload' },
          { do: 'waitFor', on: 'profileName' },
          { expect: 'value', on: 'occupationInput', value: 'Software Engineer' },
        ],
      },
      {
        name: 'verify all profile fields visible',
        steps: [
          { do: 'waitFor', on: 'profileName' },
          { expect: 'visible', on: 'profileName' },
          { expect: 'visible', on: 'emailField' },
          { expect: 'visible', on: 'genderField' },
          { expect: 'visible', on: 'dobField' },
          { expect: 'visible', on: 'locationField' },
          { expect: 'visible', on: 'changePasswordHeading' },
          { expect: 'visible', on: 'updatePasswordBtn' },
        ],
      },
      {
        name: 'change password with wrong current password',
        steps: [
          { do: 'waitFor', on: 'changePasswordHeading' },
          { do: 'fill', on: 'currentPasswordInput', value: 'wrongPassword123' },
          { do: 'fill', on: 'newPasswordInput', value: 'newPassword123' },
          { do: 'fill', on: 'confirmPasswordInput', value: 'newPassword123' },
          { do: 'click', on: 'updatePasswordBtn' },
          { do: 'waitFor', on: 'passwordError' },
          { expect: 'visible', on: 'passwordError' },
        ],
      },
      {
        name: 'password mismatch shows error',
        steps: [
          { do: 'waitFor', on: 'changePasswordHeading' },
          { do: 'fill', on: 'currentPasswordInput', value: 'vxNm4jo#aqDQWV' },
          { do: 'fill', on: 'newPasswordInput', value: 'ValidPass123!' },
          { do: 'fill', on: 'confirmPasswordInput', value: 'DifferentPass1!' },
          { do: 'click', on: 'updatePasswordBtn' },
          { do: 'waitFor', on: 'passwordError' },
          { expect: 'visible', on: 'passwordError' },
        ],
      },
      {
        name: 'too short password shows error',
        steps: [
          { do: 'waitFor', on: 'changePasswordHeading' },
          { do: 'fill', on: 'currentPasswordInput', value: 'vxNm4jo#aqDQWV' },
          { do: 'fill', on: 'newPasswordInput', value: 'Short1!' },
          { do: 'fill', on: 'confirmPasswordInput', value: 'Short1!' },
          { do: 'click', on: 'updatePasswordBtn' },
          { do: 'waitFor', on: 'passwordError' },
          { expect: 'text', on: 'passwordError', value: 'Password must be at least 12 characters long' },
        ],
      },
      {
        name: 'no uppercase password shows error',
        steps: [
          { do: 'waitFor', on: 'changePasswordHeading' },
          { do: 'fill', on: 'currentPasswordInput', value: 'vxNm4jo#aqDQWV' },
          { do: 'fill', on: 'newPasswordInput', value: 'abcdefgh1234!' },
          { do: 'fill', on: 'confirmPasswordInput', value: 'abcdefgh1234!' },
          { do: 'click', on: 'updatePasswordBtn' },
          { do: 'waitFor', on: 'passwordError' },
          { expect: 'text', on: 'passwordError', value: 'Must contain uppercase letter' },
        ],
      },
      {
        name: 'no digit password shows error',
        steps: [
          { do: 'waitFor', on: 'changePasswordHeading' },
          { do: 'fill', on: 'currentPasswordInput', value: 'vxNm4jo#aqDQWV' },
          { do: 'fill', on: 'newPasswordInput', value: 'Abcdefghijkl!' },
          { do: 'fill', on: 'confirmPasswordInput', value: 'Abcdefghijkl!' },
          { do: 'click', on: 'updatePasswordBtn' },
          { do: 'waitFor', on: 'passwordError' },
          { expect: 'text', on: 'passwordError', value: 'Must contain a digit' },
        ],
      },
      {
        name: 'no special char password shows error',
        steps: [
          { do: 'waitFor', on: 'changePasswordHeading' },
          { do: 'fill', on: 'currentPasswordInput', value: 'vxNm4jo#aqDQWV' },
          { do: 'fill', on: 'newPasswordInput', value: 'Abcdefgh1234' },
          { do: 'fill', on: 'confirmPasswordInput', value: 'Abcdefgh1234' },
          { do: 'click', on: 'updatePasswordBtn' },
          { do: 'waitFor', on: 'passwordError' },
          { expect: 'text', on: 'passwordError', value: 'Must contain a special character' },
        ],
      },
      {
        name: 'empty current password shows error',
        steps: [
          { do: 'waitFor', on: 'changePasswordHeading' },
          { do: 'fill', on: 'currentPasswordInput', value: '' },
          { do: 'fill', on: 'newPasswordInput', value: 'ValidPass123!' },
          { do: 'fill', on: 'confirmPasswordInput', value: 'ValidPass123!' },
          { do: 'click', on: 'updatePasswordBtn' },
          { do: 'waitFor', on: 'passwordError' },
          { expect: 'text', on: 'passwordError', value: 'Current password is required' },
        ],
      },
      {
        name: 'successful password change and revert',
        steps: [
          { do: 'waitFor', on: 'changePasswordHeading' },
          { do: 'fill', on: 'currentPasswordInput', value: 'vxNm4jo#aqDQWV' },
          { do: 'fill', on: 'newPasswordInput', value: 'TempPass123!' },
          { do: 'fill', on: 'confirmPasswordInput', value: 'TempPass123!' },
          { do: 'click', on: 'updatePasswordBtn' },
          { do: 'waitFor', on: 'passwordSuccess' },
          { expect: 'visible', on: 'passwordSuccess' },
          { do: 'fill', on: 'currentPasswordInput', value: 'TempPass123!' },
          { do: 'fill', on: 'newPasswordInput', value: 'vxNm4jo#aqDQWV' },
          { do: 'fill', on: 'confirmPasswordInput', value: 'vxNm4jo#aqDQWV' },
          { do: 'click', on: 'updatePasswordBtn' },
          { do: 'waitFor', on: 'passwordSuccess' },
          { expect: 'visible', on: 'passwordSuccess' },
        ],
      },
      {
        name: 'upload profile photo shows preview modal',
        steps: [
          { do: 'waitFor', on: 'avatarButton' },
          { do: 'uploadFile', on: 'avatarButton', value: 'e2e/fixtures/test-avatar.png' },
          { expect: 'visible', on: 'photoPreviewModal' },
          { expect: 'visible', on: 'savePhotoButton' },
        ],
      },
      {
        name: 'cancel photo upload dismisses preview modal',
        steps: [
          { do: 'waitFor', on: 'avatarButton' },
          { do: 'uploadFile', on: 'avatarButton', value: 'e2e/fixtures/test-avatar.png' },
          { expect: 'visible', on: 'photoPreviewModal' },
          { do: 'click', on: 'cancelPhotoButton' },
          { expect: 'hidden', on: 'photoPreviewModal' },
        ],
      },
      {
        name: 'navigate back to dashboard',
        steps: [
          { do: 'click', on: 'backToDashboard' },
          { expect: 'urlContains', value: '/dashboard' },
        ],
      },
    ],
  },
});
