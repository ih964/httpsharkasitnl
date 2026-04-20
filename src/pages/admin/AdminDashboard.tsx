import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, FileText, Euro, TrendingUp, Plus, Globe } from "lucide-react";

interface DashboardStats {
  customerCount: number;
  openInvoices: number;
  revenueMonth: number;
  revenueYear: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  customer_name: string;
}

interface ExpiringDomain {
  id: string;
  domain_name: string;
  expiry_date: string;
  customer_name: string | null;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({ customerCount: 0, openInvoices: 0, revenueMonth: 0, revenueYear: 0 });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [expiringDomains, setExpiringDomains] = useState<ExpiringDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const todayIso = now.toISOString().slice(0, 10);

    // Fetch stats in parallel
    const [customersRes, openRes, monthRes, yearRes, recentRes, domainsRes] = await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("invoices").select("id", { count: "exact", head: true }).is("deleted_at", null).in("status", ["concept", "verzonden"]),
      supabase.from("invoices").select("total").is("deleted_at", null).eq("status", "betaald").eq("invoice_year", currentYear).eq("invoice_month", currentMonth),
      supabase.from("invoices").select("total").is("deleted_at", null).eq("status", "betaald").eq("invoice_year", currentYear),
      supabase.from("invoices").select("id, invoice_number, total, status, customer_id").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
      supabase.from("domains").select("id, domain_name, expiry_date, customer_name").gte("expiry_date", todayIso).order("expiry_date", { ascending: true }).limit(5),
    ]);

    const revenueMonth = (monthRes.data ?? []).reduce((sum, i) => sum + Number(i.total), 0);
    const revenueYear = (yearRes.data ?? []).reduce((sum, i) => sum + Number(i.total), 0);

    setStats({
      customerCount: customersRes.count ?? 0,
      openInvoices: openRes.count ?? 0,
      revenueMonth,
      revenueYear,
    });

    setExpiringDomains((domainsRes.data ?? []) as ExpiringDomain[]);

    // Get customer names for recent invoices
    if (recentRes.data && recentRes.data.length > 0) {
      const customerIds = [...new Set(recentRes.data.map(i => i.customer_id).filter(Boolean))];
      const { data: customers } = await supabase.from("customers").select("id, name").in("id", customerIds);
      const customerMap = Object.fromEntries((customers ?? []).map(c => [c.id, c.name]));

      setRecentInvoices(recentRes.data.map(i => ({
        id: i.id,
        invoice_number: i.invoice_number,
        total: Number(i.total),
        status: i.status,
        customer_name: i.customer_id ? customerMap[i.customer_id] ?? "—" : "—",
      })));
    }

    setLoading(false);
  };

  const daysUntil = (iso: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(iso + "T00:00:00");
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

  const statusLabel: Record<string, string> = {
    concept: "Concept",
    verzonden: "Verzonden",
    betaald: "Betaald",
    vervallen: "Vervallen",
  };

  const statusColor: Record<string, string> = {
    concept: "bg-muted text-muted-foreground",
    verzonden: "bg-primary/10 text-primary",
    betaald: "bg-green-500/10 text-green-500",
    vervallen: "bg-destructive/10 text-destructive",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/admin/customers")} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Klant
          </Button>
          <Button onClick={() => navigate("/admin/invoices")} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Factuur
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Klanten</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customerCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Openstaand</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Omzet deze maand</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenueMonth)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Omzet dit jaar</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenueYear)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recente facturen</CardTitle>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nog geen facturen.</p>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{inv.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{inv.customer_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColor[inv.status]}`}>
                      {statusLabel[inv.status]}
                    </span>
                    <span className="font-medium">{formatCurrency(inv.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
