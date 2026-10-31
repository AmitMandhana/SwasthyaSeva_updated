"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth, Mascot, useAnalytics, TextField, ErrorBanner, Button } from "@swasthyaseva/ui";
import { testSpec } from '@swasthyaseva/test-gen';

export default function LoginPage() {
  const router = useRouter();
  const { login: authLogin, isAuthenticated, isLoading } = useAuth();
  const { trackEvent } = useAnalytics();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const errs: Record<string, string> = {};
    if (!username.trim()) errs.username = "Username is required";
    if (!password.trim()) errs.password = "Password is required";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await authLogin(username, password);
      trackEvent('login_success');
      router.push("/dashboard");
    } catch (err: unknown) {
      trackEvent('login_fail');
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div data-testid="loading-indicator" className="text-muted-alt">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-dot-grid">
      <div className="w-full max-w-sm rounded-2xl p-8 shadow-lg bg-card border border-border mouse-glow">
        <div className="flex flex-col items-center mb-6">
          <Mascot size={56} className="mb-3" />
          <h1 className="text-2xl font-bold text-card-alt">SwasthyaSeva</h1>
          <p className="text-sm text-muted-alt">Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <ErrorBanner message={error} data-testid="login-error" />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export const __test = testSpec({
  route: '/',
  auth: 'none',
  app: 'admin',
  title: 'Admin Login',
  elements: {
    usernameInput: { testId: 'login-username' },
    passwordInput: { testId: 'login-password' },
    signInButton: { role: 'button', name: 'Sign in' },
    errorMessage: { testId: 'login-error' },
    usernameError: { testId: 'login-username-error' },
    passwordError: { testId: 'login-password-error' },
  },
  flows: [],
  flowTree: {
    name: 'render login form',
    steps: [
      { expect: 'visible', on: 'usernameInput' },
      { expect: 'visible', on: 'passwordInput' },
      { expect: 'visible', on: 'signInButton' },
    ],
    children: [
      {
        name: 'successful login',
        steps: [
          { do: 'fill', on: 'usernameInput', value: 'TestAdmin' },
          { do: 'fill', on: 'passwordInput', value: 'E2eAdminSecure@2026' },
          { do: 'click', on: 'signInButton' },
          { expect: 'urlContains', value: '/dashboard' },
        ],
      },
      {
        name: 'invalid credentials show error',
        steps: [
          { do: 'fill', on: 'usernameInput', value: 'wrong_user' },
          { do: 'fill', on: 'passwordInput', value: 'wrong_pass' },
          { do: 'click', on: 'signInButton' },
          { expect: 'visible', on: 'errorMessage' },
          { expect: 'url', value: '/' },
        ],
      },
      {
        name: 'empty username shows error',
        steps: [
          { do: 'fill', on: 'usernameInput', value: '' },
          { do: 'fill', on: 'passwordInput', value: 'somepassword' },
          { do: 'click', on: 'signInButton' },
          { expect: 'visible', on: 'usernameError' },
          { expect: 'text', on: 'usernameError', value: 'Username is required' },
        ],
      },
      {
        name: 'empty password shows error',
        steps: [
          { do: 'fill', on: 'usernameInput', value: 'TestAdmin' },
          { do: 'fill', on: 'passwordInput', value: '' },
          { do: 'click', on: 'signInButton' },
          { expect: 'visible', on: 'passwordError' },
          { expect: 'text', on: 'passwordError', value: 'Password is required' },
        ],
      },
    ],
  },
});
