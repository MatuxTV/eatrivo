import { Metadata } from "next";
import AdminDashboard from "./components/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard - Eatrivo",
  description: "Admin panel for managing meal plans and users",
};

export default function AdminPage() {
  return <AdminDashboard />;
}