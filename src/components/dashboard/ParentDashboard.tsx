import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Receipt, DollarSign, AlertCircle } from "lucide-react";
import { ParentStudentDebts } from "./ParentStudentDebts";
import { ParentPaymentHistory } from "./ParentPaymentHistory";

interface StudentInfo {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
}

export const ParentDashboard = () => {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [totalDebts, setTotalDebts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);

  useEffect(() => {
    loadParentData();
    setupRealtimeSubscription();
  }, []);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('parent-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_debts'
        },
        () => {
          loadParentData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          loadParentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadParentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener estudiantes del padre
      const { data: guardianships, error: guardError } = await supabase
        .from('student_guardians')
        .select(`
          student_id,
          students (
            id,
            first_name,
            last_name,
            grade
          )
        `)
        .eq('guardian_user_id', user.id);

      if (guardError) throw guardError;

      const studentsData = guardianships?.map(g => ({
        id: g.students.id,
        first_name: g.students.first_name,
        last_name: g.students.last_name,
        grade: g.students.grade
      })) || [];

      setStudents(studentsData);

      if (studentsData.length > 0) {
        const studentIds = studentsData.map(s => s.id);

        // Calcular deudas totales
        const { data: debts, error: debtsError } = await supabase
          .from('student_debts')
          .select('amount, due_date, status')
          .in('student_id', studentIds)
          .in('status', ['pending', 'partial']);

        if (debtsError) throw debtsError;

        const total = debts?.reduce((sum, debt) => sum + Number(debt.amount), 0) || 0;

        setTotalDebts(total);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Portal de Padres</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No tienes estudiantes asignados. Por favor contacta con el administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Portal de Padres</h1>
      
      {/* Tarjetas de resumen */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">
              {students.length === 1 ? 'hijo registrado' : 'hijos registrados'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDebts.toLocaleString('es-PY')} Gs</div>
            <p className="text-xs text-muted-foreground">
              Deudas pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de estudiantes */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Hijos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {students.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full p-4 text-left rounded-lg border transition-colors hover:bg-accent ${
                  selectedStudent?.id === student.id ? 'bg-accent border-primary' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{student.first_name} {student.last_name}</p>
                    {student.grade && (
                      <p className="text-sm text-muted-foreground">{student.grade}</p>
                    )}
                  </div>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detalles del estudiante seleccionado */}
      {selectedStudent && (
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-semibold">
            Información de {selectedStudent.first_name} {selectedStudent.last_name}
          </h2>
          <ParentStudentDebts studentId={selectedStudent.id} />
          <ParentPaymentHistory studentId={selectedStudent.id} />
        </div>
      )}
    </div>
  );
};