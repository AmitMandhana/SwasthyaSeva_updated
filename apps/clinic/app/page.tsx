"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@swasthyaseva/ui";

export default function ClinicPortalPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-alt" data-testid="clinic-loading">Loading...</div>
    </div>
  );
}

import { testSpec } from '@swasthyaseva/test-gen';

export const __test = testSpec({
  route: '/',
  auth: 'none',
  app: 'clinic',
  title: 'Clinic Root Redirect',
  elements: {},
  flows: [
    {
      id: 'clinic-root-redirect-unauthed',
      name: 'redirect unauthenticated user to login',
      steps: [
        { expect: 'urlContains', value: '/login' },
      ],
    },
  ],
});
