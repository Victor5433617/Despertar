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
import { Plus, Search, DollarSign, Receipt, Printer, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PaymentDialog } from "./PaymentDialog";
import { PaymentReceipt } from "./PaymentReceipt";
import { formatDatePY } from "@/lib/dateUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  identification: string | null;
  grade_name: string | null;
  total_debt: number;
  pending_debts_count: number;
}

interface Payment {
  id: string;
  student_id: string;
  student_name: string;
  student_identification: string | null;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  receipt_number: string | null;
  notes: string | null;
  debt_id: string | null;
  status: string;
}

export const PaymentsManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentToCancel, setPaymentToCancel] = useState<Payment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, students]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadStudents(), loadRecentPayments()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          first_name,
          last_name,
          identification,
          grades:grade_id (name)
        `)
        .eq("is_active", true);

      if (studentsError) throw studentsError;

      const { data: debts, error: debtsError } = await supabase
        .from("student_debts")
        .select("student_id, amount, status")
        .in("status", ["pending", "partial"]);

      if (debtsError) throw debtsError;

      const studentDebtsMap = new Map<string, { total: number; count: number }>();
      debts?.forEach((debt) => {
        const current = studentDebtsMap.get(debt.student_id) || { total: 0, count: 0 };
        studentDebtsMap.set(debt.student_id, {
          total: current.total + Number(debt.amount),
          count: current.count + 1,
        });
      });

      const studentsList: Student[] = (studentsData || []).map((student) => {
        const debtInfo = studentDebtsMap.get(student.id) || { total: 0, count: 0 };
        return {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          identification: student.identification,
          grade_name: student.grades?.name || null,
          total_debt: debtInfo.total,
          pending_debts_count: debtInfo.count,
        };
      });

      setStudents(studentsList);
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("Error al cargar estudiantes");
    }
  };

  const loadRecentPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          student_id,
          debt_id,
          amount,
          payment_date,
          payment_method,
          receipt_number,
          notes,
          status,
          students:student_id (
            first_name,
            last_name,
            identification
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const paymentsList: Payment[] = (data || []).map((payment: any) => ({
        id: payment.id,
        student_id: payment.student_id,
        student_name: `${payment.students.first_name} ${payment.students.last_name}`,
        student_identification: payment.students.identification,
        amount: Number(payment.amount),
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        receipt_number: payment.receipt_number,
        notes: payment.notes,
        debt_id: payment.debt_id,
        status: payment.status || "active",
      }));

      setRecentPayments(paymentsList);
    } catch (error) {
      console.error("Error loading recent payments:", error);
      toast.error("Error al cargar pagos recientes");
    }
  };

  const filteredRecentPayments = paymentSearchTerm
    ? recentPayments.filter((payment) =>
        payment.student_name.toLowerCase().includes(paymentSearchTerm.toLowerCase())
      )
    : recentPayments;

  const filterStudents = () => {
    if (!searchTerm) {
      setFilteredStudents(students);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = students.filter(
      (student) =>
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(term) ||
        student.identification?.toLowerCase().includes(term)
    );
    setFilteredStudents(filtered);
  };

  const handleRegisterPayment = (student: Student) => {
    if (student.total_debt === 0) {
      toast.info("Este estudiante no tiene deudas pendientes");
      return;
    }
    setSelectedStudent(student);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedStudent(null);
    loadData();
  };

  const handleReprintReceipt = async (payment: Payment) => {
    try {
      let paidConcepts: Array<{ name: string; amount: number }> = [];

      if (payment.debt_id) {
        const { data: debtData, error: debtError } = await supabase
          .from("student_debts")
          .select(`
            amount,
            debt_concepts:concept_id (
              name
            )
          `)
          .eq("id", payment.debt_id)
          .single();

        if (!debtError && debtData) {
          paidConcepts = [
            {
              name: debtData.debt_concepts.name,
              amount: payment.amount,
            },
          ];
        }
      } else {
        const { data: debtsData, error: debtsError } = await supabase
          .from("student_debts")
          .select(`
            amount,
            debt_concepts:concept_id (
              name
            )
          `)
          .eq("student_id", payment.student_id)
          .eq("status", "paid");

        if (!debtsError && debtsData && debtsData.length > 0) {
          paidConcepts = debtsData.map((debt: any) => ({
            name: debt.debt_concepts.name,
            amount: Number(debt.amount),
          }));
        }
      }

      if (paidConcepts.length === 0) {
        paidConcepts = [
          {
            name: "Pago General",
            amount: payment.amount,
          },
        ];
      }

      setReceiptData({
        receiptNumber: payment.receipt_number || "N/A",
        paymentDate: payment.payment_date,
        studentName: payment.student_name,
        studentId: payment.student_identification || "N/A",
        paymentMethod: payment.payment_method || "No especificado",
        amount: payment.amount,
        paidConcepts,
        notes: payment.notes,
      });
      setShowReceipt(true);
    } catch (error) {
      console.error("Error loading receipt data:", error);
      toast.error("Error al cargar datos del recibo");
    }
  };

  const handleCancelPayment = (payment: Payment) => {
    setPaymentToCancel(payment);
    setCancelDialogOpen(true);
  };

  const confirmCancelPayment = async () => {
    if (!paymentToCancel) return;

    try {
      setIsCancelling(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id || null,
        })
        .eq("id", paymentToCancel.id);

      if (paymentError) throw paymentError;

      if (paymentToCancel.debt_id) {
        const { data: debtData, error: debtFetchError } = await supabase
          .from("student_debts")
          .select("amount, status")
          .eq("id", paymentToCancel.debt_id)
          .single();

        if (debtFetchError) throw debtFetchError;

        const newAmount = Number(debtData.amount) + paymentToCancel.amount;
        const newStatus = debtData.status === "paid" ? "pending" : debtData.status;

        const { error: debtUpdateError } = await supabase
          .from("student_debts")
          .update({
            amount: newAmount,
            status: newStatus,
          })
          .eq("id", paymentToCancel.debt_id);

        if (debtUpdateError) throw debtUpdateError;
      }

      toast.success("Pago anulado exitosamente. El monto ha sido restaurado a la deuda.");
      setCancelDialogOpen(false);
      setPaymentToCancel(null);
      loadData();
    } catch (error: any) {
      console.error("Error cancelling payment:", error);
      toast.error("Error al anular el pago: " + error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const totalPaid = recentPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Registro de Pagos</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Registre y gestione los pagos de estudiantes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagos Recientes (Últimos 20)
            </CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentPayments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total recaudado:{" "}
              {totalPaid.toLocaleString("es-PY", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}{" "}
              Gs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estudiantes con Deuda
            </CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter((s) => s.total_debt > 0).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              De {students.length} estudiantes activos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Student Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Estudiante</CardTitle>
          <CardDescription>Busque al estudiante para registrar un pago</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o identificación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Cargando estudiantes...</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Estudiante</TableHead>
                      <TableHead className="min-w-[120px]">Identificación</TableHead>
                      <TableHead className="min-w-[100px]">Grado</TableHead>
                      <TableHead className="min-w-[140px]">Conceptos Pendientes</TableHead>
                      <TableHead className="min-w-[120px]">Deuda Total</TableHead>
                      <TableHead className="min-w-[150px]">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {searchTerm
                            ? "No se encontraron estudiantes"
                            : "No hay estudiantes registrados"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell>{student.identification || "N/A"}</TableCell>
                          <TableCell>
                            {student.grade_name ? (
                              <Badge variant="outline">{student.grade_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">Sin grado</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.pending_debts_count > 0 ? (
                              <Badge variant="secondary">{student.pending_debts_count}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.total_debt > 0 ? (
                              <span className="font-bold text-warning">
                                {student.total_debt.toLocaleString("es-PY", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}{" "}
                                Gs.
                              </span>
                            ) : (
                              <span className="text-success font-medium">0 Gs.</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleRegisterPayment(student)}
                              disabled={student.total_debt === 0}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Registrar Pago
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments - Simplified */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Pagos Recientes</CardTitle>
              <CardDescription>Últimos 20 pagos registrados</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre..."
                value={paymentSearchTerm}
                onChange={(e) => setPaymentSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecentPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {paymentSearchTerm
                ? "No se encontraron pagos para ese estudiante"
                : "No hay pagos registrados aún"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Fecha</TableHead>
                    <TableHead className="min-w-[150px]">Estudiante</TableHead>
                    <TableHead className="min-w-[120px]">Monto</TableHead>
                    <TableHead className="min-w-[130px]">Método</TableHead>
                    <TableHead className="min-w-[100px]">Nº Recibo</TableHead>
                    <TableHead className="min-w-[200px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDatePY(payment.payment_date)}</TableCell>
                      <TableCell className="font-medium">{payment.student_name}</TableCell>
                      <TableCell>
                        <span className="font-bold text-success">
                          {payment.amount.toLocaleString("es-PY", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}{" "}
                          Gs.
                        </span>
                      </TableCell>
                      <TableCell>
                        {payment.payment_method ? (
                          <Badge variant="outline">{payment.payment_method}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.receipt_number || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReprintReceipt(payment)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Recibo
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelPayment(payment)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Anular
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        student={selectedStudent}
      />

      {showReceipt && receiptData && (
        <PaymentReceipt data={receiptData} onClose={() => setShowReceipt(false)} />
      )}

      {/* Cancel Payment Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción anulará el pago y restaurará el monto a la deuda del estudiante.
              {paymentToCancel && (
                <div className="mt-4 p-3 bg-muted rounded-lg space-y-1">
                  <p>
                    <strong>Estudiante:</strong> {paymentToCancel.student_name}
                  </p>
                  <p>
                    <strong>Monto:</strong> {paymentToCancel.amount.toLocaleString("es-PY")} Gs.
                  </p>
                  <p>
                    <strong>Fecha:</strong> {formatDatePY(paymentToCancel.payment_date)}
                  </p>
                  {paymentToCancel.receipt_number && (
                    <p>
                      <strong>Recibo:</strong> {paymentToCancel.receipt_number}
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelPayment}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Anulando..." : "Sí, anular pago"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
