import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "./AdminDashboard";

const AdminHome = () => {
  const { isAdmin, canAccess } = useAuth();

  if (isAdmin) return <AdminDashboard />;
  if (canAccess("factuur_maker")) return <Navigate to="/admin/factuur-maker" replace />;
  if (canAccess("tankprijzen")) return <Navigate to="/admin/tankprijzen" replace />;

  return <Navigate to="/admin/login" replace />;
};

export default AdminHome;
