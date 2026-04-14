import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signOut, isAdmin, isLoading, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect via useEffect, not in render body
  useEffect(() => {
    if (!isLoading && session && isAdmin) {
      console.log("[Login] Redirecting to /admin (session + admin confirmed)");
      navigate("/admin", { replace: true });
    }
  }, [session, isAdmin, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        console.error("[Login] submit error:", error);
        toast({ title: "Login mislukt", description: error.message, variant: "destructive" });
      } else {
        console.log("[Login] submit success, waiting for auth state...");
        // Don't navigate here — the useEffect above handles it once isAdmin is set
      }
    } catch (err: any) {
      console.error("[Login] submit exception:", err);
      toast({ title: "Login mislukt", description: "Er is een onverwachte fout opgetreden.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while auth context initializes
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-heading">Harkas IT Admin</CardTitle>
          <p className="text-muted-foreground text-sm">Log in om door te gaan</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@harkasit.nl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Bezig..." : "Inloggen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
