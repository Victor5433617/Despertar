import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DashboardView } from "@/pages/Dashboard";
import {
  Users,
  Receipt,
  CreditCard,
  LogOut,
  Home,
  Menu,
  ClipboardList,
  UserCog,
  History,
} from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  user: User;
  userRole: string | null;
}

export const DashboardLayout = ({ children, currentView, onViewChange, user, userRole }: DashboardLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error && error.message !== 'Session from session_id claim in JWT does not exist') {
      toast.error("Error al cerrar sesión");
    } else {
      toast.success("Sesión cerrada correctamente");
    }
  };

  const handleViewChange = (view: DashboardView) => {
    onViewChange(view);
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  // Menú para administradores
  const adminMenuItems = [
    { id: "home" as DashboardView, label: "Inicio", icon: Home },
    { id: "students" as DashboardView, label: "Estudiantes", icon: Users },
    { id: "payment-plans" as DashboardView, label: "Planes de Pago", icon: ClipboardList },
    { id: "debts" as DashboardView, label: "Deudas", icon: Receipt },
    { id: "payments" as DashboardView, label: "Pagos", icon: CreditCard },
    { id: "payment-history" as DashboardView, label: "Historial de Pagos", icon: History },
    { id: "users" as DashboardView, label: "Usuarios", icon: UserCog },
  ];

  // Menú para padres
  const parentMenuItems = [
    { id: "parent-home" as DashboardView, label: "Mi Portal", icon: Home },
  ];

  const menuItems = userRole === 'parent' ? parentMenuItems : adminMenuItems;

  // Sidebar content component (reused for both desktop and mobile)
  const SidebarContent = () => (
    <>
      <div 
        className="absolute inset-0 opacity-5 bg-no-repeat bg-center bg-contain pointer-events-none"
        style={{ backgroundImage: `url(${schoolLogo})` }}
      />
      
      <div className="p-6 border-b border-sidebar-border relative z-10">
        <h2 className="text-xl font-bold text-center">Menú</h2>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={currentView === item.id ? "default" : "ghost"}
              className={`w-full justify-start ${
                currentView === item.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              onClick={() => handleViewChange(item.id)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="mb-3 px-3 py-2 bg-sidebar-accent rounded-lg">
          <p className="text-xs text-sidebar-accent-foreground/70">Usuario</p>
          <p className="text-sm font-medium truncate">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border p-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-sidebar-foreground">Sistema Escolar</h2>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
            <div className="flex flex-col h-full relative">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar text-sidebar-foreground flex-col shadow-lg relative">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-20 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};
