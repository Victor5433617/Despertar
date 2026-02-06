import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { formatDatePY } from "@/lib/dateUtils";

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  receipt_number: string | null;
  notes: string | null;
  lateFee: number | null;
  baseAmount: number | null;
}

interface ParentPaymentHistoryProps {
  studentId: string;
}

export const ParentPaymentHistory = ({ studentId }: ParentPaymentHistoryProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [studentId]);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, payment_date, payment_method, receipt_number, notes')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('payment_date', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Parse late fee info from notes
      const parsedPayments = (data || []).map(payment => {
        let lateFee: number | null = null;
        let baseAmount: number | null = null;
        
        if (payment.notes) {
          const moraMatch = payment.notes.match(/\[MORA:(\d+)\]/);
          const baseMatch = payment.notes.match(/\[BASE:(\d+(?:\.\d+)?)\]/);
          
          if (moraMatch) {
            lateFee = parseInt(moraMatch[1], 10);
          }
          if (baseMatch) {
            baseAmount = parseFloat(baseMatch[1]);
          }
        }
        
        return {
          ...payment,
          lateFee,
          baseAmount
        };
      });

      setPayments(parsedPayments);
    } catch (error) {
      console.error('Error cargando pagos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No hay pagos registrados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Historial de Pagos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Fecha</TableHead>
                <TableHead className="min-w-[120px]">Monto</TableHead>
                <TableHead className="min-w-[100px]">Método</TableHead>
                <TableHead className="min-w-[100px]">Recibo</TableHead>
                <TableHead className="min-w-[150px]">Notas</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  {formatDatePY(payment.payment_date)}
                </TableCell>
                <TableCell className="font-medium">
                  {payment.lateFee && payment.baseAmount ? (
                    <div>
                      <span className="text-foreground">
                        {Number(payment.baseAmount).toLocaleString('es-PY')}
                      </span>
                      <span className="text-orange-600 dark:text-orange-400">
                        +{Number(payment.lateFee).toLocaleString('es-PY')}
                      </span>
                      <span className="text-muted-foreground text-sm ml-1">
                        = {Number(payment.amount).toLocaleString('es-PY')} Gs
                      </span>
                    </div>
                  ) : (
                    <span>{Number(payment.amount).toLocaleString('es-PY')} Gs</span>
                  )}
                </TableCell>
                <TableCell>
                  {payment.payment_method ? (
                    <Badge variant="outline">{payment.payment_method}</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {payment.receipt_number || '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {payment.notes?.replace(/\[MORA:\d+\]/g, '').replace(/\[BASE:\d+(?:\.\d+)?\]/g, '').trim() || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
};