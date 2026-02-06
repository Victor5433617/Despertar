import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ReportsView = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Reportes</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Consulte reportes financieros y de pagos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reportes del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Funcionalidad en desarrollo...</p>
        </CardContent>
      </Card>
    </div>
  );
};
