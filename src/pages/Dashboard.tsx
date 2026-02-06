import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { StudentsManagement } from "@/components/dashboard/StudentsManagement";
import { GradesManagement } from "@/components/dashboard/GradesManagement";
import { DebtManagement } from "@/components/dashboard/DebtManagement";
import { PaymentsManagement } from "@/components/dashboard/PaymentsManagement";
import { PaymentHistoryManagement } from "@/components/dashboard/PaymentHistoryManagement";
import { ReportsView } from "@/components/dashboard/ReportsView";
import { DebtConceptsManagement } from "@/components/dashboard/DebtConceptsManagement";
import { ParentDashboard } from "@/components/dashboard/ParentDashboard";
import { PaymentPlansManagement } from "@/components/dashboard/PaymentPlansManagement";
import { UsersManagement } from "@/components/dashboard/UsersManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export type DashboardView = "home" | "students" | "grades" | "debts" | "payments" | "payment-history" | "reports" | "concepts" | "payment-plans" | "parent-home" | "users";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>("home");
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasNoRole, setHasNoRole] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Detectar rol del usuario
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);
        
        if (roles && roles.length > 0) {
          // Priorizar el rol de parent si existe
          const isParent = roles.some(r => r.role === 'parent');
          const isAdmin = roles.some(r => r.role === 'admin');
          
          if (isParent) {
            setUserRole('parent');
            setCurrentView('parent-home');
          } else if (isAdmin) {
            setUserRole('admin');
          } else {
            setUserRole(roles[0].role);
          }
        } else {
          // Usuario sin rol asignado
          setHasNoRole(true);
        }
      }
      
      setIsLoading(false);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const renderView = () => {
    switch (currentView) {
      case "home":
        return <DashboardHome />;
      case "students":
        return <StudentsManagement />;
      case "grades":
        return <GradesManagement />;
      case "debts":
        return <DebtManagement />;
      case "payments":
        return <PaymentsManagement />;
      case "payment-history":
        return <PaymentHistoryManagement />;
      case "reports":
        return <ReportsView />;
      case "concepts":
        return <DebtConceptsManagement />;
      case "payment-plans":
        return <PaymentPlansManagement />;
      case "parent-home":
        return <ParentDashboard />;
      case "users":
        return <UsersManagement />;
      default:
        return userRole === 'parent' ? <ParentDashboard /> : <DashboardHome />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si el usuario no tiene rol asignado
  if (hasNoRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Aguarde por favor</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Su cuenta ha sido creada exitosamente. Por favor aguarde a que el administrador le asigne un rol para poder acceder al sistema.
            </p>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session || !user) {
    return null;
  }

  return (
    <DashboardLayout 
      currentView={currentView} 
      onViewChange={setCurrentView} 
      user={user}
      userRole={userRole}
    >
      {renderView()}
    </DashboardLayout>
  );
};

export default Dashboard;
