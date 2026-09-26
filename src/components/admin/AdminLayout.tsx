import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import AdminSidebar from "./AdminSidebar";

const AdminLayout = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const isFuelPrices = location.pathname === "/admin/tankprijzen";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4">
            <SidebarTrigger className="mr-4" />
            <span className="text-sm text-muted-foreground">
              {isAdmin ? "Admin Panel" : "Harkas IT Tools"}
            </span>
          </header>
          <main className={isFuelPrices ? "flex-1 min-h-0 overflow-hidden" : "flex-1 p-6 overflow-auto"}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
