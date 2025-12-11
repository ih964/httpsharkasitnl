import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Branding from "./pages/services/Branding";
import Websites from "./pages/services/Websites";
import Marketing from "./pages/services/Marketing";
import SEO from "./pages/services/SEO";
import SocialMedia from "./pages/services/SocialMedia";
import Support from "./pages/services/Support";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/diensten/branding" element={<Branding />} />
          <Route path="/diensten/websites" element={<Websites />} />
          <Route path="/diensten/marketing" element={<Marketing />} />
          <Route path="/diensten/seo" element={<SEO />} />
          <Route path="/diensten/social-media" element={<SocialMedia />} />
          <Route path="/diensten/support" element={<Support />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/voorwaarden" element={<Terms />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
