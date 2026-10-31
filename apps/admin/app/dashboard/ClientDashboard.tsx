"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Building2, Users, Clock, LayoutGrid } from "lucide-react";
import { useAuth, TabBar } from "@swasthyaseva/ui";
import { logout as apiLogout } from "@/lib/api";
import AdminNavbar from "./components/AdminNavbar";
import DoctorTab from "./components/DoctorTab";
import ClinicTab from "./components/ClinicTab";
import ClinicManagerTab from "./components/ClinicManagerTab";
import SlotTab from "./components/SlotTab";
import SoftboardTab from "./components/SoftboardTab";

type Tab = "doctors" | "clinics" | "managers" | "slots" | "softboard";

export default function ClientDashboard() {
  const router = useRouter();
  const { user, logout: authLogout, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("doctors");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  async function logout() {
    await apiLogout();
    authLogout();
    router.push("/");
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "doctors", label: "Doctors", icon: <Stethoscope size={16} /> },
    { id: "clinics", label: "Clinics", icon: <Building2 size={16} /> },
    { id: "managers", label: "Clinic Managers", icon: <Users size={16} /> },
    { id: "slots", label: "Slots", icon: <Clock size={16} /> },
    { id: "softboard", label: "Softboard", icon: <LayoutGrid size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as Tab)} />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "doctors" && <DoctorTab />}
        {activeTab === "clinics" && <ClinicTab />}
        {activeTab === "managers" && <ClinicManagerTab />}
        {activeTab === "slots" && <SlotTab />}
        {activeTab === "softboard" && <SoftboardTab />}
      </main>
    </div>
  );
}
