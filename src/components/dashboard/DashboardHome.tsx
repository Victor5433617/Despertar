import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, DollarSign } from "lucide-react";

export const DashboardHome = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalGrades: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const studentsRes = await supabase.from("students").select("id, is_active", { count: "exact" });

      const activeCount = studentsRes.data?.filter((s) => s.is_active).length || 0;

      setStats({
        totalStudents: studentsRes.count || 0,
        activeStudents: activeCount,
        totalGrades: 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const statCards = [
    {
      title: "Total Estudiantes",
      value: stats.totalStudents,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Estudiantes Activos",
      value: stats.activeStudents,
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Panel de Control</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Resumen general del sistema de gestión escolar
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Bienvenido al Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Utilice el menú lateral para navegar entre las diferentes secciones del sistema:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Estudiantes:</strong> Gestione la información de los estudiantes</li>
            <li><strong>Grados:</strong> Administre los grados escolares y sus cuotas</li>
            <li><strong>Deudas:</strong> Consulte y gestione las deudas pendientes</li>
            <li><strong>Pagos:</strong> Registre y valide pagos realizados</li>
            <li><strong>Reportes:</strong> Genere reportes financieros y de pagos</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
