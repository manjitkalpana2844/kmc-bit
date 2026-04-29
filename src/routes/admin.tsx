import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, Upload, FileText, Bell, Users, Receipt, BarChart3, MessageSquare, TrendingUp } from "lucide-react";
import { AdminUpload } from "@/components/admin/AdminUpload";
import { AdminPdfs } from "@/components/admin/AdminPdfs";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminPaymentRequests } from "@/components/admin/AdminPaymentRequests";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminFeedback } from "@/components/admin/AdminFeedback";
import { AdminRevenue } from "@/components/admin/AdminRevenue";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [user, isAdmin, loading, navigate]);

  if (loading || !user || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Manage PDFs, notifications & users</p>
          </div>
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>

        <Tabs defaultValue="stats">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="stats"><BarChart3 className="h-4 w-4 mr-1" />Stats</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1" />Upload</TabsTrigger>
            <TabsTrigger value="pdfs"><FileText className="h-4 w-4 mr-1" />PDFs</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1" />Notify</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Users</TabsTrigger>
            <TabsTrigger value="payments"><Receipt className="h-4 w-4 mr-1" />Payments</TabsTrigger>
            <TabsTrigger value="revenue"><TrendingUp className="h-4 w-4 mr-1" />Revenue</TabsTrigger>
            <TabsTrigger value="feedback"><MessageSquare className="h-4 w-4 mr-1" />Feedback</TabsTrigger>
          </TabsList>
          <TabsContent value="stats" className="mt-6"><AdminStats /></TabsContent>
          <TabsContent value="upload" className="mt-6"><AdminUpload /></TabsContent>
          <TabsContent value="pdfs" className="mt-6"><AdminPdfs /></TabsContent>
          <TabsContent value="notifications" className="mt-6"><AdminNotifications /></TabsContent>
          <TabsContent value="users" className="mt-6"><AdminUsers /></TabsContent>
          <TabsContent value="payments" className="mt-6"><AdminPaymentRequests /></TabsContent>
          <TabsContent value="revenue" className="mt-6"><AdminRevenue /></TabsContent>
          <TabsContent value="feedback" className="mt-6"><AdminFeedback /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}