"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth, Mascot, useAnalytics, TextField, OTPInput, ErrorBanner, Button } from "@swasthyaseva/ui";
import { testSpec } from '@swasthyaseva/test-gen';
import { loginDoctor, verifyLoginOtp, resendLoginOtp } from "@/lib/api";

export default function DoctorLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login: authSetToken } = useAuth();
  const { trackEvent } = useAnalytics();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [phase, setPhase] = useState<"credentials" | "otp">("credentials");
  const [loginId, setLoginId] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setError("");
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = "Username is required";
    if (!password.trim()) errs.password = "Password is required";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      const data = await loginDoctor(username, password);

      if (data.requires_otp) {
        setLoginId(data.loginId!);
        setPhoneMasked(data.phone_masked!);
        setPhase("otp");
        setResendCooldown(60);
      } else if (data.token) {
        trackEvent('login_success', { method: 'password' });
        localStorage.setItem("doctor_token", data.token);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      trackEvent('login_fail', { method: 'password' });
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await verifyLoginOtp(loginId, otp);

      trackEvent('login_success', { method: 'otp' });
      localStorage.setItem("doctor_token", data.token);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      trackEvent('login_fail', { method: 'otp' });
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await resendLoginOtp(loginId);
      setResendCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Resend failed");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-alt">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-dot-grid">
      <div className="w-full max-w-sm rounded-2xl p-8 shadow-lg bg-card border border-border mouse-glow">
        <div className="flex flex-col items-center mb-6">
          <Mascot size={56} className="mb-3" />
          <h1 className="text-2xl font-bold text-card-alt">SwasthyaSeva</h1>
          <p className="text-sm text-muted-alt">Doctor Portal</p>
        </div>

        {phase === "credentials" ? (
          <form onSubmit={handleCredentials} className="space-y-5">
            <TextField
              label="Username"
              value={username}
              onChange={setUsername}
              autoComplete="username"
              required
              error={fieldErrors.username}
              data-testid="login-username"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
              error={fieldErrors.password}
              data-testid="login-password"
            />
            <p className="text-sm text-card-alt/60">Forgot your password? Contact your clinic administrator.</p>
            <ErrorBanner message={error} data-testid="login-error" />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-5">
            <div className="text-center">
              <p className="text-sm text-card-alt">OTP sent to <span data-testid="phone-masked" className="font-medium">{phoneMasked}</span></p>
            </div>
            <OTPInput value={otp} onChange={setOtp} autoFocus data-testid="otp-input" />
            <ErrorBanner message={error} data-testid="login-error" />
            <Button type="submit" disabled={loading || otp.length < 6} data-testid="verify-otp-button" className="w-full">
              {loading ? "Verifying…" : "Verify OTP"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                data-testid="resend-otp-button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-primary hover:underline disabled:text-muted-alt disabled:no-underline"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
              </button>
              <button
                type="button"
                data-testid="back-to-credentials"
                onClick={() => { setPhase("credentials"); setOtp(""); setError(""); }}
                className="text-muted-alt hover:text-card-alt"
              >
                Back
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
  app: 'doctor',
  title: 'Doctor Login',
  elements: {
    heading: { role: 'heading', name: 'SwasthyaSeva' },
    portalLabel: { text: 'Doctor Portal' },
    usernameInput: { testId: 'login-username' },
    passwordInput: { testId: 'login-password' },
    signInButton: { role: 'button', name: 'Sign in' },
    errorMessage: { testId: 'login-error' },
    usernameError: { testId: 'login-username-error' },
    passwordError: { testId: 'login-password-error' },
    otpInput: { testId: 'otp-input' },
    verifyOtpButton: { testId: 'verify-otp-button' },
    resendOtpButton: { testId: 'resend-otp-button' },
    phoneMasked: { testId: 'phone-masked' },
    backButton: { testId: 'back-to-credentials' },
    resendCooldownText: { text: /Resend in \d+s/ },
  },
  flows: [],
  flowTree: {
    name: 'render login form',
    steps: [
      { expect: 'visible', on: 'heading' },
      { expect: 'visible', on: 'portalLabel' },
      { expect: 'visible', on: 'usernameInput' },
      { expect: 'visible', on: 'passwordInput' },
      { expect: 'visible', on: 'signInButton' },
    ],
    children: [
      {
        name: 'valid credentials show OTP screen then verify completes login',
        steps: [
          { do: 'fill', on: 'usernameInput', value: 'e2e_doc_primary' },
          { do: 'fill', on: 'passwordInput', value: 'E2eDoctorPass@2026' },
          { do: 'click', on: 'signInButton' },
          { do: 'waitFor', on: 'otpInput' },
          { expect: 'visible', on: 'phoneMasked' },
          { expect: 'visible', on: 'otpInput' },
          { do: 'reactFill', on: 'otpInput', value: '123456' },
          { do: 'click', on: 'verifyOtpButton' },
          { expect: 'urlContains', value: '/dashboard' },
        ],
      },
      {
        name: 'invalid credentials show error',
        steps: [
          { do: 'fill', on: 'usernameInput', value: 'wronguser' },
          { do: 'fill', on: 'passwordInput', value: 'wrongpass' },
          { do: 'click', on: 'signInButton' },
          { expect: 'visible', on: 'errorMessage' },
        ],
      },
      {
        name: 'empty fields keep button enabled',
        steps: [
          { expect: 'enabled', on: 'signInButton' },
          { expect: 'value', on: 'usernameInput', value: '' },
        ],
      },
      {
        name: 'submit empty username shows error',
        steps: [
          { do: 'fill', on: 'usernameInput', value: '' },
          { do: 'fill', on: 'passwordInput', value: 'somepassword' },
          { do: 'click', on: 'signInButton' },
          { expect: 'visible', on: 'usernameError' },
          { expect: 'text', on: 'usernameError', value: 'Username is required' },
        ],
      },
      {
        name: 'submit empty password shows error',
        steps: [
          { do: 'fill', on: 'usernameInput', value: 'e2e_doc_primary' },
          { do: 'fill', on: 'passwordInput', value: '' },
          { do: 'click', on: 'signInButton' },
          { expect: 'visible', on: 'passwordError' },
          { expect: 'text', on: 'passwordError', value: 'Password is required' },
        ],
      },
      {
        name: 'resend OTP button shows cooldown then re-enables',
        steps: [
          { do: 'fill', on: 'usernameInput', value: 'e2e_doc_primary' },
          { do: 'fill', on: 'passwordInput', value: 'E2eDoctorPass@2026' },
          { do: 'click', on: 'signInButton' },
          { do: 'waitFor', on: 'otpInput' },
          { expect: 'visible', on: 'resendOtpButton' },
          { expect: 'disabled', on: 'resendOtpButton' },
          { expect: 'visible', on: 'resendCooldownText' },
        ],
      },
      {
        name: 'back button returns to credentials form',
        steps: [
          { do: 'fill', on: 'usernameInput', value: 'e2e_doc_primary' },
          { do: 'fill', on: 'passwordInput', value: 'E2eDoctorPass@2026' },
          { do: 'click', on: 'signInButton' },
          { do: 'waitFor', on: 'otpInput' },
          { expect: 'visible', on: 'backButton' },
          { do: 'click', on: 'backButton' },
          { expect: 'visible', on: 'usernameInput' },
          { expect: 'visible', on: 'passwordInput' },
          { expect: 'visible', on: 'signInButton' },
        ],
      },
      {
        name: 'invalid OTP shows error with attempts remaining',
        steps: [
          { do: 'fill', on: 'usernameInput', value: 'e2e_doc_primary' },
          { do: 'fill', on: 'passwordInput', value: 'E2eDoctorPass@2026' },
          { do: 'click', on: 'signInButton' },
          { do: 'waitFor', on: 'otpInput' },
          { do: 'reactFill', on: 'otpInput', value: '000000' },
          { do: 'click', on: 'verifyOtpButton' },
          { expect: 'visible', on: 'errorMessage' },
        ],
      },
      {
        name: 'three wrong OTPs triggers max attempts lockout',
        steps: [
          { do: 'fill', on: 'usernameInput', value: 'e2e_doc_primary' },
          { do: 'fill', on: 'passwordInput', value: 'E2eDoctorPass@2026' },
          { do: 'click', on: 'signInButton' },
          { do: 'waitFor', on: 'otpInput' },
          { do: 'reactFill', on: 'otpInput', value: '111111' },
          { do: 'click', on: 'verifyOtpButton' },
          { do: 'waitFor', on: 'errorMessage' },
          { do: 'reactFill', on: 'otpInput', value: '222222' },
          { do: 'click', on: 'verifyOtpButton' },
          { do: 'waitFor', on: 'errorMessage' },
          { do: 'reactFill', on: 'otpInput', value: '333333' },
          { do: 'click', on: 'verifyOtpButton' },
          { do: 'waitFor', on: 'errorMessage' },
          { expect: 'visible', on: 'errorMessage' },
        ],
      },
    ],
  },
});
