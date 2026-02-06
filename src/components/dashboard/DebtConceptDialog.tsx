import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

interface DebtConceptDialogProps {
  open: boolean;
  onClose: () => void;
  concept?: any;
}

export const DebtConceptDialog = ({ open, onClose, concept }: DebtConceptDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    is_recurring: false,
    is_active: true,
  });

  useEffect(() => {
    if (concept) {
      setFormData({
        name: concept.name || "",
        description: concept.description || "",
        amount: concept.amount?.toString() || "",
        is_recurring: concept.is_recurring || false,
        is_active: concept.is_active ?? true,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        amount: "",
        is_recurring: false,
        is_active: true,
      });
    }
  }, [concept, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Error de validación",
          description: "El monto debe ser un número mayor a 0",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (!formData.name.trim()) {
        toast({
          title: "Error de validación",
          description: "El nombre es requerido",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const dataToSave = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        amount,
        is_recurring: formData.is_recurring,
        is_active: formData.is_active,
      };

      if (concept) {
        const { error } = await supabase
          .from("debt_concepts")
          .update(dataToSave)
          .eq("id", concept.id);

        if (error) throw error;

        toast({
          title: "Concepto actualizado",
          description: "El concepto se actualizó correctamente",
        });
      } else {
        const { error } = await supabase
          .from("debt_concepts")
          .insert([dataToSave]);

        if (error) throw error;

        toast({
          title: "Concepto creado",
          description: "El concepto se creó correctamente",
        });
      }

      onClose();
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {concept ? "Editar Concepto" : "Nuevo Concepto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Mensualidad, Matrícula, Uniforme"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del concepto..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Monto *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_recurring">Recurrente (mensual)</Label>
            <Switch
              id="is_recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_recurring: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Activo</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
