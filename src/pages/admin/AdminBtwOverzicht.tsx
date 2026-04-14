import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface MonthData {
  month: number;
  subtotal: number;
  vat_total: number;
  total: number;
  count: number;
}

const monthNames = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

const AdminBtwOverzicht = () => {
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    fetchData();
  }, [year]);

  const fetchYears = async () => {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("invoice_year")
      .is("deleted_at", null);

    if (invoices) {
      const years = [...new Set(invoices.map(i => i.invoice_year))].sort((a, b) => b - a);
      setAvailableYears(years);
      if (years.length > 0 && !years.includes(parseInt(year))) {
        setYear(years[0].toString());
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: invoices } = await supabase
      .from("invoices")
      .select("invoice_month, subtotal, vat_total, total")
      .eq("invoice_year", parseInt(year))
      .is("deleted_at", null);

    if (invoices) {
      const monthMap: Record<number, MonthData> = {};
      for (let m = 1; m <= 12; m++) {
        monthMap[m] = { month: m, subtotal: 0, vat_total: 0, total: 0, count: 0 };
      }
      for (const inv of invoices) {
        const m = inv.invoice_month;
        monthMap[m].subtotal += Number(inv.subtotal);
        monthMap[m].vat_total += Number(inv.vat_total);
        monthMap[m].total += Number(inv.total);
        monthMap[m].count += 1;
      }
      setData(Object.values(monthMap));
    }
    setLoading(false);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

  const yearTotals = data.reduce(
    (acc, m) => ({
      subtotal: acc.subtotal + m.subtotal,
      vat_total: acc.vat_total + m.vat_total,
      total: acc.total + m.total,
      count: acc.count + m.count,
    }),
    { subtotal: 0, vat_total: 0, total: 0, count: 0 }
  );

  const exportCSV = () => {
    const rows = [["jaar", "maand", "omzet_excl_btw", "btw_bedrag", "omzet_incl_btw", "aantal_facturen"]];
    for (const m of data) {
      rows.push([
        year,
        String(m.month),
        m.subtotal.toFixed(2),
        m.vat_total.toFixed(2),
        m.total.toFixed(2),
        String(m.count),
      ]);
    }
    rows.push([year, "Totaal", yearTotals.subtotal.toFixed(2), yearTotals.vat_total.toFixed(2), yearTotals.total.toFixed(2), String(yearTotals.count)]);
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `btw-overzicht-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-heading font-bold">BTW Overzicht</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Jaar" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Omzet excl. BTW</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(yearTotals.subtotal)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">BTW totaal</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(yearTotals.vat_total)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Omzet incl. BTW</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(yearTotals.total)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Aantal facturen</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{yearTotals.count}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Maand</TableHead>
                  <TableHead className="text-right">Omzet excl. BTW</TableHead>
                  <TableHead className="text-right">BTW</TableHead>
                  <TableHead className="text-right">Omzet incl. BTW</TableHead>
                  <TableHead className="text-right">Facturen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(m => (
                  <TableRow key={m.month} className={m.count === 0 ? "text-muted-foreground" : ""}>
                    <TableCell className="font-medium">{monthNames[m.month - 1]}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.subtotal)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.vat_total)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.total)}</TableCell>
                    <TableCell className="text-right">{m.count}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Totaal {year}</TableCell>
                  <TableCell className="text-right">{formatCurrency(yearTotals.subtotal)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(yearTotals.vat_total)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(yearTotals.total)}</TableCell>
                  <TableCell className="text-right">{yearTotals.count}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBtwOverzicht;
