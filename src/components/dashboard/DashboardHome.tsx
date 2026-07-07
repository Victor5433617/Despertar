import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDatePY } from "@/lib/dateUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

interface UpcomingDebt {
  studentName: string;
  conceptName: string;
  dueDate: string;
  amount: number;
  daysLeft: number;
}

export const DashboardHome = () => {
  const [stats, setStats] = useState({ totalStudents: 0, activeStudents: 0 });
  const [pagosPorMes, setPagosPorMes] = useState<{ mes: string; total: number }[]>([]);
  const [upcomingDebts, setUpcomingDebts] = useState<UpcomingDebt[]>([]);
  const [debtsPage, setDebtsPage] = useState(0);
  const DEBTS_PAGE_SIZE = 5;

  useEffect(() => {
    loadStats();
    loadPagosPorMes();
    loadUpcomingDebts();
  }, []);

  const loadStats = async () => {
    try {
      const studentsRes = await supabase.from("students").select("id, is_active", { count: "exact" });
      const activeCount = studentsRes.data?.filter((s) => s.is_active).length || 0;
      setStats({ totalStudents: studentsRes.count || 0, activeStudents: activeCount });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadPagosPorMes = async () => {
    try {
      const now = new Date();
      const desde = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

      const { data } = await supabase
        .from("payments")
        .select("payment_date, amount")
        .neq("status", "cancelled")
        .gte("payment_date", desde);

      const agrupado: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        agrupado[`${d.getFullYear()}-${d.getMonth()}`] = 0;
      }

      data?.forEach((p) => {
        const d = new Date(p.payment_date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key in agrupado) agrupado[key] += p.amount;
      });

      const resultado = Object.entries(agrupado).map(([key, total]) => {
        const [year, month] = key.split("-").map(Number);
        return { mes: `${MESES[month]} ${year !== now.getFullYear() ? year : ""}`.trim(), total };
      });

      setPagosPorMes(resultado);
    } catch (error) {
      console.error("Error loading pagos por mes:", error);
    }
  };

  const loadUpcomingDebts = async () => {
    try {
      const today = new Date();
      const in7Days = new Date(today);
      in7Days.setDate(today.getDate() + 7);

      const todayStr = today.toISOString().split("T")[0];
      const in7DaysStr = in7Days.toISOString().split("T")[0];

      const { data } = await supabase
        .from("student_debts")
        .select(`
          due_date,
          amount,
          installment_number,
          debt_concepts:concept_id (name),
          payment_plans:payment_plan_id (name),
          students:student_id (first_name, last_name)
        `)
        .in("status", ["pending", "partial"])
        .gte("due_date", todayStr)
        .lte("due_date", in7DaysStr)
        .order("due_date", { ascending: true });

      const list: UpcomingDebt[] = (data || []).map((d: any) => {
        const due = new Date(d.due_date);
        const diffMs = due.getTime() - new Date(todayStr).getTime();
        const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const conceptName = d.payment_plans?.name
          ? `${d.payment_plans.name} - Cuota ${d.installment_number}`
          : (d.debt_concepts?.name || "Sin concepto");
        return {
          studentName: `${d.students?.first_name || ""} ${d.students?.last_name || ""}`.trim(),
          conceptName,
          dueDate: d.due_date,
          amount: Number(d.amount),
          daysLeft,
        };
      });

      setUpcomingDebts(list);
      setDebtsPage(0);
    } catch (error) {
      console.error("Error loading upcoming debts:", error);
    }
  };

  const statCards = [
    { title: "Total Estudiantes", value: stats.totalStudents, icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
    { title: "Estudiantes Activos", value: stats.activeStudents, icon: Users, color: "text-success", bgColor: "bg-success/10" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Panel de Control</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Resumen general del sistema de gestión escolar
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
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

      {/* Gráfico */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Pagos por Mes (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ResponsiveContainer width="50%" height={400}>
            <BarChart data={pagosPorMes} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis hide />
              <Tooltip
                formatter={(value: number) => [`Gs. ${value.toLocaleString("es-PY")}`, "Total cobrado"]}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cuotas próximas a vencer */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <div className="p-2 rounded-full bg-warning/10">
            <Bell className="h-4 w-4 text-warning" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Cuotas próximas a vencer</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Vencimientos en los próximos 7 días</p>
          </div>
          {upcomingDebts.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {upcomingDebts.length} cuota{upcomingDebts.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {upcomingDebts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay cuotas que venzan en los próximos 7 días
            </p>
          ) : (
            <>
              <div className="divide-y">
                {upcomingDebts
                  .slice(debtsPage * DEBTS_PAGE_SIZE, debtsPage * DEBTS_PAGE_SIZE + DEBTS_PAGE_SIZE)
                  .map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-3 gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{d.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate">{d.conceptName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-warning">
                          {d.amount.toLocaleString("es-PY")} Gs.
                        </p>
                        <div className="flex items-center gap-2 justify-end mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatDatePY(d.dueDate)}</span>
                          <Badge variant={d.daysLeft === 0 ? "destructive" : "secondary"} className="text-xs">
                            {d.daysLeft === 0 ? "Hoy" : `en ${d.daysLeft}d`}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {upcomingDebts.length > DEBTS_PAGE_SIZE && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-xs text-muted-foreground">
                    Página {debtsPage + 1} de {Math.ceil(upcomingDebts.length / DEBTS_PAGE_SIZE)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={debtsPage === 0}
                      onClick={() => setDebtsPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={debtsPage >= Math.ceil(upcomingDebts.length / DEBTS_PAGE_SIZE) - 1}
                      onClick={() =>
                        setDebtsPage((p) =>
                          Math.min(Math.ceil(upcomingDebts.length / DEBTS_PAGE_SIZE) - 1, p + 1)
                        )
                      }
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
};
