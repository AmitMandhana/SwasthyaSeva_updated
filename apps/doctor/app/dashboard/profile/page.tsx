'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Camera, Clock, MapPin } from 'lucide-react';
import { Card, useAnalytics, ChangePasswordForm, usePhotoUpload, PhotoPreviewModal, SLOT_TIME_MAP_12H, DAY_ORDER, DAY_LABELS } from '@swasthyaseva/ui';
import {
  getDoctorProfile, updateDoctorProfile, getCloudinarySignature, getDoctorSlots,
  type DoctorProfile, type DoctorSlot,
} from '../../../lib/api';


export default function DoctorProfilePage() {
  const { trackEvent } = useAnalytics();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const onPhotoUploaded = useCallback(async (url: string) => {
    await updateDoctorProfile({ pfp_link: url });
    if (profile) setProfile({ ...profile, pfp_link: url });
  }, [profile]);

  const photo = usePhotoUpload({ getSignature: getCloudinarySignature, onUploaded: onPhotoUploaded });

  useEffect(() => {
    Promise.all([
      getDoctorProfile().then(({ profile: p }) => { setProfile(p); }),
      getDoctorSlots().then(({ slots: s }) => { setSlots(s); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center py-10 text-muted-alt">Failed to load profile</p>;
  }

  const tags = [profile.tag_1_name, profile.tag_2_name, profile.tag_3_name].filter(Boolean);
  const sortedSlots = [...slots].sort((a, b) => DAY_ORDER.indexOf(a.slot_day) - DAY_ORDER.indexOf(b.slot_day) || a.slot_start - b.slot_start);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <input ref={photo.fileInputRef} type="file" accept="image/*" className="hidden" onChange={photo.handleFileSelected} />

      {/* Header card */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Clickable avatar */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <button data-testid="profile-avatar-btn" onClick={photo.handleAvatarClick} className="relative group cursor-pointer" title="Change photo">
              {profile.pfp_link ? (
                <img src={profile.pfp_link} alt="Profile" className="w-24 h-24 rounded-full object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold ring-2 ring-primary/20">
                  {(profile.first_name?.[0] || '').toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>
            <span className="text-sm text-muted-alt cursor-pointer hover:text-primary transition-colors">Click to change</span>
          </div>

          {/* Name + credentials */}
          <div className="flex-1 min-w-0">
            <h1 data-testid="profile-doctor-name" className="text-2xl font-bold text-foreground">Dr. {`${profile.first_name} ${profile.last_name}`.replace(/^(Dr\.?\s*|Doctor\s+)/i, '')}</h1>
            <p className="text-sm text-muted-alt mb-4">@{profile.username}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm">
              <div>
                <span className="text-muted-alt text-xs uppercase tracking-wide">License No</span>
                <p className="text-card-alt font-medium">{profile.license_no || '—'}</p>
              </div>
              <div>
                <span className="text-muted-alt text-xs uppercase tracking-wide">Degree</span>
                <p className="text-card-alt font-medium">{profile.base_degree_name || '—'}</p>
              </div>
              {profile.postgrad_name && (
                <div>
                  <span className="text-muted-alt text-xs uppercase tracking-wide">Postgrad</span>
                  <p className="text-card-alt font-medium">{profile.postgrad_name}</p>
                </div>
              )}
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map((tag, i) => (
                  <span key={i} data-testid="profile-tag" className="px-3 py-1.5 text-sm rounded-full bg-primary/10 text-primary font-medium">{tag}</span>
                ))}
              </div>
            )}

            {profile.bio && (
              <p data-testid="profile-bio" className="text-sm text-muted-alt mt-4 leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Slots */}
      {sortedSlots.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" /> Consultation Schedule
          </h2>
          <div className="space-y-4">
            {DAY_ORDER.filter(day => sortedSlots.some(s => s.slot_day === day)).map(day => (
              <div key={day}>
                <h3 className="text-sm font-semibold text-card-alt mb-2 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${day === ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date().getDay()] ? 'bg-primary' : 'bg-muted-alt'}`} />
                  {DAY_LABELS[day] || day}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-4">
                  {sortedSlots.filter(s => s.slot_day === day).map(slot => (
                    <div key={slot.slot_id} data-testid="profile-slot-card" className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-alt">{SLOT_TIME_MAP_12H[slot.slot_start]} – {SLOT_TIME_MAP_12H[slot.slot_end]}</p>
                        <p className="text-xs text-primary">{slot.clinic_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Password */}
      <ChangePasswordForm onSubmit={async ({ currentPassword, newPassword }) => {
        await updateDoctorProfile({ currentPassword, newPassword });
      }} onSuccess={() => {
        trackEvent('profile_updated', { field: 'password' });
      }} />

      {/* Photo preview modal */}
      <PhotoPreviewModal photo={photo} />
    </div>
  );
}

import { testSpec } from '@swasthyaseva/test-gen';

export const __test = testSpec({
  route: '/dashboard/profile',
  auth: 'role:doctor',
  app: 'doctor',
  title: 'Doctor Profile',
  elements: {
    doctorName: { testId: 'profile-doctor-name' },
    usernameLabel: { text: /^@/ },
    licenseNoLabel: { text: 'License No' },
    degreeLabel: { text: 'Degree' },
    tagBadge: { testId: 'profile-tag' },
    scheduleHeading: { text: 'Consultation Schedule' },
    slotCard: { testId: 'profile-slot-card' },
    changePasswordHeading: { text: 'Change Password' },
    currentPasswordInput: { role: 'textbox', name: 'Current Password' },
    newPasswordInput: { role: 'textbox', name: 'New Password', exact: true },
    confirmPasswordInput: { role: 'textbox', name: 'Confirm New Password' },
    updatePasswordButton: { role: 'button', name: /Update Password/ },
    passwordError: { testId: 'profile-password-error' },
    passwordSuccess: { testId: 'profile-password-success' },
    avatarButton: { testId: 'profile-avatar-btn' },
    photoPreviewModal: { role: 'dialog', name: 'Change Profile Photo' },
    savePhotoButton: { role: 'button', name: /Save Photo/ },
    cancelPhotoButton: { role: 'button', name: 'Cancel' },
  },
  flows: [],
  flowTree: {
    name: 'doctor profile',
    steps: [],
    children: [
      {
        name: 'display doctor profile with loaded data',
        steps: [
          { expect: 'visible', on: 'doctorName' },
          { expect: 'text', on: 'doctorName', value: /Dr\. .+/ },
          { expect: 'visible', on: 'usernameLabel' },
          { expect: 'text', on: 'usernameLabel', value: /^@.+/ },
          { expect: 'visible', on: 'licenseNoLabel' },
          { expect: 'visible', on: 'degreeLabel' },
        ],
        children: [
          {
            name: 'profile data is loaded',
            steps: [],
          },
          {
            name: 'display consultation schedule with slots',
            steps: [
              { expect: 'visible', on: 'scheduleHeading' },
              { expect: 'countMin', on: 'slotCard', value: 0 },
            ],
          },
          {
            name: 'show password mismatch error after submission',
            steps: [
              { expect: 'visible', on: 'changePasswordHeading' },
              { do: 'fill', on: 'currentPasswordInput', value: 'oldpass' },
              { do: 'fill', on: 'newPasswordInput', value: 'ValidPass123!' },
              { do: 'fill', on: 'confirmPasswordInput', value: 'DifferentPass1!' },
              { do: 'click', on: 'updatePasswordButton' },
              { expect: 'visible', on: 'passwordError' },
              { expect: 'text', on: 'passwordError', value: 'Passwords do not match' },
            ],
          },
          {
            name: 'show too short password error',
            steps: [
              { do: 'fill', on: 'currentPasswordInput', value: 'oldpass' },
              { do: 'fill', on: 'newPasswordInput', value: 'Short1!' },
              { do: 'fill', on: 'confirmPasswordInput', value: 'Short1!' },
              { do: 'click', on: 'updatePasswordButton' },
              { expect: 'visible', on: 'passwordError' },
              { expect: 'text', on: 'passwordError', value: 'Password must be at least 12 characters long' },
            ],
          },
          {
            name: 'show no uppercase error',
            steps: [
              { do: 'fill', on: 'currentPasswordInput', value: 'oldpass' },
              { do: 'fill', on: 'newPasswordInput', value: 'abcdefgh1234!' },
              { do: 'fill', on: 'confirmPasswordInput', value: 'abcdefgh1234!' },
              { do: 'click', on: 'updatePasswordButton' },
              { expect: 'visible', on: 'passwordError' },
              { expect: 'text', on: 'passwordError', value: 'Must contain uppercase letter' },
            ],
          },
          {
            name: 'show no digit error',
            steps: [
              { do: 'fill', on: 'currentPasswordInput', value: 'oldpass' },
              { do: 'fill', on: 'newPasswordInput', value: 'Abcdefghijkl!' },
              { do: 'fill', on: 'confirmPasswordInput', value: 'Abcdefghijkl!' },
              { do: 'click', on: 'updatePasswordButton' },
              { expect: 'visible', on: 'passwordError' },
              { expect: 'text', on: 'passwordError', value: 'Must contain a digit' },
            ],
          },
          {
            name: 'show no special char error',
            steps: [
              { do: 'fill', on: 'currentPasswordInput', value: 'oldpass' },
              { do: 'fill', on: 'newPasswordInput', value: 'Abcdefgh1234' },
              { do: 'fill', on: 'confirmPasswordInput', value: 'Abcdefgh1234' },
              { do: 'click', on: 'updatePasswordButton' },
              { expect: 'visible', on: 'passwordError' },
              { expect: 'text', on: 'passwordError', value: 'Must contain a special character' },
            ],
          },
          {
            name: 'show empty current password error',
            steps: [
              { do: 'fill', on: 'currentPasswordInput', value: '' },
              { do: 'fill', on: 'newPasswordInput', value: 'ValidPass123!' },
              { do: 'fill', on: 'confirmPasswordInput', value: 'ValidPass123!' },
              { do: 'click', on: 'updatePasswordButton' },
              { expect: 'visible', on: 'passwordError' },
              { expect: 'text', on: 'passwordError', value: 'Current password is required' },
            ],
          },
          {
            name: 'wrong current password shows error after submission',
            steps: [
              { do: 'fill', on: 'currentPasswordInput', value: 'totallyWrongPassword' },
              { do: 'fill', on: 'newPasswordInput', value: 'newpass123' },
              { do: 'fill', on: 'confirmPasswordInput', value: 'newpass123' },
              { do: 'click', on: 'updatePasswordButton' },
              { expect: 'visible', on: 'passwordError' },
            ],
          },
          {
            name: 'display profile bio and tags',
            steps: [
              { expect: 'countMin', on: 'tagBadge', value: 0 },
            ],
          },
          {
            name: 'upload profile photo shows preview modal',
            steps: [
              { do: 'uploadFile', on: 'avatarButton', value: 'e2e/fixtures/test-avatar.png' },
              { expect: 'visible', on: 'photoPreviewModal' },
              { expect: 'visible', on: 'savePhotoButton' },
              { expect: 'visible', on: 'cancelPhotoButton' },
            ],
            children: [
              {
                name: 'cancel photo upload dismisses preview modal',
                steps: [
                  { do: 'click', on: 'cancelPhotoButton' },
                  { expect: 'hidden', on: 'photoPreviewModal' },
                ],
              },
            ],
          },
          {
            name: 'change password successfully and restore original',
            steps: [
              { do: 'fill', on: 'currentPasswordInput', value: 'E2eDoctorPass@2026' },
              { do: 'fill', on: 'newPasswordInput', value: 'E2eDoctorPass@2026x' },
              { do: 'fill', on: 'confirmPasswordInput', value: 'E2eDoctorPass@2026x' },
              { do: 'click', on: 'updatePasswordButton' },
              { do: 'waitFor', on: 'passwordSuccess' },
              { expect: 'visible', on: 'passwordSuccess' },
              { expect: 'text', on: 'passwordSuccess', value: 'Password updated successfully' },
              // Restore original password
              { do: 'fill', on: 'currentPasswordInput', value: 'E2eDoctorPass@2026x' },
              { do: 'fill', on: 'newPasswordInput', value: 'E2eDoctorPass@2026' },
              { do: 'fill', on: 'confirmPasswordInput', value: 'E2eDoctorPass@2026' },
              { do: 'click', on: 'updatePasswordButton' },
              { do: 'waitFor', on: 'passwordSuccess' },
              { expect: 'visible', on: 'passwordSuccess' },
            ],
          },
        ],
      },
    ],
  },
});
