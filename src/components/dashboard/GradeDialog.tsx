import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface GradeDialogProps {
  open: boolean;
  onClose: () => void;
  grade?: any;
}

export const GradeDialog = ({ open, onClose, grade }: GradeDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    level: "",
    monthly_fee: "",
    description: "",
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (grade) {
        setFormData({
          name: grade.name || "",
          level: grade.level?.toString() || "",
          monthly_fee: grade.monthly_fee?.toString() || "",
          description: grade.description || "",
          is_active: grade.is_active ?? true,
        });
      } else {
        setFormData({
          name: "",
          level: "",
          monthly_fee: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [open, grade]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate numeric fields
      const level = parseInt(formData.level);
      const monthlyFee = parseFloat(formData.monthly_fee);

      if (isNaN(level) || level < 1) {
        toast.error("El nivel debe ser un número positivo");
        setIsSubmitting(false);
        return;
      }

      if (isNaN(monthlyFee) || monthlyFee < 0) {
        toast.error("La cuota mensual debe ser un número válido");
        setIsSubmitting(false);
        return;
      }

      const dataToSave = {
        name: formData.name,
        level: level,
        monthly_fee: monthlyFee,
        description: formData.description || null,
        is_active: formData.is_active,
      };

      if (grade) {
        // Update existing grade
        const { error } = await supabase
          .from("grades")
          .update(dataToSave)
          .eq("id", grade.id);
        
        if (error) throw error;
        toast.success("Grado actualizado correctamente");
      } else {
        // Create new grade
        const { error } = await supabase.from("grades").insert([dataToSave]);
        
        if (error) throw error;
        toast.success("Grado creado correctamente");
      }
      onClose();
    } catch (error: any) {
      console.error("Error saving grade:", error);
      if (error.code === "23505") {
        toast.error("Ya existe un grado con ese nombre");
      } else {
        toast.error("Error al guardar: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {grade ? "Editar Grado Escolar" : "Nuevo Grado Escolar"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Grado *</Label>
            <Input
              id="name"
              placeholder="Ej: Primer Grado, Segundo Grado"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Nombre descriptivo del grado escolar
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Nivel *</Label>
            <Input
              id="level"
              type="number"
              min="1"
              placeholder="Ej: 1, 2, 3..."
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Número de nivel para ordenamiento (1, 2, 3, etc.)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly_fee">Cuota Mensual ($) *</Label>
            <Input
              id="monthly_fee"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 150.00"
              value={formData.monthly_fee}
              onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Monto de la cuota mensual en dólares
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Descripción adicional del grado (opcional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Grado Activo</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
