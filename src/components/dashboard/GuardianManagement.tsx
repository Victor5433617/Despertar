import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { UserPlus, Trash2, Check, ChevronsUpDown, Search } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface GuardianManagementProps {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
}

interface Guardian {
  id: string;
  guardian_email: string;
  guardian_name: string | null;
  relationship: string | null;
  guardian_user_id: string;
}

interface RegisteredUser {
  id: string;
  email: string;
  full_name: string | null;
}

export const GuardianManagement = ({
  open,
  onClose,
  studentId,
  studentName,
}: GuardianManagementProps) => {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [relationship, setRelationship] = useState("padre");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      loadGuardians();
      loadRegisteredUsers();
    }
  }, [open, studentId]);

  const loadGuardians = async () => {
    try {
      const { data: guardianData, error } = await supabase
        .from('student_guardians')
        .select('id, relationship, guardian_user_id')
        .eq('student_id', studentId);

      if (error) throw error;

      if (!guardianData || guardianData.length === 0) {
        setGuardians([]);
        return;
      }

      // Obtener los emails y nombres de los perfiles
      const userIds = guardianData.map(g => g.guardian_user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profileError) throw profileError;

      const formatted = guardianData.map(g => {
        const profile = profiles?.find(p => p.id === g.guardian_user_id);
        return {
          id: g.id,
          guardian_email: profile?.email || 'Sin email',
          guardian_name: profile?.full_name || null,
          relationship: g.relationship,
          guardian_user_id: g.guardian_user_id
        };
      });

      setGuardians(formatted);
    } catch (error) {
      console.error('Error cargando tutores:', error);
      toast.error('Error al cargar tutores');
    }
  };

  const loadRegisteredUsers = async () => {
    try {
      // Cargar todos los usuarios registrados
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setRegisteredUsers(profiles || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const getSelectedUserDisplay = () => {
    if (!selectedUserId) return "Buscar por nombre...";
    const user = registeredUsers.find(u => u.id === selectedUserId);
    if (!user) return "Buscar por nombre...";
    return user.full_name || user.email;
  };

  const filteredUsers = registeredUsers.filter(user => {
    const search = searchTerm.toLowerCase();
    const nameMatch = user.full_name?.toLowerCase().includes(search);
    const emailMatch = user.email.toLowerCase().includes(search);
    return nameMatch || emailMatch;
  });

  const handleAddGuardian = async () => {
    if (!selectedUserId) {
      toast.error('Por favor selecciona un usuario');
      return;
    }

    setIsSubmitting(true);
    try {
      // Verificar si ya existe la relación
      const { data: existing } = await supabase
        .from('student_guardians')
        .select('id')
        .eq('student_id', studentId)
        .eq('guardian_user_id', selectedUserId)
        .maybeSingle();

      if (existing) {
        toast.error('Este tutor ya está asignado al estudiante');
        return;
      }

      // Asignar rol de padre al usuario
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUserId,
          role: 'parent'
        });

      // Si el rol ya existe, no es un error
      if (roleError && !roleError.message.includes('duplicate')) {
        throw roleError;
      }

      // Crear la relación
      const { error: guardianError } = await supabase
        .from('student_guardians')
        .insert({
          student_id: studentId,
          guardian_user_id: selectedUserId,
          relationship: relationship
        });

      if (guardianError) throw guardianError;

      toast.success('Tutor asignado correctamente');
      setSelectedUserId('');
      setRelationship('padre');
      setSearchTerm('');
      loadGuardians();
    } catch (error) {
      console.error('Error asignando tutor:', error);
      toast.error('Error al asignar tutor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGuardian = async (guardianId: string) => {
    try {
      const { error } = await supabase
        .from('student_guardians')
        .delete()
        .eq('id', guardianId);

      if (error) throw error;

      toast.success('Tutor eliminado correctamente');
      loadGuardians();
    } catch (error) {
      console.error('Error eliminando tutor:', error);
      toast.error('Error al eliminar tutor');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Gestionar Tutores</DialogTitle>
            <DialogDescription className="text-sm">
              Administra los padres/tutores que tienen acceso a la información de {studentName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Agregar nuevo tutor */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <h3 className="font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Agregar Tutor
              </h3>
              <div className="grid gap-4">
                <div>
                  <Label>Seleccionar Usuario</Label>
                  <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={userSearchOpen}
                        className="w-full justify-between font-normal"
                      >
                        <span className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          {getSelectedUserDisplay()}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar por nombre o email..." 
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                          <CommandGroup>
                            {filteredUsers.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={`${user.full_name || ''} ${user.email}`}
                                onSelect={() => {
                                  setSelectedUserId(user.id);
                                  setUserSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedUserId === user.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {user.full_name || 'Sin nombre'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {user.email}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1">
                    Busca y selecciona un usuario registrado por nombre o email
                  </p>
                </div>
                <div>
                  <Label htmlFor="relationship">Relación</Label>
                  <Select value={relationship} onValueChange={setRelationship}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="padre">Padre</SelectItem>
                      <SelectItem value="madre">Madre</SelectItem>
                      <SelectItem value="tutor">Tutor</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddGuardian}
                  disabled={isSubmitting || !selectedUserId}
                  className="w-full"
                >
                  {isSubmitting ? 'Agregando...' : 'Agregar Tutor'}
                </Button>
              </div>
            </div>

            {/* Lista de tutores */}
            <div className="space-y-3">
              <h3 className="font-semibold">Tutores Asignados</h3>
              {guardians.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay tutores asignados
                </p>
              ) : (
                <div className="space-y-2">
                  {guardians.map((guardian) => (
                    <div
                      key={guardian.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {guardian.guardian_name || guardian.guardian_email}
                        </p>
                        {guardian.guardian_name && (
                          <p className="text-xs text-muted-foreground">
                            {guardian.guardian_email}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground capitalize">
                          {guardian.relationship || 'Sin especificar'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(guardian.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tutor?</AlertDialogTitle>
            <AlertDialogDescription>
              El tutor perderá acceso a la información del estudiante. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteGuardian(deleteConfirmId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};