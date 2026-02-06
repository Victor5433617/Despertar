import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { getTodayDateString } from "@/lib/dateUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Calculator, Eye, DollarSign, ClipboardList } from "lucide-react";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface PaymentPlan {
  id: string;
  student_id: string;
  name: string;
  description: string | null;
  total_amount: number;
  monthly_payment: number;
  number_of_installments: number;
  start_date: string;
  status: string;
  created_at: string;
  student?: Student;
  paid_installments?: number;
  total_paid?: number;
}

interface Installment {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_amount?: number;
}

export const PaymentPlansManagement = () => {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<PaymentPlan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PaymentPlan | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    student_id: "",
    name: "",
    description: "",
    total_amount: "",
    monthly_payment: "",
    number_of_installments: "",
    start_date: getTodayDateString(),
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPlans();
  }, [searchTerm, plans]);

  // Auto-calculate monthly payment when total and installments change
  useEffect(() => {
    const total = parseFloat(formData.total_amount);
    const installments = parseInt(formData.number_of_installments);
    if (total > 0 && installments > 0) {
      const monthly = (total / installments).toFixed(0);
      setFormData(prev => ({ ...prev, monthly_payment: monthly }));
    }
  }, [formData.total_amount, formData.number_of_installments]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("is_active", true)
        .order("last_name");

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Load payment plans
      const { data: plansData, error: plansError } = await supabase
        .from("payment_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (plansError) throw plansError;

      // Load installment info for each plan
      const plansWithInfo = await Promise.all((plansData || []).map(async (plan) => {
        const { data: debtsData } = await supabase
          .from("student_debts")
          .select("status, amount")
          .eq("payment_plan_id", plan.id);

        const paidInstallments = debtsData?.filter(d => d.status === "paid").length || 0;
        const totalPaid = debtsData?.filter(d => d.status === "paid").reduce((sum, d) => sum + Number(d.amount), 0) || 0;

        return {
          ...plan,
          student: studentsData?.find(s => s.id === plan.student_id),
          paid_installments: paidInstallments,
          total_paid: totalPaid,
        };
      }));

      setPlans(plansWithInfo);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setIsLoading(false);
    }
  };

  const filterPlans = () => {
    let filtered = [...plans];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        plan =>
          plan.name.toLowerCase().includes(term) ||
          plan.student?.first_name.toLowerCase().includes(term) ||
          plan.student?.last_name.toLowerCase().includes(term)
      );
    }

    setFilteredPlans(filtered);
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      name: "",
      description: "",
      total_amount: "",
      monthly_payment: "",
      number_of_installments: "",
      start_date: getTodayDateString(),
    });
    setSelectedPlan(null);
  };

  const handleOpenDialog = (plan?: PaymentPlan) => {
    if (plan) {
      setSelectedPlan(plan);
      setFormData({
        student_id: plan.student_id,
        name: plan.name,
        description: plan.description || "",
        total_amount: plan.total_amount.toString(),
        monthly_payment: plan.monthly_payment.toString(),
        number_of_installments: plan.number_of_installments.toString(),
        start_date: plan.start_date,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleViewDetail = async (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    
    // Load installments for this plan
    const { data, error } = await supabase
      .from("student_debts")
      .select("id, installment_number, amount, due_date, status")
      .eq("payment_plan_id", plan.id)
      .order("installment_number");

    if (error) {
      console.error("Error loading installments:", error);
      toast.error("Error al cargar las cuotas");
      return;
    }

    setInstallments(data || []);
    setIsDetailDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.student_id || !formData.name || !formData.total_amount || !formData.number_of_installments) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }

    setIsSubmitting(true);

    try {
      const planData = {
        student_id: formData.student_id,
        name: formData.name,
        description: formData.description || null,
        total_amount: parseFloat(formData.total_amount),
        monthly_payment: parseFloat(formData.monthly_payment),
        number_of_installments: parseInt(formData.number_of_installments),
        start_date: formData.start_date,
      };

      if (selectedPlan) {
        // Just update plan info, don't regenerate installments
        const { error } = await supabase
          .from("payment_plans")
          .update({
            name: planData.name,
            description: planData.description,
          })
          .eq("id", selectedPlan.id);

        if (error) throw error;
        toast.success("Plan de pago actualizado");
      } else {
        // Create new plan
        const { data: newPlan, error: planError } = await supabase
          .from("payment_plans")
          .insert([planData])
          .select()
          .single();

        if (planError) throw planError;

        // Create a generic debt concept for installments if not exists
        let conceptId: string;
        const { data: existingConcept } = await supabase
          .from("debt_concepts")
          .select("id")
          .eq("name", "Cuota Plan de Pago")
          .maybeSingle();

        if (existingConcept) {
          conceptId = existingConcept.id;
        } else {
          const { data: newConcept, error: conceptError } = await supabase
            .from("debt_concepts")
            .insert([{
              name: "Cuota Plan de Pago",
              description: "Cuota generada automáticamente desde plan de pago",
              amount: 0,
              is_recurring: false,
              is_active: true,
            }])
            .select()
            .single();

          if (conceptError) throw conceptError;
          conceptId = newConcept.id;
        }

        // Generate installments as student_debts
        const installmentsToCreate = [];
        const startDate = new Date(formData.start_date + "T00:00:00");
        const monthlyAmount = parseFloat(formData.monthly_payment);
        const numInstallments = parseInt(formData.number_of_installments);

        for (let i = 0; i < numInstallments; i++) {
          const dueDate = addMonths(startDate, i);
          installmentsToCreate.push({
            student_id: formData.student_id,
            concept_id: conceptId,
            payment_plan_id: newPlan.id,
            amount: monthlyAmount,
            due_date: format(dueDate, "yyyy-MM-dd"),
            status: "pending",
            installment_number: i + 1,
            notes: `${planData.name} - Cuota ${i + 1} de ${numInstallments}`,
          });
        }

        const { error: debtsError } = await supabase
          .from("student_debts")
          .insert(installmentsToCreate);

        if (debtsError) throw debtsError;

        toast.success(`Plan creado con ${numInstallments} cuotas`);
      }

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Error al guardar el plan de pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;

    try {
      // Delete will cascade to student_debts due to ON DELETE CASCADE
      const { error } = await supabase
        .from("payment_plans")
        .delete()
        .eq("id", planToDelete.id);

      if (error) throw error;
      toast.success("Plan de pago y cuotas eliminados");
      setIsDeleteDialogOpen(false);
      setPlanToDelete(null);
      loadData();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("Error al eliminar el plan de pago");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Activo</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completado</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInstallmentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Pagado</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500">Parcial</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalDebt = plans.reduce((sum, p) => sum + p.total_amount, 0);
  const totalPaid = plans.reduce((sum, p) => sum + (p.total_paid || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Planes de Pago</h1>
          <p className="text-muted-foreground">
            Gestiona deudas totales con cuotas mensuales
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Plan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Planes
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deuda Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {totalDebt.toLocaleString("es-PY")} Gs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cobrado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {totalPaid.toLocaleString("es-PY")} Gs
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Nombre del Plan</TableHead>
                  <TableHead className="text-right">Deuda Total</TableHead>
                  <TableHead className="text-right">Cuota Mensual</TableHead>
                  <TableHead className="text-center">Progreso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay planes de pago registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        {plan.student
                          ? `${plan.student.last_name}, ${plan.student.first_name}`
                          : "Sin estudiante"}
                      </TableCell>
                      <TableCell>{plan.name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {plan.total_amount.toLocaleString("es-PY")} Gs
                      </TableCell>
                      <TableCell className="text-right">
                        {plan.monthly_payment.toLocaleString("es-PY")} Gs
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">
                          {plan.paid_installments || 0} / {plan.number_of_installments}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(plan.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetail(plan)}
                            title="Ver cuotas"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(plan)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPlanToDelete(plan);
                              setIsDeleteDialogOpen(true);
                            }}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {selectedPlan ? "Editar Plan de Pago" : "Nuevo Plan de Pago"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Estudiante *</Label>
              <Select
                value={formData.student_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, student_id: value })
                }
                disabled={!!selectedPlan}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.last_name}, {student.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nombre del Plan *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Matrícula 2024"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción opcional..."
              />
            </div>

            {!selectedPlan && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label>Deuda Total *</Label>
                    <Input
                      type="number"
                      value={formData.total_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, total_amount: e.target.value })
                      }
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cantidad de Cuotas *</Label>
                    <Input
                      type="number"
                      value={formData.number_of_installments}
                      onChange={(e) =>
                        setFormData({ ...formData, number_of_installments: e.target.value })
                      }
                      placeholder="12"
                      min="1"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calculator className="h-4 w-4" />
                    <span>Cuota mensual calculada:</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {formData.monthly_payment ? parseFloat(formData.monthly_payment).toLocaleString("es-PY") : "0"} Gs
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Inicio (Primera Cuota)</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Guardando..." : selectedPlan ? "Guardar Cambios" : "Crear Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog - View Installments */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Cuotas - {selectedPlan?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedPlan && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Estudiante</p>
                <p className="font-medium">
                  {selectedPlan.student?.last_name}, {selectedPlan.student?.first_name}
                </p>
              </div>
            )}
            <div className="overflow-x-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuota</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">
                        #{inst.installment_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(inst.due_date + "T00:00:00"), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(inst.amount).toLocaleString("es-PY")} Gs
                      </TableCell>
                      <TableCell>{getInstallmentStatusBadge(inst.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plan de pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el plan y todas sus cuotas asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
