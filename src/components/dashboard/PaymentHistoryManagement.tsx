import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, History, XCircle, Printer, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatDatePY } from "@/lib/dateUtils";
import { PaymentReceipt } from "./PaymentReceipt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export const PaymentHistoryManagement = () => {
  const [activePayments, setActivePayments] = useState<Payment[]>([]);
  const [cancelledPayments, setCancelledPayments] = useState<Payment[]>([]);
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [cancelledSearchTerm, setCancelledSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadActivePayments(), loadCancelledPayments()]);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivePayments = async () => {
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
        .limit(100);

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

      setActivePayments(paymentsList);
    } catch (error) {
      console.error("Error loading active payments:", error);
      toast.error("Error al cargar pagos activos");
    }
  };

  const loadCancelledPayments = async () => {
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
        .eq("status", "cancelled")
        .order("cancelled_at", { ascending: false })
        .limit(100);

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
        status: payment.status,
      }));

      setCancelledPayments(paymentsList);
    } catch (error) {
      console.error("Error loading cancelled payments:", error);
    }
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

  // Filter payments by student name
  const filteredActivePayments = activeSearchTerm
    ? activePayments.filter((payment) =>
        payment.student_name.toLowerCase().includes(activeSearchTerm.toLowerCase())
      )
    : activePayments;

  const filteredCancelledPayments = cancelledSearchTerm
    ? cancelledPayments.filter((payment) =>
        payment.student_name.toLowerCase().includes(cancelledSearchTerm.toLowerCase())
      )
    : cancelledPayments;

  const totalActive = activePayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalCancelled = cancelledPayments.reduce((sum, payment) => sum + payment.amount, 0);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Historial de Pagos</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Consulte el historial completo de pagos
          </p>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando pagos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Historial de Pagos</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Consulte el historial completo de pagos realizados y anulados
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagos Activos
            </CardTitle>
            <Receipt className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePayments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {totalActive.toLocaleString("es-PY")} Gs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagos Anulados
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cancelledPayments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {totalCancelled.toLocaleString("es-PY")} Gs.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Active and Cancelled Payments */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Pagos Activos
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Pagos Anulados
          </TabsTrigger>
        </TabsList>

        {/* Active Payments Tab */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Pagos Activos</CardTitle>
                  <CardDescription>
                    Últimos 100 pagos registrados en el sistema
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por nombre..."
                    value={activeSearchTerm}
                    onChange={(e) => setActiveSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredActivePayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {activeSearchTerm
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
                        <TableHead className="min-w-[150px]">Observaciones</TableHead>
                        <TableHead className="min-w-[100px]">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActivePayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDatePY(payment.payment_date)}</TableCell>
                          <TableCell className="font-medium">
                            {payment.student_name}
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-success">
                              {payment.amount.toLocaleString("es-PY")} Gs.
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
                          <TableCell className="max-w-xs truncate">
                            {payment.notes || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReprintReceipt(payment)}
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              Recibo
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cancelled Payments Tab */}
        <TabsContent value="cancelled">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    Pagos Anulados
                  </CardTitle>
                  <CardDescription>
                    Historial de pagos anulados en el sistema
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por nombre..."
                    value={cancelledSearchTerm}
                    onChange={(e) => setCancelledSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCancelledPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {cancelledSearchTerm
                    ? "No se encontraron pagos anulados para ese estudiante"
                    : "No hay pagos anulados"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Fecha Pago</TableHead>
                        <TableHead className="min-w-[150px]">Estudiante</TableHead>
                        <TableHead className="min-w-[120px]">Monto</TableHead>
                        <TableHead className="min-w-[130px]">Método</TableHead>
                        <TableHead className="min-w-[100px]">Nº Recibo</TableHead>
                        <TableHead className="min-w-[150px]">Observaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCancelledPayments.map((payment) => (
                        <TableRow key={payment.id} className="opacity-60">
                          <TableCell>{formatDatePY(payment.payment_date)}</TableCell>
                          <TableCell className="font-medium">
                            {payment.student_name}
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-muted-foreground line-through">
                              {payment.amount.toLocaleString("es-PY")} Gs.
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
                          <TableCell className="max-w-xs truncate">
                            {payment.notes || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showReceipt && receiptData && (
        <PaymentReceipt data={receiptData} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
};
