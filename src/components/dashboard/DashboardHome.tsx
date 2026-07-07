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
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

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
  const [studentsTrend, setStudentsTrend] = useState<{ mes: string; total: number; active: number }[]>([]);
  const [upcomingDebts, setUpcomingDebts] = useState<UpcomingDebt[]>([]);
  const [debtsPage, setDebtsPage] = useState(0);
  const DEBTS_PAGE_SIZE = 5;

  useEffect(() => {
    loadStats();
    loadPagosPorMes();
    loadUpcomingDebts();
    loadStudentsTrend();
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

  const loadStudentsTrend = async () => {
    try {
      const now = new Date();
      const { data } = await supabase.from("students").select("created_at, is_active");

      const meses: { key: string; mes: string; end: Date }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        meses.push({ key: `${d.getFullYear()}-${d.getMonth()}`, mes: MESES[d.getMonth()], end });
      }

      const resultado = meses.map(({ mes, end }) => {
        const total = (data || []).filter((s) => new Date(s.created_at) < end).length;
        const active = (data || []).filter((s) => s.is_active && new Date(s.created_at) < end).length;
        return { mes, total, active };
      });

      setStudentsTrend(resultado);
    } catch (error) {
      console.error("Error loading students trend:", error);
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

  const getChangePct = (dataKey: "total" | "active") => {
    if (studentsTrend.length < 2) return 0;
    const prev = studentsTrend[studentsTrend.length - 2][dataKey];
    const curr = studentsTrend[studentsTrend.length - 1][dataKey];
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const statCards = [
    {
      title: "Total Estudiantes",
      value: stats.totalStudents,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      chartColor: "hsl(var(--primary))",
      dataKey: "total" as const,
    },
    {
      title: "Estudiantes Activos",
      value: stats.activeStudents,
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
      chartColor: "hsl(var(--success))",
      dataKey: "active" as const,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Panel de Control</h3>
        <p className="text-sm sm:text-base text-muted-foreground">
          Resumen general del sistema de gestión escolar
        </p>
      </div>

      {/* Resumen: pagos + estudiantes en un solo card */}
      <Card className="shadow-sm">
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
          {/* Gráfico de pagos */}
          <div className="lg:col-span-2">
            <h3 className="text-base font-semibold mb-2">Pagos por Mes (últimos 6 meses)</h3>
            <ResponsiveContainer width="75%" height={320}>
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
          </div>

          {/* Estudiantes: total y activos, apilados */}
          <div className="flex flex-col gap-4 justify-center">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              const changePct = getChangePct(stat.dataKey);
              const isPositive = changePct >= 0;
              return (
                <div key={stat.title} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                    <div className={`p-2 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      {studentsTrend.length > 1 && (
                        <div className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? "text-success" : "text-destructive"}`}>
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isPositive ? "+" : ""}
                          {changePct.toFixed(1)}% vs mes anterior
                        </div>
                      )}
                    </div>
                    <div className="w-20 h-10 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={studentsTrend} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`gradient-${stat.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={stat.chartColor} stopOpacity={0.4} />
                              <stop offset="100%" stopColor={stat.chartColor} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Tooltip
                            contentStyle={{ fontSize: 12 }}
                            formatter={(value: number) => [value, stat.title]}
                            labelFormatter={(label) => label}
                          />
                          <Area
                            type="monotone"
                            dataKey={stat.dataKey}
                            stroke={stat.chartColor}
                            strokeWidth={2}
                            fill={`url(#gradient-${stat.dataKey})`}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
