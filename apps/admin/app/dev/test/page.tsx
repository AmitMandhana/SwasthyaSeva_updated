import { notFound } from "next/navigation";
import TestDashboard from "./TestDashboard";

export default function TestPage() {
  if (process.env.DEV_MODE !== "true") notFound();
  return <TestDashboard />;
}
