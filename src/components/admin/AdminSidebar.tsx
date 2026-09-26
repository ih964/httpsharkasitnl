import { ModuleKey, useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FileText,
  Users,
  Calculator,
  Settings,
  LogOut,
  Globe,
  Clock,
  KeyRound,
  ReceiptText,
  Fuel,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SidebarItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: ModuleKey;
  adminOnly?: boolean;
};

const items: SidebarItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, module: "dashboard" },
  { title: "Facturen", url: "/admin/invoices", icon: FileText, module: "invoices" },
  { title: "Factuur Maker", url: "/admin/factuur-maker", icon: ReceiptText, module: "factuur_maker" },
  { title: "Klanten", url: "/admin/customers", icon: Users, module: "customers" },
  { title: "Domeinen", url: "/admin/domeinen", icon: Globe, module: "domains" },
  { title: "Uren", url: "/admin/uren", icon: Clock, module: "time_entries" },
  { title: "Wachtwoorden", url: "/admin/wachtwoorden", icon: KeyRound, module: "passwords" },
  { title: "Tankprijzen", url: "/admin/tankprijzen", icon: Fuel, module: "tankprijzen" },
  { title: "BTW overzicht", url: "/admin/btw-overzicht", icon: Calculator, module: "btw_overzicht" },
  { title: "Gebruikers", url: "/admin/gebruikers", icon: UserCog, adminOnly: true },
  { title: "Instellingen", url: "/admin/settings", icon: Settings, module: "settings" },
];

const AdminSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, isAdmin, canAccess } = useAuth();
  const navigate = useNavigate();

  const visibleItems = items.filter((item) => {
    if (isAdmin) return true;
    if (item.adminOnly) return false;
    return item.module ? canAccess(item.module) : false;
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          {!collapsed ? (
            <h2 className="font-heading font-bold text-lg text-primary">Harkas IT</h2>
          ) : (
            <span className="font-heading font-bold text-lg text-primary">H</span>
          )}
        </div>

        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={handleLogout}
            className="w-full text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Uitloggen</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
