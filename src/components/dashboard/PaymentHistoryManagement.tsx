import { useEffect, useState, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import { Search, History, XCircle, Printer, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatDatePY, getTodayDateString } from "@/lib/dateUtils";
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

const PAGE_SIZE = 25;
const SEARCH_FETCH_BATCH_SIZE = 1000;

const buildPaymentFromRow = (payment: any): Payment => ({
  id: payment.id,
  student_id: payment.student_id,
  student_name: `${payment.students?.first_name ?? ""} ${payment.students?.last_name ?? ""}`.trim() || "Sin nombre",
  student_identification: payment.students?.identification ?? null,
  amount: Number(payment.amount),
  payment_date: payment.payment_date,
  payment_method: payment.payment_method,
  receipt_number: payment.receipt_number,
  notes: payment.notes,
  debt_id: payment.debt_id,
  status: payment.status || "active",
});

const matchesPaymentSearch = (payment: Payment, term: string) => {
  const normalizedTerm = term.trim().toLowerCase();

  if (!normalizedTerm) {
    return true;
  }

  return (
    payment.student_name.toLowerCase().includes(normalizedTerm) ||
    payment.student_identification?.toLowerCase().includes(normalizedTerm) ||
    payment.receipt_number?.toLowerCase().includes(normalizedTerm)
  );
};

export const PaymentHistoryManagement = () => {
  const [activePayments, setActivePayments] = useState<Payment[]>([]);
  const [cancelledPayments, setCancelledPayments] = useState<Payment[]>([]);
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [cancelledSearchTerm, setCancelledSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Date range filters - default last 30 days
  const today = getTodayDateString();
  const thirtyDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  })();

  // Inputs (lo que el usuario escribe)
  const [activeStartInput, setActiveStartInput] = useState(thirtyDaysAgo);
  const [activeEndInput, setActiveEndInput] = useState(today);
  const [cancelledStartInput, setCancelledStartInput] = useState(thirtyDaysAgo);
  const [cancelledEndInput, setCancelledEndInput] = useState(today);

  // Aplicados (los que disparan la query)
  const [activeStartDate, setActiveStartDate] = useState(thirtyDaysAgo);
  const [activeEndDate, setActiveEndDate] = useState(today);
  const [cancelledStartDate, setCancelledStartDate] = useState(thirtyDaysAgo);
  const [cancelledEndDate, setCancelledEndDate] = useState(today);

  // Pagination
  const [activePage, setActivePage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);

  const activeSearchQuery = activeSearchTerm.trim();
  const cancelledSearchQuery = cancelledSearchTerm.trim();

  useEffect(() => {
    void loadPayments();
  }, [
    activeStartDate,
    activeEndDate,
    cancelledStartDate,
    cancelledEndDate,
  ]);

  useEffect(() => {
    setActivePage(1);
  }, [activeSearchQuery]);

  useEffect(() => {
    setCancelledPage(1);
  }, [cancelledSearchQuery]);

  const handleSearchActive = () => {
    if (activeStartInput > activeEndInput) {
      toast.error("La fecha 'Desde' debe ser anterior a 'Hasta'");
      return;
    }
    setActivePage(1);
    setActiveStartDate(activeStartInput);
    setActiveEndDate(activeEndInput);
  };

  const handleSearchCancelled = () => {
    if (cancelledStartInput > cancelledEndInput) {
      toast.error("La fecha 'Desde' debe ser anterior a 'Hasta'");
      return;
    }
    setCancelledPage(1);
    setCancelledStartDate(cancelledStartInput);
    setCancelledEndDate(cancelledEndInput);
  };

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
      const allRows: any[] = [];
      let from = 0;

      while (true) {
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
          .order("payment_date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, from + SEARCH_FETCH_BATCH_SIZE - 1);

        if (error) throw error;

        allRows.push(...(data || []));

        if (!data || data.length < SEARCH_FETCH_BATCH_SIZE) {
          break;
        }

        from += SEARCH_FETCH_BATCH_SIZE;
      }

      const paymentsList: Payment[] = allRows.map(buildPaymentFromRow);

      setActivePayments(paymentsList);
    } catch (error) {
      console.error("Error loading active payments:", error);
      toast.error("Error al cargar pagos activos");
    }
  };

  const loadCancelledPayments = async () => {
    try {
      const allRows: any[] = [];
      let from = 0;

      while (true) {
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
          .range(from, from + SEARCH_FETCH_BATCH_SIZE - 1);

        if (error) throw error;

        allRows.push(...(data || []));

        if (!data || data.length < SEARCH_FETCH_BATCH_SIZE) {
          break;
        }

        from += SEARCH_FETCH_BATCH_SIZE;
      }

      const paymentsList: Payment[] = allRows.map(buildPaymentFromRow);

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

  // Filter by name
  const filteredActivePayments = useMemo(
    () =>
      activeSearchQuery
        ? activePayments.filter((p) => matchesPaymentSearch(p, activeSearchQuery))
        : activePayments.filter((payment) => {
            const withinRange = payment.payment_date >= activeStartDate && payment.payment_date <= activeEndDate;
            return withinRange;
          }),
    [activePayments, activeSearchQuery, activeStartDate, activeEndDate]
  );

  const filteredCancelledPayments = useMemo(
    () =>
      cancelledSearchQuery
        ? cancelledPayments.filter((p) => matchesPaymentSearch(p, cancelledSearchQuery))
        : cancelledPayments.filter((payment) => {
            const withinRange = payment.payment_date >= cancelledStartDate && payment.payment_date <= cancelledEndDate;
            return withinRange;
          }),
    [cancelledPayments, cancelledSearchQuery, cancelledStartDate, cancelledEndDate]
  );

  // Paginated slices
  const activeTotalPages = Math.max(1, Math.ceil(filteredActivePayments.length / PAGE_SIZE));
  const cancelledTotalPages = Math.max(1, Math.ceil(filteredCancelledPayments.length / PAGE_SIZE));
  const paginatedActive = filteredActivePayments.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE
  );
  const paginatedCancelled = filteredCancelledPayments.slice(
    (cancelledPage - 1) * PAGE_SIZE,
    cancelledPage * PAGE_SIZE
  );

  const totalActive = filteredActivePayments.reduce((sum, p) => sum + p.amount, 0);
  const totalCancelled = filteredCancelledPayments.reduce((sum, p) => sum + p.amount, 0);

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

  const renderPagination = (
    page: number,
    totalPages: number,
    setPage: (n: number) => void,
    totalItems: number
  ) => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <p className="text-sm text-muted-foreground">
        Mostrando {totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-
        {Math.min(page * PAGE_SIZE, totalItems)} de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <span className="text-sm">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

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
              Pagos Activos (rango)
            </CardTitle>
            <Receipt className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredActivePayments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {totalActive.toLocaleString("es-PY")} Gs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagos Anulados (rango)
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCancelledPayments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {totalCancelled.toLocaleString("es-PY")} Gs.
            </p>
          </CardContent>
        </Card>
      </div>

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
              <div className="space-y-4">
                <div>
                  <CardTitle>Pagos Activos</CardTitle>
                  <CardDescription>
                    Pagos registrados en el rango de fechas seleccionado
                  </CardDescription>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                  <div className="space-y-1">
                    <Label htmlFor="active-start">Desde</Label>
                    <Input
                      id="active-start"
                      type="date"
                      value={activeStartInput}
                      onChange={(e) => setActiveStartInput(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="active-end">Hasta</Label>
                    <Input
                      id="active-end"
                      type="date"
                      value={activeEndInput}
                      onChange={(e) => setActiveEndInput(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSearchActive} className="w-full lg:w-auto">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="active-search">Filtrar por nombre</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="active-search"
                        placeholder="Nombre del estudiante..."
                        value={activeSearchTerm}
                        onChange={(e) => setActiveSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {paginatedActive.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron pagos en este rango
                </div>
              ) : (
                <>
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
                        {paginatedActive.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDatePY(payment.payment_date)}</TableCell>
                            <TableCell className="font-medium">{payment.student_name}</TableCell>
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
                              {payment.notes || <span className="text-muted-foreground">-</span>}
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
                  {renderPagination(
                    activePage,
                    activeTotalPages,
                    setActivePage,
                    filteredActivePayments.length
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cancelled Payments Tab */}
        <TabsContent value="cancelled">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    Pagos Anulados
                  </CardTitle>
                  <CardDescription>
                    Pagos anulados en el rango de fechas seleccionado
                  </CardDescription>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                  <div className="space-y-1">
                    <Label htmlFor="cancelled-start">Desde</Label>
                    <Input
                      id="cancelled-start"
                      type="date"
                      value={cancelledStartInput}
                      onChange={(e) => setCancelledStartInput(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cancelled-end">Hasta</Label>
                    <Input
                      id="cancelled-end"
                      type="date"
                      value={cancelledEndInput}
                      onChange={(e) => setCancelledEndInput(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSearchCancelled} className="w-full lg:w-auto">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="cancelled-search">Filtrar por nombre</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="cancelled-search"
                        placeholder="Nombre del estudiante..."
                        value={cancelledSearchTerm}
                        onChange={(e) => setCancelledSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {paginatedCancelled.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron pagos anulados en este rango
                </div>
              ) : (
                <>
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
                        {paginatedCancelled.map((payment) => (
                          <TableRow key={payment.id} className="opacity-60">
                            <TableCell>{formatDatePY(payment.payment_date)}</TableCell>
                            <TableCell className="font-medium">{payment.student_name}</TableCell>
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
                              {payment.notes || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {renderPagination(
                    cancelledPage,
                    cancelledTotalPages,
                    setCancelledPage,
                    filteredCancelledPayments.length
                  )}
                </>
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
