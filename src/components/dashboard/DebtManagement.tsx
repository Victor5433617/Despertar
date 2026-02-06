import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, DollarSign, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { DebtDetailsDialog } from "./DebtDetailsDialog";
import { formatDatePY, getTodayDateString } from "@/lib/dateUtils";

interface StudentDebt {
  student_id: string;
  student_name: string;
  identification: string | null;
  grade_name: string | null;
  enrollment_date: string;
  total_debt: number;
  pending_debts_count: number;
}

export const DebtManagement = () => {
  const [studentDebts, setStudentDebts] = useState<StudentDebt[]>([]);
  const [filteredDebts, setFilteredDebts] = useState<StudentDebt[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    loadStudentDebts();
  }, []);

  useEffect(() => {
    filterDebts();
  }, [searchTerm, dateFilter, studentDebts]);

  const loadStudentDebts = async () => {
    try {
      setIsLoading(true);
      
      // Get all students with their debts
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          first_name,
          last_name,
          identification,
          enrollment_date,
          grades:grade_id (name)
        `)
        .eq("is_active", true);

      if (studentsError) throw studentsError;

      // Get all pending debts
      const { data: debts, error: debtsError } = await supabase
        .from("student_debts")
        .select("student_id, amount, status")
        .in("status", ["pending", "partial"]);

      if (debtsError) throw debtsError;

      // Calculate totals per student
      const studentDebtsMap = new Map<string, { total: number; count: number }>();
      debts?.forEach((debt) => {
        const current = studentDebtsMap.get(debt.student_id) || { total: 0, count: 0 };
        studentDebtsMap.set(debt.student_id, {
          total: current.total + Number(debt.amount),
          count: current.count + 1,
        });
      });

      // Map students with their debt info
      const studentDebtsList: StudentDebt[] = (students || []).map((student) => {
        const debtInfo = studentDebtsMap.get(student.id) || { total: 0, count: 0 };
        return {
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          identification: student.identification,
          grade_name: student.grades?.name || null,
          enrollment_date: student.enrollment_date,
          total_debt: debtInfo.total,
          pending_debts_count: debtInfo.count,
        };
      });

      setStudentDebts(studentDebtsList);
    } catch (error) {
      console.error("Error loading student debts:", error);
      toast.error("Error al cargar deudas");
    } finally {
      setIsLoading(false);
    }
  };

  const filterDebts = () => {
    let filtered = [...studentDebts];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (debt) =>
          debt.student_name.toLowerCase().includes(term) ||
          debt.identification?.toLowerCase().includes(term)
      );
    }

    // Date filter (enrollment date)
    if (dateFilter !== "all") {
      const today = getTodayDateString();
      const currentYear = parseInt(today.substring(0, 4));
      filtered = filtered.filter((debt) => {
        const enrollmentYear = parseInt(debt.enrollment_date.substring(0, 4));
        switch (dateFilter) {
          case "this_year":
            return enrollmentYear === currentYear;
          case "last_year":
            return enrollmentYear === currentYear - 1;
          case "older":
            return enrollmentYear < currentYear - 1;
          default:
            return true;
        }
      });
    }

    setFilteredDebts(filtered);
  };

  const handleViewDetails = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsDetailsOpen(true);
  };

  const totalDebtAmount = filteredDebts.reduce((sum, debt) => sum + debt.total_debt, 0);
  const studentsWithDebt = filteredDebts.filter((debt) => debt.total_debt > 0).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Consulta de Deudas</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Visualice y gestione las deudas pendientes de los estudiantes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deuda Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {totalDebtAmount.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Gs
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Suma de todas las deudas pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estudiantes con Deuda
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsWithDebt}</div>
            <p className="text-xs text-muted-foreground mt-1">
              De {filteredDebts.length} estudiantes activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Promedio por Estudiante
            </CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentsWithDebt > 0 ? (totalDebtAmount / studentsWithDebt).toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "0"} Gs
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Deuda promedio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de BÃºsqueda</CardTitle>
          <CardDescription>Utilice los filtros para encontrar deudas especÃ­ficas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o identificaciÃ³n..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por fecha de ingreso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="this_year">Este aÃ±o</SelectItem>
                <SelectItem value="last_year">AÃ±o pasado</SelectItem>
                <SelectItem value="older">MÃ¡s antiguos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Debts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deudas por Estudiante</CardTitle>
          <CardDescription>
            Mostrando {filteredDebts.length} estudiante(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Cargando deudas...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Estudiante</TableHead>
                    <TableHead className="min-w-[120px]">IdentificaciÃ³n</TableHead>
                    <TableHead className="min-w-[100px]">Grado</TableHead>
                    <TableHead className="min-w-[120px]">Fecha Ingreso</TableHead>
                    <TableHead className="min-w-[140px]">Conceptos Pendientes</TableHead>
                    <TableHead className="min-w-[120px]">Deuda Total</TableHead>
                    <TableHead className="min-w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredDebts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No se encontraron deudas con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDebts.map((debt) => (
                    <TableRow key={debt.student_id}>
                      <TableCell className="font-medium">{debt.student_name}</TableCell>
                      <TableCell>{debt.identification || "N/A"}</TableCell>
                      <TableCell>
                        {debt.grade_name ? (
                          <Badge variant="outline">{debt.grade_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Sin grado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDatePY(debt.enrollment_date)}
                      </TableCell>
                      <TableCell>
                        {debt.pending_debts_count > 0 ? (
                          <Badge variant="secondary">{debt.pending_debts_count}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {debt.total_debt > 0 ? (
                          <span className="font-bold text-warning">
                            {debt.total_debt.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Gs
                          </span>
                        ) : (
                          <span className="text-success font-medium">0 Gs</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(debt.student_id)}
                          disabled={debt.total_debt === 0}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DebtDetailsDialog
        open={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedStudentId(null);
        }}
        studentId={selectedStudentId}
        onDebtUpdated={loadStudentDebts}
      />
    </div>
  );
};
