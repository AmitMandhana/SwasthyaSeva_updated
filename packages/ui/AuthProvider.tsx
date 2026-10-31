"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  username: string;
  role: string;
  [key: string]: any;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  loginEndpoint: string;
  tokenKey?: string;
  onLoginSuccess?: (token: string) => void;
  onLogout?: () => void;
}

export function AuthProvider({
  children,
  loginEndpoint,
  tokenKey = "auth_token",
  onLoginSuccess,
  onLogout,
}: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(tokenKey);
    if (storedToken) {
      try {
        const payload = JSON.parse(atob(storedToken.split(".")[1]));
        // Check if token is expired
        if (payload.exp * 1000 > Date.now()) {
          setToken(storedToken);
          setUser({
            id: payload.doctor_id || payload.clinic_admin_id || payload.clinic_id || payload.admin_id || payload.user_id,
            username: payload.username || payload.name || "User",
            role: payload.role,
            ...payload,
          });
        } else {
          localStorage.removeItem(tokenKey);
        }
      } catch (err) {
        console.error("Failed to parse token:", err);
        localStorage.removeItem(tokenKey);
      }
    }
    setIsLoading(false);
  }, [tokenKey]);

  // Poll for token expiry
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp * 1000 <= Date.now()) {
          logout();
        }
      } catch (err) {
        logout();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [token]);

  async function login(username: string, password: string) {
    const response = await fetch(loginEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const data = await response.json();
    const newToken = data.token;

    localStorage.setItem(tokenKey, newToken);
    setToken(newToken);

    try {
      const payload = JSON.parse(atob(newToken.split(".")[1]));
      setUser({
        id: payload.doctor_id || payload.clinic_admin_id || payload.clinic_id || payload.admin_id || payload.user_id,
        username: payload.username || payload.name || "User",
        role: payload.role,
        ...payload,
      });
    } catch (err) {
      console.error("Failed to parse token:", err);
    }

    if (onLoginSuccess) {
      onLoginSuccess(newToken);
    }
  }

  function logout() {
    localStorage.removeItem(tokenKey);
    setToken(null);
    setUser(null);
    if (onLogout) {
      onLogout();
    }
  }

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
