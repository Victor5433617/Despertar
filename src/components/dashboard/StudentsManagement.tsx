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
import { Plus, Search, Edit, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { StudentDialog } from "./StudentDialog";
import { GuardianManagement } from "./GuardianManagement";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  identification: string | null;
  enrollment_date: string;
  is_active: boolean;
  guardian_name: string | null;
  guardian_phone: string | null;
  grade: string | null;
}

export const StudentsManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuardiansDialogOpen, setIsGuardiansDialogOpen] = useState(false);
  const [studentForGuardians, setStudentForGuardians] = useState<Student | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, students]);

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error loading students:", error);
      toast.error("Error al cargar estudiantes");
    } finally {
      setIsLoading(false);
    }
  };

  const filterStudents = () => {
    if (!searchTerm) {
      setFilteredStudents(students);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = students.filter(
      (student) =>
        student.first_name.toLowerCase().includes(term) ||
        student.last_name.toLowerCase().includes(term) ||
        student.identification?.toLowerCase().includes(term) ||
        student.guardian_name?.toLowerCase().includes(term)
    );
    setFilteredStudents(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este estudiante?")) return;

    try {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
      toast.success("Estudiante eliminado");
      loadStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Error al eliminar estudiante");
    }
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedStudent(null);
    loadStudents();
  };

  const handleManageGuardians = (student: Student) => {
    setStudentForGuardians(student);
    setIsGuardiansDialogOpen(true);
  };

  const handleGuardiansDialogClose = () => {
    setIsGuardiansDialogOpen(false);
    setStudentForGuardians(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Estudiantes</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Administre la información de los estudiantes</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Estudiante
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Estudiantes</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, identificación o tutor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Nombre</TableHead>
                  <TableHead className="min-w-[120px]">Identificación</TableHead>
                  <TableHead className="min-w-[100px]">Grado</TableHead>
                  <TableHead className="min-w-[120px]">Tutor</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="text-right min-w-[180px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No se encontraron estudiantes
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.first_name} {student.last_name}
                      </TableCell>
                       <TableCell>{student.identification || "N/A"}</TableCell>
                       <TableCell>{student.grade || "Sin asignar"}</TableCell>
                       <TableCell>{student.guardian_name || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={student.is_active ? "default" : "secondary"}>
                          {student.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                       <TableCell>
                         <div className="flex gap-2 justify-end">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleManageGuardians(student)}
                             title="Gestionar Tutores"
                           >
                             <Users className="h-4 w-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleEdit(student)}
                             title="Editar"
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleDelete(student.id)}
                             title="Eliminar"
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

      <StudentDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        student={selectedStudent}
      />

      <GuardianManagement
        open={isGuardiansDialogOpen}
        onClose={handleGuardiansDialogClose}
        studentId={studentForGuardians?.id || ''}
        studentName={studentForGuardians ? `${studentForGuardians.first_name} ${studentForGuardians.last_name}` : ''}
      />
    </div>
  );
};
