"use client";

import { useRouter, usePathname } from "next/navigation";
import { Navbar, useAuth } from "@swasthyaseva/ui";
import { DEV_MODE } from "@/lib/env";
import { logout as apiLogout } from "@/lib/api";
import UserMenuDropdown from "./UserMenuDropdown";

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout: authLogout } = useAuth();

  async function logout() {
    await apiLogout();
    authLogout();
    router.push("/");
  }

  const navItems = [{ name: "Dashboard", path: "/dashboard" }];

  if (DEV_MODE) {
    navItems.push({ name: "OTP Monitor", path: "/tools/otp" });
    navItems.push({ name: "Test Dashboard", path: "/dev/test" });
  }

  return (
    <Navbar
      appName="SwasthyaSeva Admin"
      navItems={navItems}
      currentPath={pathname}
      onNavigate={(path) => router.push(path)}
      userMenu={<UserMenuDropdown username={user?.username || "Admin"} onLogout={logout} />}
    />
  );
}
