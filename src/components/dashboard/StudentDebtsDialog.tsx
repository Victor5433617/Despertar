import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatDatePY } from "@/lib/dateUtils";

interface StudentDebtsDialogProps {
  open: boolean;
  onClose: () => void;
  student: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface DebtConcept {
  id: string;
  name: string;
  description: string | null;
  amount: number;
}

interface StudentDebt {
  id: string;
  concept_id: string;
  amount: number;
  due_date: string;
  status: string;
  concept_name: string;
}

export const StudentDebtsDialog = ({ open, onClose, student }: StudentDebtsDialogProps) => {
  const [availableConcepts, setAvailableConcepts] = useState<DebtConcept[]>([]);
  const [currentDebts, setCurrentDebts] = useState<StudentDebt[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && student) {
      loadData();
    }
  }, [open, student]);

  const loadData = async () => {
    if (!student) return;
    
    setIsLoading(true);
    try {
      // Load available concepts
      const { data: concepts, error: conceptsError } = await supabase
        .from("debt_concepts")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (conceptsError) throw conceptsError;
      setAvailableConcepts(concepts || []);

      // Load current student debts
      const { data: debts, error: debtsError } = await supabase
        .from("student_debts")
        .select(`
          id,
          concept_id,
          amount,
          due_date,
          status,
          debt_concepts:concept_id (name)
        `)
        .eq("student_id", student.id)
        .in("status", ["pending", "partial"]);
      
      if (debtsError) throw debtsError;
      
      const formattedDebts = (debts || []).map((debt: any) => ({
        id: debt.id,
        concept_id: debt.concept_id,
        amount: debt.amount,
        due_date: debt.due_date,
        status: debt.status,
        concept_name: debt.debt_concepts?.name || "Sin nombre",
      }));
      
      setCurrentDebts(formattedDebts);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleConcept = (conceptId: string) => {
    setSelectedConcepts(prev => 
      prev.includes(conceptId) 
        ? prev.filter(id => id !== conceptId)
        : [...prev, conceptId]
    );
  };

  const handleAddConcepts = async () => {
    if (!student || selectedConcepts.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const selectedConceptsData = availableConcepts.filter(c => 
        selectedConcepts.includes(c.id)
      );

      const newDebts = selectedConceptsData.map(concept => ({
        student_id: student.id,
        concept_id: concept.id,
        amount: concept.amount,
        due_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        status: 'pending',
        notes: `Concepto agregado - ${concept.name}`,
      }));

      const { error } = await supabase
        .from("student_debts")
        .insert(newDebts);

      if (error) throw error;
      
      toast.success(`${selectedConcepts.length} concepto(s) agregado(s) exitosamente`);
      setSelectedConcepts([]);
      loadData();
    } catch (error: any) {
      console.error("Error adding concepts:", error);
      toast.error("Error al agregar conceptos: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDebt = async (debtId: string) => {
    if (!confirm("¿Está seguro de eliminar este concepto de deuda?")) return;
    
    try {
      const { error } = await supabase
        .from("student_debts")
        .delete()
        .eq("id", debtId);

      if (error) throw error;
      
      toast.success("Concepto eliminado exitosamente");
      loadData();
    } catch (error: any) {
      console.error("Error removing debt:", error);
      toast.error("Error al eliminar concepto: " + error.message);
    }
  };

  // Filter out concepts that already exist for the student
  const availableToAdd = availableConcepts.filter(
    concept => !currentDebts.some(debt => debt.concept_id === concept.id)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Gestionar Conceptos de Deuda - {student?.first_name} {student?.last_name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Debts */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Conceptos Actuales</h3>
              {currentDebts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center border rounded-md">
                  No hay conceptos de deuda asignados
                </p>
              ) : (
                <div className="space-y-2 border rounded-md p-3">
                  {currentDebts.map((debt) => (
                    <div key={debt.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                      <div className="flex-1">
                        <p className="font-medium">{debt.concept_name}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          <span>Monto: {debt.amount.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Gs</span>
                          <span>Vence: {formatDatePY(debt.due_date)}</span>
                          <Badge variant={debt.status === "pending" ? "destructive" : "secondary"}>
                            {debt.status === "pending" ? "Pendiente" : "Parcial"}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDebt(debt.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Concepts */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-lg font-semibold">Agregar Nuevos Conceptos</h3>
              {availableToAdd.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center border rounded-md">
                  No hay conceptos disponibles para agregar
                </p>
              ) : (
                <>
                  <div className="grid gap-3 max-h-[300px] overflow-y-auto p-2 border rounded-md">
                    {availableToAdd.map((concept) => (
                      <div key={concept.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md">
                        <Checkbox
                          id={`add-${concept.id}`}
                          checked={selectedConcepts.includes(concept.id)}
                          onCheckedChange={() => toggleConcept(concept.id)}
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={`add-${concept.id}`} 
                            className="font-medium cursor-pointer"
                          >
                            {concept.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Monto: {concept.amount.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Gs
                          </p>
                          {concept.description && (
                            <p className="text-xs text-muted-foreground">
                              {concept.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedConcepts.length > 0 && (
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleAddConcepts}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Agregando..." : `Agregar ${selectedConcepts.length} Concepto(s)`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
