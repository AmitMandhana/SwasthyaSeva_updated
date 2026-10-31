"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Navbar, type NavItem, useAuth } from "@swasthyaseva/ui";
import { LayoutDashboard, Calendar, Users, User, LogOut } from "lucide-react";

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { name: "Appointments", path: "/dashboard/appointments", icon: <Calendar className="w-5 h-5" /> },
  { name: "Patients", path: "/dashboard/patients", icon: <Users className="w-5 h-5" /> },
  { name: "Profile", path: "/dashboard/profile", icon: <User className="w-5 h-5" /> },
];

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout: authLogout, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  function logout() {
    authLogout();
    router.push("/login");
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-alt">Loading...</div>
      </div>
    );
  }

  const displayName = (user?.username || "Doctor").replace(/^(Dr\.?\s*|Doctor\s+)/i, '');

  const userMenu = (
    <div className="flex items-center gap-2">
      <span className="hidden lg:inline text-sm text-muted-alt">Dr. {displayName}</span>
      <button
        onClick={logout}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-card-alt hover:bg-muted/80 transition-colors"
        title="Logout"
      >
        <LogOut size={15} /> <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );

  return (
    <>
      <Navbar
        appName="SwasthyaSeva Doctor"
        navItems={NAV_ITEMS}
        currentPath={pathname}
        onNavigate={(path) => router.push(path)}
        userMenu={userMenu}
      />
      {children}
    </>
  );
}
