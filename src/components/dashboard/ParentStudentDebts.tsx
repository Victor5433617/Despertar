import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { formatDatePY, isDateOverdue } from "@/lib/dateUtils";

interface Debt {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  notes: string | null;
  concept_name: string;
  payment_plan_name: string | null;
  hasLateFee: boolean;
  lateFeeAmount: number | null;
}

interface ParentStudentDebtsProps {
  studentId: string;
}

export const ParentStudentDebts = ({ studentId }: ParentStudentDebtsProps) => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDebts();
  }, [studentId]);

  const loadDebts = async () => {
    try {
      const { data, error } = await supabase
        .from('student_debts')
        .select(`
          id,
          amount,
          due_date,
          status,
          notes,
          debt_concepts (name),
          payment_plans (name)
        `)
        .eq('student_id', studentId)
        .order('due_date', { ascending: false });

      if (error) throw error;

      const formattedDebts = data?.map(debt => {
        // Parse late fee from notes if present
        let hasLateFee = false;
        let lateFeeAmount: number | null = null;
        
        if (debt.notes) {
          const lateFeeMatch = debt.notes.match(/Mora aplicada: ([\d,.]+) Gs/);
          if (lateFeeMatch) {
            hasLateFee = true;
            lateFeeAmount = parseFloat(lateFeeMatch[1].replace(/\./g, '').replace(',', '.'));
          }
        }

        return {
          id: debt.id,
          amount: Number(debt.amount),
          due_date: debt.due_date,
          status: debt.status,
          notes: debt.notes,
          concept_name: debt.debt_concepts?.name || 'Sin concepto',
          payment_plan_name: debt.payment_plans?.name || null,
          hasLateFee,
          lateFeeAmount
        };
      }) || [];

      setDebts(formattedDebts);
    } catch (error) {
      console.error('Error cargando deudas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white">
          Pagado
        </Badge>
      );
    }
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "destructive",
      partial: "secondary"
    };
    const labels: Record<string, string> = {
      pending: "Pendiente",
      partial: "Parcial"
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const isOverdue = (dueDate: string) => {
    return isDateOverdue(dueDate);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deudas Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingDebts = debts.filter(d => d.status !== 'paid');
  const paidDebts = debts.filter(d => d.status === 'paid');

  if (debts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado de Cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No hay registros
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRowClass = (debt: Debt) => {
    if (debt.status === 'paid') return 'bg-green-50 dark:bg-green-950/20';
    if (isOverdue(debt.due_date)) return 'bg-destructive/10';
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de Cuenta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingDebts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Deudas Pendientes ({pendingDebts.length})
            </h3>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Concepto</TableHead>
                    <TableHead className="min-w-[120px]">Monto</TableHead>
                    <TableHead className="min-w-[120px]">Vencimiento</TableHead>
                    <TableHead className="min-w-[100px]">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDebts.map((debt) => (
                    <TableRow key={debt.id} className={getRowClass(debt)}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {isOverdue(debt.due_date) && (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                            {debt.concept_name}
                          </div>
                          {debt.payment_plan_name && (
                            <span className="text-xs text-muted-foreground">
                              Plan: {debt.payment_plan_name}
                            </span>
                          )}
                          {debt.hasLateFee && (
                            <Badge variant="destructive" className="w-fit text-xs">
                              Mora por atraso: {debt.lateFeeAmount?.toLocaleString('es-PY')} Gs
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{debt.amount.toLocaleString('es-PY')} Gs</TableCell>
                      <TableCell>
                        {formatDatePY(debt.due_date)}
                      </TableCell>
                      <TableCell>{getStatusBadge(debt.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {paidDebts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Cuotas Pagadas ({paidDebts.length})
            </h3>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Concepto</TableHead>
                    <TableHead className="min-w-[120px]">Monto Original</TableHead>
                    <TableHead className="min-w-[120px]">Vencimiento</TableHead>
                    <TableHead className="min-w-[100px]">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidDebts.map((debt) => (
                    <TableRow key={debt.id} className={getRowClass(debt)}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            {debt.concept_name}
                          </div>
                          {debt.payment_plan_name && (
                            <span className="text-xs text-muted-foreground">
                              Plan: {debt.payment_plan_name}
                            </span>
                          )}
                          {debt.hasLateFee && (
                            <Badge variant="outline" className="w-fit text-xs border-amber-500 text-amber-600">
                              Incluía mora: {debt.lateFeeAmount?.toLocaleString('es-PY')} Gs
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-green-700 dark:text-green-400">
                        {debt.amount.toLocaleString('es-PY')} Gs
                      </TableCell>
                      <TableCell>
                        {formatDatePY(debt.due_date)}
                      </TableCell>
                      <TableCell>{getStatusBadge(debt.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {pendingDebts.length === 0 && (
          <p className="text-center text-green-600 font-medium py-4">
            ✅ No hay deudas pendientes
          </p>
        )}
      </CardContent>
    </Card>
  );
};