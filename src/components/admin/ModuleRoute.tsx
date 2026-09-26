import { Navigate } from "react-router-dom";
import { AppRole, useAuth } from "@/contexts/AuthContext";

type ModuleRouteProps = {
  children: React.ReactNode;
  role?: Exclude<AppRole, "admin">;
  adminOnly?: boolean;
};

const ModuleRoute = ({ children, role, adminOnly = false }: ModuleRouteProps) => {
  const { session, isAdmin, isLoading, canAccess } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/admin/login" replace />;

  const allowed = adminOnly ? isAdmin : role ? canAccess(role) : isAdmin;
  if (!allowed) return <Navigate to="/admin" replace />;

  return <>{children}</>;
};

export default ModuleRoute;
