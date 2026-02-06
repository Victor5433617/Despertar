import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GradeDialog } from "./GradeDialog";

interface Grade {
  id: string;
  name: string;
  level: number;
  monthly_fee: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const GradesManagement = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [filteredGrades, setFilteredGrades] = useState<Grade[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGrades();
  }, []);

  useEffect(() => {
    filterGrades();
  }, [searchTerm, grades]);

  const loadGrades = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .order("level", { ascending: true });

      if (error) throw error;
      setGrades(data || []);
    } catch (error) {
      console.error("Error loading grades:", error);
      toast.error("Error al cargar grados escolares");
    } finally {
      setIsLoading(false);
    }
  };

  const filterGrades = () => {
    if (!searchTerm) {
      setFilteredGrades(grades);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = grades.filter(
      (grade) =>
        grade.name.toLowerCase().includes(term) ||
        grade.description?.toLowerCase().includes(term) ||
        grade.level.toString().includes(term)
    );
    setFilteredGrades(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este grado? Esto puede afectar a los estudiantes asociados.")) return;

    try {
      const { error } = await supabase.from("grades").delete().eq("id", id);
      if (error) throw error;
      toast.success("Grado eliminado correctamente");
      loadGrades();
    } catch (error: any) {
      console.error("Error deleting grade:", error);
      if (error.code === "23503") {
        toast.error("No se puede eliminar: hay estudiantes asociados a este grado");
      } else {
        toast.error("Error al eliminar grado");
      }
    }
  };

  const handleEdit = (grade: Grade) => {
    setSelectedGrade(grade);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedGrade(null);
    loadGrades();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Grados</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Administre los grados escolares y sus cuotas mensuales</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Grado
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grados Escolares</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, nivel o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Cargando...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Nivel</TableHead>
                    <TableHead className="min-w-[150px]">Nombre</TableHead>
                    <TableHead className="min-w-[130px]">Cuota Mensual</TableHead>
                    <TableHead className="min-w-[200px]">Descripción</TableHead>
                    <TableHead className="min-w-[100px]">Estado</TableHead>
                    <TableHead className="min-w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredGrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {searchTerm ? "No se encontraron grados" : "No hay grados registrados. Cree el primero."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGrades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell>
                        <Badge variant="outline">{grade.level}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{grade.name}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-success">
                          ${Number(grade.monthly_fee).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {grade.description || <span className="text-muted-foreground">Sin descripción</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={grade.is_active ? "default" : "secondary"}>
                          {grade.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(grade)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(grade.id)}
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
          )}
        </CardContent>
      </Card>

      <GradeDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        grade={selectedGrade}
      />
    </div>
  );
};
