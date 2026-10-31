"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Calendar,
  Users,
  User,
  BarChart3,
  UserPlus,
  ClipboardList,
  FileText,
  Clock,
} from "lucide-react";
import { Navbar, useAuth } from "@swasthyaseva/ui";
import { logout as apiLogout } from "@/lib/api";

import AppointmentTab from "./components/AppointmentTab";
import ClinicAdminTab from "./components/ClinicAdminTab";
import AnalyticsTab from "./components/AnalyticsTab";
import LeadTab from "./components/LeadTab";
import AuditLogTab from "./components/AuditLogTab";
import PrescriptionTab from "./components/PrescriptionTab";
import ProfileTab from "./components/ProfileTab";
import SlotTab from "./components/SlotTab";

type Tab = "appointments" | "admins" | "slots" | "analytics" | "leads" | "prescriptions" | "audit" | "profile";

const TAB_TESTIDS: Record<Tab, string> = {
  appointments: "tab-appointments",
  admins: "tab-admins",
  slots: "tab-slots",
  analytics: "tab-analytics",
  leads: "tab-leads",
  prescriptions: "tab-prescriptions",
  audit: "tab-audit-logs",
  profile: "tab-profile",
};

export default function ClientDashboard() {
  const router = useRouter();
  const { user, logout: authLogout, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("appointments");

  const role = user?.role;
  const isClinicEntity = role === "clinic";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  async function handleLogout() {
    await apiLogout();
    authLogout();
    router.push("/login");
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; clinicOnly?: boolean }[] = [
    { id: "appointments", label: "Appointments", icon: <Calendar size={16} /> },
    { id: "admins", label: "Clinic Admins", icon: <Users size={16} />, clinicOnly: true },
    { id: "slots", label: "Slots", icon: <Clock size={16} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 size={16} /> },
    { id: "leads", label: "Leads", icon: <UserPlus size={16} /> },
    { id: "prescriptions", label: "Prescriptions", icon: <FileText size={16} /> },
    { id: "audit", label: "Audit Logs", icon: <ClipboardList size={16} /> },
    { id: "profile", label: "Profile", icon: <User size={16} /> },
  ];

  const visibleTabs = tabs.filter((t) => !t.clinicOnly || isClinicEntity);

  const userMenu = (
    <div className="flex items-center gap-2">
      <span data-testid="header-username" className="hidden sm:inline text-sm text-muted-alt truncate max-w-[120px]">{user?.username || "Clinic"}</span>
      <span
        data-testid="header-role-badge"
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isClinicEntity
            ? "bg-success/10 text-success"
            : "bg-accent/15 text-accent"
        }`}
      >
        {isClinicEntity ? "Clinic" : "Admin"}
      </span>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-card-alt hover:bg-destructive/10 hover:text-destructive transition-colors"
        title="Logout"
      >
        <LogOut size={14} /> <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        appName="SwasthyaSeva Clinic"
        navItems={[]}
        currentPath="/dashboard"
        onNavigate={(path) => router.push(path)}
        userMenu={userMenu}
      />

      {/* Tab navigation */}
      <div className="sticky top-16 z-40 bg-card border-b border-border shadow-sm">
        <div className="overflow-x-auto">
          <div className="flex gap-0 px-4 sm:px-6 min-w-max">
            {visibleTabs.map(({ id, label, icon }) => (
              <button
                key={id}
                data-testid={TAB_TESTIDS[id]}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? "text-primary border-primary"
                    : "text-muted-alt border-transparent hover:text-card-alt hover:border-border"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "appointments" && <AppointmentTab />}
        {activeTab === "admins" && isClinicEntity && <ClinicAdminTab />}
        {activeTab === "slots" && <SlotTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "leads" && <LeadTab />}
        {activeTab === "prescriptions" && <PrescriptionTab />}
        {activeTab === "audit" && <AuditLogTab />}
        {activeTab === "profile" && <ProfileTab />}
      </main>
    </div>
  );
}
