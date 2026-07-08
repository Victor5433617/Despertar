import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatDatePY } from "@/lib/dateUtils";
import { PaymentReceipt } from "./PaymentReceipt";

interface StudentPayment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  receipt_number: string | null;
  notes: string | null;
  debt_id: string | null;
  concept_name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string | null;
  studentName: string;
  studentIdentification: string | null;
}

export const StudentPaymentHistoryDialog = ({ open, onClose, studentId, studentName, studentIdentification }: Props) => {
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    if (open && studentId) loadPayments();
  }, [open, studentId]);

  const loadPayments = async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          receipt_number,
          notes,
          debt_id,
          student_debts:debt_id (
            debt_concepts:concept_id (name),
            payment_plans:payment_plan_id (name),
            installment_number
          )
        `)
        .eq("student_id", studentId)
        .eq("status", "active")
        .order("payment_date", { ascending: false });

      if (error) throw error;

      const list: StudentPayment[] = (data || []).map((p: any) => {
        const debt = p.student_debts;
        let concept = "Pago General";
        if (debt?.payment_plans?.name) {
          concept = `${debt.payment_plans.name} - Cuota ${debt.installment_number}`;
        } else if (debt?.debt_concepts?.name) {
          concept = debt.debt_concepts.name;
        }
        return {
          id: p.id,
          amount: Number(p.amount),
          payment_date: p.payment_date,
          payment_method: p.payment_method,
          receipt_number: p.receipt_number,
          notes: p.notes,
          debt_id: p.debt_id,
          concept_name: concept,
        };
      });

      setPayments(list);
    } catch (err) {
      console.error("Error loading student payments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintReceipt = (payment: StudentPayment) => {
    setReceiptData({
      receiptNumber: payment.receipt_number || `REC-${payment.id.slice(0, 8)}`,
      paymentDate: payment.payment_date,
      studentName,
      studentId: studentIdentification || "N/A",
      paymentMethod: payment.payment_method || "No especificado",
      amount: payment.amount,
      paidConcepts: [{ name: payment.concept_name, amount: payment.amount }],
      notes: payment.notes,
    });
    setShowReceipt(true);
  };

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      {showReceipt && receiptData && (
        <PaymentReceipt
          data={receiptData}
          onClose={() => { setShowReceipt(false); setReceiptData(null); }}
        />
      )}
      <Dialog open={open && !showReceipt} onOpenChange={onClose}>
        <DialogContent className="w-[98vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Historial de Pagos — {studentName}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-2 text-muted-foreground">Cargando pagos...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay pagos registrados para este estudiante
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                {payments.length} pago(s) — Total:{" "}
                <span className="font-bold text-foreground">
                  {total.toLocaleString("es-PY")} Gs.
                </span>
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Nº Recibo</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDatePY(payment.payment_date)}
                        </TableCell>
                        <TableCell className="font-medium">{payment.concept_name}</TableCell>
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
                          {payment.receipt_number || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintReceipt(payment)}
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            Imprimir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
