import { Navigate } from "react-router-dom";
import { ModuleKey, useAuth } from "@/contexts/AuthContext";

type ModuleRouteProps = {
  children: React.ReactNode;
  module?: ModuleKey;
  adminOnly?: boolean;
};

const ModuleRoute = ({ children, module, adminOnly = false }: ModuleRouteProps) => {
  const { session, isAdmin, isLoading, canAccess } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/admin/login" replace />;

  const allowed = adminOnly ? isAdmin : module ? canAccess(module) : isAdmin;
  if (!allowed) return <Navigate to="/admin" replace />;

  return <>{children}</>;
};

export default ModuleRoute;
