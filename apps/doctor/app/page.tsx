"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@swasthyaseva/ui";

export default function DoctorHomePage() {
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
      <div className="text-muted-alt">Loading...</div>
    </div>
  );
}

import { testSpec } from '@swasthyaseva/test-gen';

export const __test = testSpec({
  route: '/',
  auth: 'none',
  app: 'doctor',
  title: 'Doctor Root Redirect',
  elements: {},
  flows: [
    {
      name: 'redirect unauthenticated doctor to login',
      steps: [
        { expect: 'urlContains', value: '/login' },
      ],
    },
  ],
});
