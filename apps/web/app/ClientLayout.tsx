"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar, type NavItem } from "@swasthyaseva/ui";
import { Calendar, Search, LogOut, User } from "lucide-react";
import { isTokenValid, getPatientName, clearToken } from "../lib/auth";

const NAV_ITEMS: NavItem[] = [
  { name: "Find Slots", path: "/slot-search", icon: <Search className="w-5 h-5" /> },
  { name: "Dashboard", path: "/dashboard", icon: <Calendar className="w-5 h-5" /> },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const loggedIn = isTokenValid();
    setIsLoggedIn(loggedIn);
    setName(loggedIn ? getPatientName() : null);
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    setIsLoggedIn(false);
    setName(null);
    router.push("/");
  };

  const userMenu = isLoggedIn ? (
    <div className="flex items-center gap-2">
      {name && <span className="text-sm text-muted-alt hidden sm:inline">{name}</span>}
      <Link href="/dashboard/profile" className="p-2 rounded-md text-card-alt hover:text-primary hover:bg-muted transition-colors" title="Profile">
        <User className="w-5 h-5" />
      </Link>
      <button onClick={handleLogout} className="p-2 rounded-md text-card-alt hover:text-destructive hover:bg-muted transition-colors" title="Logout">
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  ) : undefined;

  return (
    <>
      <Navbar
        appName="SwasthyaSeva"
        navItems={NAV_ITEMS}
        currentPath={pathname}
        onNavigate={(path) => router.push(path)}
        userMenu={userMenu}
      />
      {children}
    </>
  );
}
