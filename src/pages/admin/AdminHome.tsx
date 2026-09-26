import { Navigate } from "react-router-dom";
import { ModuleKey, useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "./AdminDashboard";

const fallbackOrder: Array<{ module: ModuleKey; path: string }> = [
  { module: "dashboard", path: "/admin" },
  { module: "invoices", path: "/admin/invoices" },
  { module: "factuur_maker", path: "/admin/factuur-maker" },
  { module: "customers", path: "/admin/customers" },
  { module: "domains", path: "/admin/domeinen" },
  { module: "time_entries", path: "/admin/uren" },
  { module: "passwords", path: "/admin/wachtwoorden" },
  { module: "tankprijzen", path: "/admin/tankprijzen" },
  { module: "btw_overzicht", path: "/admin/btw-overzicht" },
  { module: "settings", path: "/admin/settings" },
];

const AdminHome = () => {
  const { isAdmin, canAccess } = useAuth();

  if (isAdmin || canAccess("dashboard")) return <AdminDashboard />;

  const first = fallbackOrder.find((item) => item.module !== "dashboard" && canAccess(item.module));
  return first ? <Navigate to={first.path} replace /> : <Navigate to="/admin/login" replace />;
};

export default AdminHome;
