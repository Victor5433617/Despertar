import { useEffect, useState } from "react";
import { formatDatePY, isDateOverdue } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { Calendar, DollarSign, FileText, AlertTriangle } from "lucide-react";

interface DebtDetail {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  concept_name: string;
  concept_description: string | null;
  installment_number: number | null;
  plan_name: string | null;
}

interface StudentInfo {
  first_name: string;
  last_name: string;
  identification: string | null;
  grade_name: string | null;
}

interface DebtDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  studentId: string | null;
  onDebtUpdated?: () => void;
}

export const DebtDetailsDialog = ({ open, onClose, studentId, onDebtUpdated }: DebtDetailsDialogProps) => {
  const [debts, setDebts] = useState<DebtDetail[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Late fee (mora) state
  const [lateFeeDialogOpen, setLateFeeDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtDetail | null>(null);
  const [lateFeeAmount, setLateFeeAmount] = useState<string>("10000");
  const [isApplyingLateFee, setIsApplyingLateFee] = useState(false);

  useEffect(() => {
    if (open && studentId) {
      loadDebtDetails();
    }
  }, [open, studentId]);

  const loadDebtDetails = async () => {
    if (!studentId) return;

    try {
      setIsLoading(true);

      // Load student info
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select(`
          first_name,
          last_name,
          identification,
          grades:grade_id (name)
        `)
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;

      setStudentInfo({
        first_name: student.first_name,
        last_name: student.last_name,
        identification: student.identification,
        grade_name: student.grades?.name || null,
      });

      // Load debts with payment plan info
      const { data: debtsData, error: debtsError } = await supabase
        .from("student_debts")
        .select(`
          id,
          amount,
          due_date,
          status,
          notes,
          created_at,
          installment_number,
          debt_concepts:concept_id (
            name,
            description
          ),
          payment_plans:payment_plan_id (
            name
          )
        `)
        .eq("student_id", studentId)
        .in("status", ["pending", "partial"])
        .order("due_date", { ascending: true });

      if (debtsError) throw debtsError;

      const formattedDebts: DebtDetail[] = (debtsData || []).map((debt: any) => ({
        id: debt.id,
        amount: Number(debt.amount),
        due_date: debt.due_date,
        status: debt.status,
        notes: debt.notes,
        created_at: debt.created_at,
        concept_name: debt.payment_plans?.name 
          ? `${debt.payment_plans.name} - Cuota ${debt.installment_number}`
          : (debt.debt_concepts?.name || "Sin concepto"),
        concept_description: debt.debt_concepts?.description || null,
        installment_number: debt.installment_number,
        plan_name: debt.payment_plans?.name || null,
      }));

      setDebts(formattedDebts);
    } catch (error) {
      console.error("Error loading debt details:", error);
      toast.error("Error al cargar detalles de deudas");
    } finally {
      setIsLoading(false);
    }
  };

  const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);
  const overdueDebts = debts.filter((debt) => isDateOverdue(debt.due_date)).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="destructive">Pendiente</Badge>;
      case "partial":
        return <Badge variant="secondary">Parcial</Badge>;
      case "paid":
        return <Badge variant="default">Pagado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isOverdue = (dueDate: string) => {
    return isDateOverdue(dueDate);
  };

  const openLateFeeDialog = (debt: DebtDetail) => {
    setSelectedDebt(debt);
    setLateFeeAmount("10000");
    setLateFeeDialogOpen(true);
  };

  const handleApplyLateFee = async () => {
    if (!selectedDebt || !studentId) return;
    
    const feeAmount = parseFloat(lateFeeAmount);
    if (isNaN(feeAmount) || feeAmount <= 0) {
      toast.error("Ingrese un monto válido de mora");
      return;
    }

    try {
      setIsApplyingLateFee(true);
      
      const newAmount = selectedDebt.amount + feeAmount;
      const newNotes = selectedDebt.notes 
        ? `${selectedDebt.notes} | Mora aplicada: ${feeAmount.toLocaleString("es-PY")} Gs`
        : `Mora aplicada: ${feeAmount.toLocaleString("es-PY")} Gs`;
      
      const { error } = await supabase
        .from("student_debts")
        .update({ 
          amount: newAmount,
          notes: newNotes
        })
        .eq("id", selectedDebt.id);

      if (error) throw error;

      toast.success(`Mora de ${feeAmount.toLocaleString("es-PY")} Gs aplicada exitosamente`);
      setLateFeeDialogOpen(false);
      setSelectedDebt(null);
      loadDebtDetails();
      onDebtUpdated?.();
    } catch (error) {
      console.error("Error applying late fee:", error);
      toast.error("Error al aplicar mora");
    } finally {
      setIsApplyingLateFee(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Detalle de Deudas</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando detalles...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Student Info */}
            {studentInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información del Estudiante</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nombre</p>
                      <p className="font-medium">
                        {studentInfo.first_name} {studentInfo.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Identificación</p>
                      <p className="font-medium">{studentInfo.identification || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Grado</p>
                      <p className="font-medium">{studentInfo.grade_name || "Sin grado"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conceptos Pendientes</p>
                      <p className="font-medium">{debts.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Deuda Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">
                    {totalDebt.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Gs
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Conceptos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{debts.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Vencidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{overdueDebts}</div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Debts Table */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Conceptos Pendientes de Pago</h3>
              {debts.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No hay deudas pendientes para este estudiante
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Concepto</TableHead>
                        <TableHead className="min-w-[130px]">Fecha Vencimiento</TableHead>
                        <TableHead className="min-w-[100px]">Monto</TableHead>
                        <TableHead className="min-w-[90px]">Estado</TableHead>
                        <TableHead className="min-w-[120px]">Notas</TableHead>
                        <TableHead className="min-w-[100px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {debts.map((debt) => (
                        <TableRow
                          key={debt.id}
                          className={isOverdue(debt.due_date) ? "bg-destructive/5" : ""}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{debt.concept_name}</p>
                              {debt.concept_description && (
                                <p className="text-xs text-muted-foreground">
                                  {debt.concept_description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {formatDatePY(debt.due_date)}
                              {isOverdue(debt.due_date) && (
                                <Badge variant="destructive" className="text-xs">
                                  Vencido
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-warning">
                              {debt.amount.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Gs
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(debt.status)}</TableCell>
                          <TableCell>
                            {debt.notes ? (
                              <p className="text-sm text-muted-foreground max-w-xs truncate">
                                {debt.notes}
                              </p>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isOverdue(debt.due_date) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openLateFeeDialog(debt)}
                                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                Aplicar Mora
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Late Fee Dialog */}
      <AlertDialog open={lateFeeDialogOpen} onOpenChange={setLateFeeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar Mora</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDebt && (
                <div className="space-y-2 mt-2">
                  <p><strong>Concepto:</strong> {selectedDebt.concept_name}</p>
                  <p><strong>Monto Actual:</strong> {selectedDebt.amount.toLocaleString("es-PY")} Gs</p>
                  <p><strong>Fecha de Vencimiento:</strong> {formatDatePY(selectedDebt.due_date)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto de Mora (Gs)</label>
              <Input
                type="number"
                value={lateFeeAmount}
                onChange={(e) => setLateFeeAmount(e.target.value)}
                placeholder="10000"
                min="0"
              />
            </div>
            
            {selectedDebt && lateFeeAmount && parseFloat(lateFeeAmount) > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Nuevo monto total:</strong>{" "}
                  <span className="text-warning font-bold">
                    {(selectedDebt.amount + parseFloat(lateFeeAmount || "0")).toLocaleString("es-PY")} Gs
                  </span>
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplyingLateFee}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApplyLateFee}
              disabled={isApplyingLateFee || !lateFeeAmount || parseFloat(lateFeeAmount) <= 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isApplyingLateFee ? "Aplicando..." : "Aplicar Mora"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
