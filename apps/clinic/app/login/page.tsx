"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth, Mascot, useAnalytics, TextField, OTPInput, ErrorBanner, Button } from "@swasthyaseva/ui";
import { testSpec } from '@swasthyaseva/test-gen';
import { loginClinic, verifyClinicLoginOtp, resendClinicLoginOtp } from "@/lib/api";

type LoginMode = "admin" | "clinic";

export default function ClinicLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { trackEvent } = useAnalytics();
  const [mode, setMode] = useState<LoginMode>("admin");
  const [identifier, setIdentifier] = useState("");
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

  function switchMode(m: LoginMode) {
    setMode(m);
    setIdentifier("");
    setPassword("");
    setError("");
    setFieldErrors({});
    setPhase("credentials");
    setOtp("");
  }

  const verifyEndpoint = mode === "admin" ? "/verify-login-otp" : "/clinic-verify-login-otp";
  const resendEndpoint = mode === "admin" ? "/resend-login-otp" : "/clinic-resend-login-otp";
  const loginEndpoint = mode === "admin" ? "/login" : "/clinic-login";

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setError("");
    const errs: Record<string, string> = {};
    if (!identifier.trim()) errs.identifier = mode === "admin" ? "Username is required" : "Phone is required";
    if (!password.trim()) errs.password = "Password is required";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      const body = mode === "admin"
        ? { username: identifier, password }
        : { phone: identifier, password };
      const data = await loginClinic(loginEndpoint, body);

      if (data.requires_otp) {
        setLoginId(data.loginId!);
        setPhoneMasked(data.phone_masked!);
        setPhase("otp");
        setResendCooldown(60);
      } else if (data.token) {
        trackEvent('login_success', { method: 'password', mode });
        localStorage.setItem("clinic_token", data.token);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      trackEvent('login_fail', { method: 'password', mode });
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
      const data = await verifyClinicLoginOtp(verifyEndpoint, loginId, otp);

      trackEvent('login_success', { method: 'otp', mode });
      localStorage.setItem("clinic_token", data.token);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      trackEvent('login_fail', { method: 'otp', mode });
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await resendClinicLoginOtp(resendEndpoint, loginId);
      setResendCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Resend failed");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div data-testid="login-loading" className="text-muted-alt">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-dot-grid">
      <div className="w-full max-w-sm rounded-2xl p-8 shadow-lg bg-card border border-border mouse-glow">
        <div className="flex flex-col items-center mb-6">
          <Mascot size={56} className="mb-3" />
          <h1 className="text-2xl font-bold text-card-alt">SwasthyaSeva</h1>
          <p className="text-sm text-muted-alt">Clinic Portal</p>
        </div>

        {phase === "credentials" && (
          <div className="flex mb-6 rounded-lg overflow-hidden border border-border">
            <button
              type="button"
              onClick={() => switchMode("admin")}
              className={`flex-1 py-2.5 text-sm transition-colors ${
                mode === "admin"
                  ? "bg-primary text-primary-alt font-semibold"
                  : "bg-muted text-muted-alt font-medium hover:text-card-alt"
              }`}
            >
              Clinic Admin
            </button>
            <button
              type="button"
              data-testid="login-clinic-mode"
              onClick={() => switchMode("clinic")}
              className={`flex-1 py-2.5 text-sm transition-colors ${
                mode === "clinic"
                  ? "bg-primary text-primary-alt font-semibold"
                  : "bg-muted text-muted-alt font-medium hover:text-card-alt"
              }`}
            >
              Clinic
            </button>
          </div>
        )}

        {phase === "credentials" ? (
          <form onSubmit={handleCredentials} className="space-y-5">
            <TextField
              label={mode === "admin" ? "Username" : "Phone"}
              value={identifier}
              onChange={setIdentifier}
              autoComplete={mode === "admin" ? "username" : "tel"}
              placeholder={mode === "admin" ? "Enter username" : "Enter phone number"}
              required
              error={fieldErrors.identifier}
              data-testid={mode === "admin" ? "login-identifier" : "login-phone"}
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
            <p className="text-sm text-card-alt/60">Forgot your password? Contact your system administrator.</p>
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
  app: 'clinic',
  title: 'Clinic Login',
  elements: {
    clinicAdminModeButton: { role: 'button', name: 'Clinic Admin' },
    clinicModeButton: { role: 'button', name: 'Clinic', exact: true },
    identifierInput: { testId: 'login-identifier' },
    phoneInput: { testId: 'login-phone' },
    passwordInput: { testId: 'login-password' },
    signInButton: { role: 'button', name: 'Sign in' },
    errorMessage: { testId: 'login-error' },
    identifierError: { testId: 'login-identifier-error' },
    phoneError: { testId: 'login-phone-error' },
    passwordError: { testId: 'login-password-error' },
    otpInput: { testId: 'otp-input' },
    verifyOtpButton: { testId: 'verify-otp-button' },
    resendOtpButton: { testId: 'resend-otp-button' },
    phoneMasked: { testId: 'phone-masked' },
    backButton: { testId: 'back-to-credentials' },
  },
  flows: [],
  flowTree: {
    name: 'render clinic login page',
    steps: [
      { expect: 'visible', on: 'clinicAdminModeButton' },
      { expect: 'visible', on: 'clinicModeButton' },
      { expect: 'visible', on: 'passwordInput' },
      { expect: 'visible', on: 'signInButton' },
    ],
    children: [
      {
        name: 'admin mode',
        steps: [
          { do: 'click', on: 'clinicAdminModeButton' },
          { expect: 'visible', on: 'identifierInput' },
        ],
        children: [
          {
            name: 'valid credentials show OTP then verify completes login',
            steps: [
              { do: 'fill', on: 'identifierInput', value: 'e2e_cadmin_primary' },
              { do: 'fill', on: 'passwordInput', value: 'TestClinicAdmin@123' },
              { do: 'click', on: 'signInButton' },
              { do: 'waitFor', on: 'otpInput' },
              { expect: 'visible', on: 'phoneMasked' },
              { do: 'reactFill', on: 'otpInput', value: '123456' },
              { do: 'click', on: 'verifyOtpButton' },
              { expect: 'urlContains', value: '/dashboard' },
            ],
          },
          {
            name: 'invalid credentials show error',
            steps: [
              { do: 'fill', on: 'identifierInput', value: 'wrong_user' },
              { do: 'fill', on: 'passwordInput', value: 'wrong_pass' },
              { do: 'click', on: 'signInButton' },
              { expect: 'visible', on: 'errorMessage' },
              { expect: 'urlContains', value: '/login' },
            ],
          },
        ],
      },
      {
        name: 'entity mode',
        steps: [
          { do: 'click', on: 'clinicModeButton' },
          { expect: 'visible', on: 'phoneInput' },
        ],
        children: [
          {
            name: 'valid credentials show OTP then verify completes login',
            steps: [
              { do: 'fill', on: 'phoneInput', value: '+910001000010' },
              { do: 'fill', on: 'passwordInput', value: 'TestClinic@123' },
              { do: 'click', on: 'signInButton' },
              { do: 'waitFor', on: 'otpInput' },
              { expect: 'visible', on: 'phoneMasked' },
              { do: 'reactFill', on: 'otpInput', value: '123456' },
              { do: 'click', on: 'verifyOtpButton' },
              { expect: 'urlContains', value: '/dashboard' },
            ],
          },
          {
            name: 'invalid credentials show error',
            steps: [
              { do: 'fill', on: 'phoneInput', value: '+910000000000' },
              { do: 'fill', on: 'passwordInput', value: 'wrong_pass' },
              { do: 'click', on: 'signInButton' },
              { expect: 'visible', on: 'errorMessage' },
              { expect: 'urlContains', value: '/login' },
            ],
          },
        ],
      },
      {
        name: 'admin mode empty username shows error',
        steps: [
          { do: 'click', on: 'clinicAdminModeButton' },
          { do: 'fill', on: 'identifierInput', value: '' },
          { do: 'fill', on: 'passwordInput', value: 'somepassword' },
          { do: 'click', on: 'signInButton' },
          { expect: 'visible', on: 'identifierError' },
          { expect: 'text', on: 'identifierError', value: 'Username is required' },
        ],
      },
      {
        name: 'admin mode empty password shows error',
        steps: [
          { do: 'click', on: 'clinicAdminModeButton' },
          { do: 'fill', on: 'identifierInput', value: 'e2e_cadmin_primary' },
          { do: 'fill', on: 'passwordInput', value: '' },
          { do: 'click', on: 'signInButton' },
          { expect: 'visible', on: 'passwordError' },
          { expect: 'text', on: 'passwordError', value: 'Password is required' },
        ],
      },
      {
        name: 'entity mode empty phone shows error',
        steps: [
          { do: 'click', on: 'clinicModeButton' },
          { do: 'fill', on: 'phoneInput', value: '' },
          { do: 'fill', on: 'passwordInput', value: 'somepassword' },
          { do: 'click', on: 'signInButton' },
          { expect: 'visible', on: 'phoneError' },
          { expect: 'text', on: 'phoneError', value: 'Phone is required' },
        ],
      },
      {
        name: 'mode switch changes form fields',
        steps: [
          { do: 'click', on: 'clinicModeButton' },
          { expect: 'visible', on: 'phoneInput' },
          { expect: 'hidden', on: 'identifierInput' },
          { do: 'click', on: 'clinicAdminModeButton' },
          { expect: 'visible', on: 'identifierInput' },
          { expect: 'hidden', on: 'phoneInput' },
        ],
      },
      {
        name: 'admin mode resend OTP flow',
        steps: [
          { do: 'click', on: 'clinicAdminModeButton' },
          { do: 'fill', on: 'identifierInput', value: 'e2e_cadmin_primary' },
          { do: 'fill', on: 'passwordInput', value: 'TestClinicAdmin@123' },
          { do: 'click', on: 'signInButton' },
          { do: 'waitFor', on: 'otpInput' },
          { expect: 'visible', on: 'resendOtpButton' },
          { expect: 'disabled', on: 'resendOtpButton' },
        ],
      },
      {
        name: 'admin mode back button returns to credentials',
        steps: [
          { do: 'click', on: 'clinicAdminModeButton' },
          { do: 'fill', on: 'identifierInput', value: 'e2e_cadmin_primary' },
          { do: 'fill', on: 'passwordInput', value: 'TestClinicAdmin@123' },
          { do: 'click', on: 'signInButton' },
          { do: 'waitFor', on: 'otpInput' },
          { expect: 'visible', on: 'backButton' },
          { do: 'click', on: 'backButton' },
          { expect: 'visible', on: 'identifierInput' },
          { expect: 'visible', on: 'signInButton' },
          { expect: 'hidden', on: 'otpInput' },
        ],
      },
      {
        name: 'admin mode invalid OTP shows error',
        steps: [
          { do: 'click', on: 'clinicAdminModeButton' },
          { do: 'fill', on: 'identifierInput', value: 'e2e_cadmin_primary' },
          { do: 'fill', on: 'passwordInput', value: 'TestClinicAdmin@123' },
          { do: 'click', on: 'signInButton' },
          { do: 'waitFor', on: 'otpInput' },
          { do: 'reactFill', on: 'otpInput', value: '000000' },
          { do: 'click', on: 'verifyOtpButton' },
          { expect: 'visible', on: 'errorMessage' },
        ],
      },
    ],
  },
});
