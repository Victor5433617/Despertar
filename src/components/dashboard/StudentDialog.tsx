import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getTodayDateString } from "@/lib/dateUtils";

interface StudentDialogProps {
  open: boolean;
  onClose: () => void;
  student?: any;
}

export const StudentDialog = ({ open, onClose, student }: StudentDialogProps) => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    identification: "",
    date_of_birth: "",
    grade: "",
    enrollment_date: getTodayDateString(),
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    address: "",
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableConcepts, setAvailableConcepts] = useState<any[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      if (student) {
        setFormData({
          first_name: student.first_name || "",
          last_name: student.last_name || "",
          identification: student.identification || "",
          date_of_birth: student.date_of_birth || "",
          grade: student.grade || "",
          enrollment_date: student.enrollment_date || "",
          guardian_name: student.guardian_name || "",
          guardian_phone: student.guardian_phone || "",
          guardian_email: student.guardian_email || "",
          address: student.address || "",
          is_active: student.is_active,
        });
      } else {
        setFormData({
          first_name: "",
          last_name: "",
          identification: "",
          date_of_birth: "",
          grade: "",
          enrollment_date: getTodayDateString(),
          guardian_name: "",
          guardian_phone: "",
          guardian_email: "",
          address: "",
          is_active: true,
        });
        setSelectedConcepts([]);
      }
      loadConcepts();
    }
  }, [open, student]);

  const loadConcepts = async () => {
    try {
      const { data, error } = await supabase
        .from("debt_concepts")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      setAvailableConcepts(data || []);
    } catch (error: any) {
      console.error("Error loading concepts:", error);
      toast.error("Error al cargar conceptos");
    }
  };

  const toggleConcept = (conceptId: string) => {
    setSelectedConcepts(prev => 
      prev.includes(conceptId) 
        ? prev.filter(id => id !== conceptId)
        : [...prev, conceptId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dataToSave = {
        ...formData,
        grade: formData.grade || null,
        identification: formData.identification || null,
        date_of_birth: formData.date_of_birth || null,
        guardian_name: formData.guardian_name || null,
        guardian_phone: formData.guardian_phone || null,
        guardian_email: formData.guardian_email || null,
        address: formData.address || null,
      };

      if (student) {
        const { error } = await supabase
          .from("students")
          .update(dataToSave)
          .eq("id", student.id);
        if (error) throw error;
        toast.success("Estudiante actualizado");
      } else {
        // Create student
        const { data: newStudent, error: studentError } = await supabase
          .from("students")
          .insert([dataToSave])
          .select()
          .single();
        
        if (studentError) throw studentError;

        // Create debts for selected concepts only
        if (selectedConcepts.length > 0) {
          const selectedConceptsData = availableConcepts.filter(c => 
            selectedConcepts.includes(c.id)
          );

          const debts = selectedConceptsData.map(concept => {
            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
            const year = nextMonth.getFullYear();
            const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
            const day = String(nextMonth.getDate()).padStart(2, '0');
            return {
              student_id: newStudent.id,
              concept_id: concept.id,
              amount: concept.amount,
              due_date: `${year}-${month}-${day}`,
              status: 'pending',
              notes: `Deuda asignada al crear estudiante - ${concept.name}`,
            };
          });

          const { error: debtsError } = await supabase
            .from("student_debts")
            .insert(debts);

          if (debtsError) throw debtsError;
        }

        toast.success(`Estudiante creado con ${selectedConcepts.length} concepto(s) asignado(s)`);
      }
      onClose();
    } catch (error: any) {
      console.error("Error saving student:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {student ? "Editar Estudiante" : "Nuevo Estudiante"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="identification">Identificación</Label>
              <Input
                id="identification"
                value={formData.identification}
                onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Fecha de Nacimiento</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Grado/Nivel</Label>
              <Input
                id="grade"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                placeholder="Ej: 1er Grado, Primaria, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enrollment_date">Fecha de Ingreso *</Label>
              <Input
                id="enrollment_date"
                type="date"
                value={formData.enrollment_date}
                onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardian_name">Nombre del Tutor</Label>
            <Input
              id="guardian_name"
              value={formData.guardian_name}
              onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="guardian_phone">Teléfono del Tutor</Label>
              <Input
                id="guardian_phone"
                value={formData.guardian_phone}
                onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardian_email">Email del Tutor</Label>
              <Input
                id="guardian_email"
                type="email"
                value={formData.guardian_email}
                onChange={(e) => setFormData({ ...formData, guardian_email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Estudiante Activo</Label>
          </div>

          {!student && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">Conceptos de Pago</Label>
              <p className="text-sm text-muted-foreground">
                Selecciona los conceptos que deseas asignar al estudiante
              </p>
              {availableConcepts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No hay conceptos activos disponibles
                </p>
              ) : (
                <div className="grid gap-3 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                  {availableConcepts.map((concept) => (
                    <div key={concept.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={concept.id}
                        checked={selectedConcepts.includes(concept.id)}
                        onCheckedChange={() => toggleConcept(concept.id)}
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor={concept.id} 
                          className="font-medium cursor-pointer"
                        >
                          {concept.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Monto: {Number(concept.amount).toLocaleString('es-PY')} Gs.
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
              )}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
