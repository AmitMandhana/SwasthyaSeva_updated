'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mascot, useAnalytics, TextField, OTPInput, ErrorBanner, Button } from '@swasthyaseva/ui';
import { loginPassword, requestOTP, verifyOTP } from '../../lib/patientApi';
import { isTokenValid } from '../../lib/auth';
import { testSpec } from '@swasthyaseva/test-gen';

type Tab = 'password' | 'otp';
type OTPStep = 'request' | 'verify';

export default function PatientLoginPage() {
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const [tab, setTab] = useState<Tab>('password');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<OTPStep>('request');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (isTokenValid()) router.push('/dashboard');
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';
    if (!phone.trim()) errs.phone = 'Phone number is required';
    if (!password.trim()) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await loginPassword({ first_name: firstName, last_name: lastName, phone, password });
      trackEvent('login_success', { method: 'password' });
      router.push('/dashboard');
    } catch (err) {
      trackEvent('login_fail', { method: 'password' });
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';
    if (!phone.trim()) errs.phone = 'Phone number is required';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await requestOTP({ first_name: firstName, last_name: lastName, phone });
      trackEvent('otp_requested', { purpose: 'login' });
      setOtpStep('verify');
      setCooldown(process.env.NODE_ENV === 'development' ? 5 : 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOTP({ first_name: firstName, last_name: lastName, phone, otp });
      trackEvent('login_success', { method: 'otp' });
      router.push('/dashboard');
    } catch (err) {
      trackEvent('login_fail', { method: 'otp' });
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-dot-grid px-4 py-8">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-6 sm:p-8 mouse-glow">
        <div className="flex flex-col items-center mb-6">
          <Mascot size={56} className="mb-3" />
          <h1 className="text-2xl font-bold text-foreground">Patient Login</h1>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 border-b border-input">
          <button
            onClick={() => { setTab('password'); setError(''); setFieldErrors({}); }}
            className={`flex-1 py-2.5 text-sm border-b-2 transition ${tab === 'password' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-alt font-medium hover:text-card-alt'}`}
          >
            Password
          </button>
          <button
            data-testid="tab-otp"
            onClick={() => { setTab('otp'); setError(''); setFieldErrors({}); setOtpStep('request'); }}
            className={`flex-1 py-2.5 text-sm border-b-2 transition ${tab === 'otp' ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-alt font-medium hover:text-card-alt'}`}
          >
            OTP
          </button>
        </div>

        <ErrorBanner message={error} className="mb-4" data-testid="login-error" />

        {tab === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="First Name" value={firstName} onChange={setFirstName} required error={fieldErrors.firstName} data-testid="login-first-name" />
              <TextField label="Last Name" value={lastName} onChange={setLastName} required error={fieldErrors.lastName} data-testid="login-last-name" />
            </div>
            <TextField label="Phone Number" value={phone} onChange={setPhone} autoComplete="tel" required error={fieldErrors.phone} data-testid="login-phone" />
            <TextField label="Password" type="password" value={password} onChange={setPassword} required error={fieldErrors.password} data-testid="login-password" />
            <p className="text-sm text-card-alt/60">Forgot Password? Use OTP login to sign in without a password.</p>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        ) : otpStep === 'request' ? (
          <form onSubmit={handleRequestOTP} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="First Name" value={firstName} onChange={setFirstName} required error={fieldErrors.firstName} data-testid="login-first-name" />
              <TextField label="Last Name" value={lastName} onChange={setLastName} required error={fieldErrors.lastName} data-testid="login-last-name" />
            </div>
            <TextField label="Phone Number" value={phone} onChange={setPhone} autoComplete="tel" required error={fieldErrors.phone} data-testid="login-phone" />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send OTP'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-5">
            <p className="text-sm text-muted-alt">OTP sent to +91{phone.replace(/^\+91/, '')}. Enter the 6-digit code:</p>
            <OTPInput value={otp} onChange={setOtp} autoFocus data-testid="otp-input" />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
            <div className="flex items-center justify-between">
              <button
                type="button"
                data-testid="otp-back-btn"
                onClick={() => { setOtpStep('request'); setOtp(''); }}
                className="text-sm text-muted-alt hover:text-card-alt transition-colors"
              >
                &larr; Change number
              </button>
              <button
                type="button"
                data-testid="otp-resend-btn"
                onClick={() => { setOtpStep('request'); handleRequestOTP(new Event('submit') as unknown as React.FormEvent); }}
                disabled={cooldown > 0}
                className="text-sm text-primary hover:underline disabled:text-muted-alt disabled:no-underline"
              >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export const __test = testSpec({
  route: '/login',
  auth: 'none',
  app: 'web',
  title: 'Patient Login',
  elements: {
    heading: { role: 'heading', name: 'Patient Login' },
    passwordTab: { role: 'button', name: 'Password' },
    otpTab: { role: 'button', name: 'OTP' },
    firstNameInput: { testId: 'login-first-name' },
    lastNameInput: { testId: 'login-last-name' },
    phoneInput: { testId: 'login-phone' },
    passwordInput: { testId: 'login-password' },
    firstNameError: { testId: 'login-first-name-error' },
    lastNameError: { testId: 'login-last-name-error' },
    phoneError: { testId: 'login-phone-error' },
    passwordError: { testId: 'login-password-error' },
    signInBtn: { role: 'button', name: 'Sign In' },
    sendOtpBtn: { role: 'button', name: 'Send OTP' },
    otpInput: { testId: 'otp-input' },
    verifyOtpBtn: { role: 'button', name: 'Verify OTP' },
    resendOtpBtn: { testId: 'otp-resend-btn' },
    backToPhoneBtn: { testId: 'otp-back-btn' },
    errorMessage: { testId: 'login-error' },
  },
  flows: [],
  flowTree: {
    name: 'patient login',
    steps: [
      { do: 'waitFor', on: 'heading' },
    ],
    children: [
      {
        name: 'password tab',
        steps: [
          { do: 'click', on: 'passwordTab' },
          { do: 'fill', on: 'firstNameInput', value: 'Test' },
          { do: 'fill', on: 'lastNameInput', value: 'Patient' },
          { do: 'fill', on: 'phoneInput', value: '9999999999' },
          { do: 'fill', on: 'passwordInput', value: 'password123' },
          { do: 'click', on: 'signInBtn' },
          { do: 'waitFor', on: 'errorMessage' },
          { expect: 'visible', on: 'errorMessage' },
        ],
        children: [
          {
            name: 'login with password shows error (web-13)',
            steps: [],
          },
          {
            name: 'error clears when switching tabs',
            steps: [
              { expect: 'visible', on: 'errorMessage' },
              { do: 'click', on: 'otpTab' },
              { expect: 'hidden', on: 'errorMessage' },
              { do: 'click', on: 'passwordTab' },
              { expect: 'hidden', on: 'errorMessage' },
            ],
          },
        ],
      },
      {
        name: 'request OTP and see verify form (web-14)',
        steps: [
          { do: 'click', on: 'otpTab' },
          { do: 'fill', on: 'firstNameInput', value: 'E2E' },
          { do: 'fill', on: 'lastNameInput', value: 'TestPatient' },
          { do: 'fill', on: 'phoneInput', value: '0001000001' },
          { do: 'click', on: 'sendOtpBtn' },
          { do: 'waitFor', on: 'otpInput' },
          { expect: 'visible', on: 'otpInput' },
          { expect: 'visible', on: 'verifyOtpBtn' },
        ],
        children: [
          {
            name: 'verify OTP successfully redirects to dashboard',
            steps: [
              { do: 'reactFill', on: 'otpInput', value: '123456' },
              { do: 'click', on: 'verifyOtpBtn' },
              { expect: 'urlContains', value: '/dashboard' },
            ],
          },
          {
            name: 'wrong OTP shows error',
            steps: [
              { do: 'reactFill', on: 'otpInput', value: '000000' },
              { do: 'click', on: 'verifyOtpBtn' },
              { expect: 'visible', on: 'errorMessage' },
            ],
          },
          {
            name: 'resend OTP re-sends and shows verify form again',
            steps: [
              { expect: 'visible', on: 'resendOtpBtn' },
              { expect: 'enabled', on: 'resendOtpBtn' },
              { do: 'click', on: 'resendOtpBtn' },
              { do: 'waitFor', on: 'otpInput' },
              { expect: 'visible', on: 'otpInput' },
              { expect: 'visible', on: 'verifyOtpBtn' },
            ],
          },
          {
            name: 'back button returns to phone input',
            steps: [
              { expect: 'visible', on: 'backToPhoneBtn' },
              { do: 'click', on: 'backToPhoneBtn' },
              { do: 'waitFor', on: 'sendOtpBtn' },
              { expect: 'visible', on: 'sendOtpBtn' },
              { expect: 'hidden', on: 'otpInput' },
            ],
          },
        ],
      },
      // ── Negative: Empty field validation ──
      {
        name: 'password tab empty name shows error',
        steps: [
          { do: 'click', on: 'passwordTab' },
          { do: 'fill', on: 'firstNameInput', value: '' },
          { do: 'fill', on: 'lastNameInput', value: '' },
          { do: 'fill', on: 'phoneInput', value: '0001000058' },
          { do: 'fill', on: 'passwordInput', value: 'password123' },
          { do: 'click', on: 'signInBtn' },
          { expect: 'visible', on: 'firstNameError' },
          { expect: 'text', on: 'firstNameError', value: 'First name is required' },
          { expect: 'visible', on: 'lastNameError' },
          { expect: 'text', on: 'lastNameError', value: 'Last name is required' },
        ],
      },
      {
        name: 'password tab empty phone shows error',
        steps: [
          { do: 'click', on: 'passwordTab' },
          { do: 'fill', on: 'firstNameInput', value: 'Test' },
          { do: 'fill', on: 'lastNameInput', value: 'Patient' },
          { do: 'fill', on: 'phoneInput', value: '' },
          { do: 'fill', on: 'passwordInput', value: 'password123' },
          { do: 'click', on: 'signInBtn' },
          { expect: 'visible', on: 'phoneError' },
          { expect: 'text', on: 'phoneError', value: 'Phone number is required' },
        ],
      },
      {
        name: 'password tab empty password shows error',
        steps: [
          { do: 'click', on: 'passwordTab' },
          { do: 'fill', on: 'firstNameInput', value: 'Test' },
          { do: 'fill', on: 'lastNameInput', value: 'Patient' },
          { do: 'fill', on: 'phoneInput', value: '0001000058' },
          { do: 'fill', on: 'passwordInput', value: '' },
          { do: 'click', on: 'signInBtn' },
          { expect: 'visible', on: 'passwordError' },
          { expect: 'text', on: 'passwordError', value: 'Password is required' },
        ],
      },
      {
        name: 'OTP tab empty name shows error',
        steps: [
          { do: 'click', on: 'otpTab' },
          { do: 'fill', on: 'firstNameInput', value: '' },
          { do: 'fill', on: 'lastNameInput', value: '' },
          { do: 'fill', on: 'phoneInput', value: '0001000058' },
          { do: 'click', on: 'sendOtpBtn' },
          { expect: 'visible', on: 'firstNameError' },
          { expect: 'text', on: 'firstNameError', value: 'First name is required' },
        ],
      },
      {
        name: 'tab switching',
        steps: [
          { do: 'click', on: 'otpTab' },
          { expect: 'visible', on: 'sendOtpBtn' },
          { do: 'click', on: 'passwordTab' },
          { expect: 'visible', on: 'signInBtn' },
        ],
        children: [
          {
            name: 'switch between tabs',
            steps: [],
          },
          {
            name: 'OTP tab resets to request form after switching away',
            steps: [
              { do: 'click', on: 'otpTab' },
              { expect: 'visible', on: 'sendOtpBtn' },
              { do: 'click', on: 'passwordTab' },
              { do: 'click', on: 'otpTab' },
              { expect: 'visible', on: 'sendOtpBtn' },
            ],
          },
        ],
      },
    ],
  },
});
