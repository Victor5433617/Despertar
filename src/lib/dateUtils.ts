// Utilidades para manejo de fechas en formato paraguayo

/**
 * Formatea una fecha en formato paraguayo (DD/MM/YYYY)
 * Evita problemas de timezone al agregar T00:00:00
 */
export const formatDatePY = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD para inputs
 * Usa la zona horaria local (Paraguay)
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Compara si una fecha está vencida (antes de hoy)
 * Usa la fecha local sin problemas de timezone
 */
export const isDateOverdue = (dueDateString: string): boolean => {
  const today = getTodayDateString();
  return dueDateString < today;
};
