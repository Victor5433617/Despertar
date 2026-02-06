import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { PaymentReceipt } from "./PaymentReceipt";
import { formatDatePY, getTodayDateString, isDateOverdue } from "@/lib/dateUtils";

interface DebtItem {
  id: string;
  concept_name: string;
  amount: number;
  due_date: string;
  status: string;
  selected: boolean;
  installment_number: number | null;
  plan_name: string | null;
}

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  student: any;
}

export const PaymentDialog = ({ open, onClose, student }: PaymentDialogProps) => {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [formData, setFormData] = useState({
    payment_date: getTodayDateString(),
    payment_method: "",
    receipt_number: "",
    notes: "",
    payment_amount: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    if (open && student) {
      loadStudentDebts();
      setFormData({
        payment_date: getTodayDateString(),
        payment_method: "",
        receipt_number: "",
        notes: "",
        payment_amount: "",
      });
    }
  }, [open, student]);

  const loadStudentDebts = async () => {
    if (!student) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("student_debts")
        .select(`
          id,
          amount,
          due_date,
          status,
          installment_number,
          debt_concepts:concept_id (name),
          payment_plans:payment_plan_id (name)
        `)
        .eq("student_id", student.id)
        .in("status", ["pending", "partial"])
        .order("due_date", { ascending: true });

      if (error) throw error;

      const debtsList: DebtItem[] = (data || []).map((debt: any) => {
        const dueDate = debt.due_date;
        return {
          id: debt.id,
          concept_name: debt.payment_plans?.name 
            ? `${debt.payment_plans.name} - Cuota ${debt.installment_number}`
            : (debt.debt_concepts?.name || "Sin concepto"),
          amount: Number(debt.amount),
          due_date: dueDate,
          status: debt.status,
          selected: false,
          installment_number: debt.installment_number,
          plan_name: debt.payment_plans?.name || null,
        };
      });

      setDebts(debtsList);
    } catch (error) {
      console.error("Error loading debts:", error);
      toast.error("Error al cargar deudas del estudiante");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebtSelection = (debtId: string, selected: boolean) => {
    setDebts((prevDebts) =>
      prevDebts.map((debt) =>
        debt.id === debtId ? { ...debt, selected } : debt
      )
    );
  };

  const handleSelectAll = () => {
    const allSelected = debts.every((debt) => debt.selected);
    setDebts((prevDebts) =>
      prevDebts.map((debt) => ({ ...debt, selected: !allSelected }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedDebts = debts.filter((debt) => debt.selected);

      if (selectedDebts.length === 0) {
        toast.error("Debe seleccionar al menos un concepto para pagar");
        setIsSubmitting(false);
        return;
      }

      const paymentAmount = parseFloat(formData.payment_amount);
      if (!paymentAmount || paymentAmount <= 0) {
        toast.error("Debe ingresar un monto de pago válido");
        setIsSubmitting(false);
        return;
      }

      // Calculate total debt amount
      const totalDebtAmount = selectedDebts.reduce((sum, debt) => sum + debt.amount, 0);

      if (paymentAmount > totalDebtAmount) {
        toast.error("El monto a pagar no puede ser mayor que la deuda total seleccionada");
        setIsSubmitting(false);
        return;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let remainingPayment = paymentAmount;
      const paidConcepts: Array<{ name: string; amount: number; isLateFee?: boolean }> = [];

      // Distribute payment across selected debts
      for (const debt of selectedDebts) {
        if (remainingPayment <= 0) break;

        const amountToPay = Math.round(Math.min(remainingPayment, debt.amount) * 100) / 100;
        const newDebtAmount = Math.round((debt.amount - amountToPay) * 100) / 100;

        // Insert payment
        const { error: paymentError } = await supabase.from("payments").insert({
          student_id: student.id,
          debt_id: debt.id,
          amount: amountToPay,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method || null,
          receipt_number: formData.receipt_number || null,
          notes: formData.notes || null,
          registered_by: user?.id || null,
        });

        if (paymentError) throw paymentError;

        // Update debt amount and status
        const newStatus = newDebtAmount <= 0.01 ? "paid" : "partial";
        const { error: updateError } = await supabase
          .from("student_debts")
          .update({ 
            amount: newDebtAmount,
            status: newStatus 
          })
          .eq("id", debt.id);

        if (updateError) throw updateError;

        // Track paid concepts for receipt
        paidConcepts.push({
          name: debt.concept_name,
          amount: amountToPay,
        });

        remainingPayment = Math.round((remainingPayment - amountToPay) * 100) / 100;
      }

      // Prepare receipt data
      setReceiptData({
        receiptNumber: formData.receipt_number || `REC-${Date.now()}`,
        paymentDate: formData.payment_date,
        studentName: `${student.first_name} ${student.last_name}`,
        studentId: student.identification,
        paymentMethod: formData.payment_method,
        amount: paymentAmount,
        paidConcepts,
        notes: formData.notes,
      });

      toast.success(
        `Pago registrado exitosamente por ${paymentAmount.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Gs.`
      );
      setShowReceipt(true);
    } catch (error: any) {
      console.error("Error registering payment:", error);
      toast.error("Error al registrar pago: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOverdue = (dueDate: string) => {
    return isDateOverdue(dueDate);
  };

  const selectedTotal = debts
    .filter((debt) => debt.selected)
    .reduce((sum, debt) => sum + debt.amount, 0);

  const handleCloseAll = () => {
    setShowReceipt(false);
    setReceiptData(null);
    onClose();
  };

  return (
    <>
      {showReceipt && receiptData && (
        <PaymentReceipt data={receiptData} onClose={handleCloseAll} />
      )}
      <Dialog open={open && !showReceipt} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Registrar Pago</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando deudas...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Info */}
            {student && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Información del Estudiante</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nombre</p>
                      <p className="font-medium">
                        {student.first_name} {student.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Identificación</p>
                      <p className="font-medium">{student.identification || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Grado</p>
                      <p className="font-medium">{student.grade_name || "Sin grado"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Debts Selection */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Label className="text-sm sm:text-base font-semibold">
                  Conceptos Pendientes de Pago
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="w-full sm:w-auto"
                >
                  {debts.every((debt) => debt.selected)
                    ? "Deseleccionar Todo"
                    : "Seleccionar Todo"}
                </Button>
              </div>

              {debts.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No hay deudas pendientes para este estudiante
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg divide-y">
                  {debts.map((debt) => (
                    <div
                      key={debt.id}
                      className={`p-3 sm:p-4 hover:bg-muted/50 ${isOverdue(debt.due_date) ? 'bg-destructive/5' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start sm:items-center gap-3">
                          <Checkbox
                            checked={debt.selected}
                            onCheckedChange={(checked) =>
                              handleDebtSelection(debt.id, checked as boolean)
                            }
                            className="mt-1 sm:mt-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{debt.concept_name}</p>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                              <span>
                                Vencimiento:{" "}
                                {formatDatePY(debt.due_date)}
                              </span>
                              {isOverdue(debt.due_date) && (
                                <span className="flex items-center gap-1 text-destructive">
                                  <AlertCircle className="h-3 w-3" />
                                  Vencido
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right pl-8 sm:pl-0">
                          <p className="font-bold text-base sm:text-lg">
                            {debt.amount.toLocaleString("es-PY")} Gs
                          </p>
                        </div>
                      </div>
                      
                    </div>
                  ))}
                </div>
              )}

              {selectedTotal > 0 && (
                <Card className="bg-primary/5">
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total a Pagar:</span>
                      <span className="text-2xl font-bold text-primary">
                        {selectedTotal.toLocaleString("es-PY")} Gs
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedTotal > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Monto a Pagar *</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    step="1"
                    min="1"
                    max={selectedTotal}
                    placeholder="Ingrese el monto a pagar"
                    value={formData.payment_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_amount: e.target.value })
                    }
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Puede pagar parcialmente. Máximo: {selectedTotal.toLocaleString("es-PY")} Gs
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Payment Details */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Detalles del Pago</Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_date">Fecha de Pago *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Método de Pago</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, payment_method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt_number">Número de Recibo</Label>
                <Input
                disabled
                  id="receipt_number"
                  placeholder="Ej: REC-001234"
                  value={formData.receipt_number}
                  onChange={(e) =>
                    setFormData({ ...formData, receipt_number: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas adicionales sobre el pago (opcional)"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || selectedTotal === 0 || !formData.payment_amount}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Procesando..." : "Registrar Pago"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};
