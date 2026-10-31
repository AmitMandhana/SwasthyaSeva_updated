import { notFound } from "next/navigation";
import FieldShowcase from "./FieldShowcase";

export default function FieldsPage() {
  if (process.env.DEV_MODE !== "true") notFound();
  return <FieldShowcase />;
}
