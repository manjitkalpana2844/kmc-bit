import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, Upload, FileText, Lock, Bell, Users } from "lucide-react";
import { AdminUpload } from "@/components/admin/AdminUpload";
import { AdminPdfs } from "@/components/admin/AdminPdfs";
import { AdminSemesters } from "@/components/admin/AdminSemesters";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AdminUsers } from "@/components/admin/AdminUsers";
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
            <p className="text-xs text-muted-foreground">Manage PDFs, semesters, notifications & users</p>
          </div>
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>

        <Tabs defaultValue="upload">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1" />Upload</TabsTrigger>
            <TabsTrigger value="pdfs"><FileText className="h-4 w-4 mr-1" />PDFs</TabsTrigger>
            <TabsTrigger value="semesters"><Lock className="h-4 w-4 mr-1" />Semesters</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1" />Notify</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Users</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="mt-6"><AdminUpload /></TabsContent>
          <TabsContent value="pdfs" className="mt-6"><AdminPdfs /></TabsContent>
          <TabsContent value="semesters" className="mt-6"><AdminSemesters /></TabsContent>
          <TabsContent value="notifications" className="mt-6"><AdminNotifications /></TabsContent>
          <TabsContent value="users" className="mt-6"><AdminUsers /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}