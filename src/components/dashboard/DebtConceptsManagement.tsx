import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { DebtConceptDialog } from "./DebtConceptDialog";
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

interface DebtConcept {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  is_recurring: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const DebtConceptsManagement = () => {
  const [concepts, setConcepts] = useState<DebtConcept[]>([]);
  const [filteredConcepts, setFilteredConcepts] = useState<DebtConcept[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<DebtConcept | undefined>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [conceptToDelete, setConceptToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConcepts();
  }, []);

  useEffect(() => {
    filterConcepts();
  }, [searchTerm, concepts]);

  const loadConcepts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("debt_concepts")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setConcepts(data || []);
    } catch (error: any) {
      toast({
        title: "Error al cargar conceptos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterConcepts = () => {
    const filtered = concepts.filter(
      (concept) =>
        concept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        concept.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredConcepts(filtered);
  };

  const handleDelete = async () => {
    if (!conceptToDelete) return;

    try {
      const { error } = await supabase
        .from("debt_concepts")
        .delete()
        .eq("id", conceptToDelete);

      if (error) throw error;

      toast({
        title: "Concepto eliminado",
        description: "El concepto se eliminó correctamente",
      });
      
      loadConcepts();
    } catch (error: any) {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setConceptToDelete(null);
    }
  };

  const handleEdit = (concept: DebtConcept) => {
    setSelectedConcept(concept);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedConcept(undefined);
    loadConcepts();
  };

  const openDeleteDialog = (conceptId: string) => {
    setConceptToDelete(conceptId);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Conceptos de Deuda</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Gestione los tipos de cobros del colegio</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Agregar Concepto
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Nombre</TableHead>
              <TableHead className="min-w-[200px]">Descripción</TableHead>
              <TableHead className="text-right min-w-[120px]">Monto</TableHead>
              <TableHead className="min-w-[120px]">Tipo</TableHead>
              <TableHead className="min-w-[100px]">Estado</TableHead>
              <TableHead className="text-right min-w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Cargando conceptos...
                </TableCell>
              </TableRow>
            ) : filteredConcepts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No se encontraron conceptos" : "No hay conceptos registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filteredConcepts.map((concept) => (
                <TableRow key={concept.id}>
                  <TableCell className="font-medium">{concept.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {concept.description || "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {concept.amount.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Gs
                  </TableCell>
                  <TableCell>
                    <Badge variant={concept.is_recurring ? "default" : "secondary"}>
                      {concept.is_recurring ? "Recurrente" : "Único"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={concept.is_active ? "default" : "secondary"}>
                      {concept.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(concept)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(concept.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DebtConceptDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        concept={selectedConcept}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El concepto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
