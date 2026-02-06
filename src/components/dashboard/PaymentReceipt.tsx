import { Printer, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import schoolLogo from "@/assets/school-logo.png";
import { formatDatePY } from "@/lib/dateUtils";

/**
 * Thermal Receipt Version (80mm or 58mm paper)
 * Diseño ultra compacto, monocromático y optimizado para impresoras térmicas.
 * - Sin gradientes
 * - Tipografías pequeñas
 * - Líneas divisorias claras
 * - Evita imágenes grandes (las térmicas imprimen mal gráficos)
 */

export const PaymentReceipt = ({ data, onClose }) => {
  const handlePrint = () => window.print();

  const ReceiptCopy = ({ copyType }) => (
    <div className="w-full max-w-[360px] mx-auto bg-white text-[13px] leading-normal font-mono text-black print:max-w-none print:text-[10px] print:leading-tight">
  {/* CONTENEDOR TIPO TICKET */}
  <div className="border border-black/80 rounded-lg overflow-hidden shadow-sm print:shadow-none print:border-black">
    
    {/* ENCABEZADO */}
    <div className="px-4 pt-4 pb-3 text-center border-b border-black/70 print:px-3 print:pt-3 print:pb-2">
      <div className="flex justify-center mb-2 print:mb-1">
        <img
          src={schoolLogo}
          alt="Logo Escuela"
          className="h-12 w-12 object-contain print:h-10 print:w-10"
        />
      </div>

      <h1 className="font-bold text-[16px] leading-tight tracking-wide print:text-[12px]">
        ESCUELA BÁSICA N° 5974
      </h1>

      <div className="mt-1 text-[12px] print:text-[10px]">
        <div className="inline-flex items-center gap-2">
          <span className="px-2 py-0.5 border border-black/70 rounded-full">
            Comprobante de Pago
          </span>
          <span className="font-semibold">{copyType}</span>
        </div>
      </div>
    </div>

    {/* META */}
    <div className="px-4 py-3 border-b border-black/40 print:px-3 print:py-2">
      <div className="flex justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] text-black/70 print:text-[9px]">Recibo</div>
          <div className="font-semibold truncate">{data.receiptNumber}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-black/70 print:text-[9px]">Fecha</div>
          <div className="font-semibold">{formatDatePY(data.paymentDate)}</div>
        </div>
      </div>
    </div>

    {/* ESTUDIANTE */}
    <div className="px-4 py-3 border-b border-black/40 print:px-3 print:py-2">
      <div className="flex items-center justify-between mb-2 print:mb-1">
        <p className="font-bold tracking-wide">ESTUDIANTE</p>
        {data.studentId && (
          <span className="text-[11px] px-2 py-0.5 border border-black/50 rounded-full print:text-[9px]">
            Cedula: {data.studentId}
          </span>
        )}
      </div>

      <div className="text-[13px] print:text-[10px]">
        <div className="text-[11px] text-black/70 print:text-[9px]">Nombre</div>
        <div className="font-semibold leading-tight">{data.studentName}</div>
      </div>
    </div>

    {/* DETALLE */}
    <div className="px-4 py-3 border-b border-black/40 print:px-3 print:py-2">
      <p className="font-bold tracking-wide mb-2 print:mb-1">DETALLE</p>

      <div className="space-y-1">
        {data.paidConcepts.map((c, i) => (
          <div
            key={i}
            className={`flex justify-between gap-2 py-1 border-b border-dashed border-black/30 last:border-b-0 ${
              c.isLateFee ? "text-orange-700 italic" : ""
            }`}
          >
            <span className="min-w-0 truncate">
              {c.isLateFee ? "↳ " : ""}
              {c.name}
            </span>
            <span className="font-semibold whitespace-nowrap">
              {c.amount.toLocaleString("es-PY", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}{" "}
              Gs
            </span>
          </div>
        ))}
      </div>
    </div>

    {/* TOTAL */}
    <div className="px-4 py-3 print:px-3 print:py-2">
      <div className="flex justify-between items-baseline bg-black/[0.04] border border-black/30 rounded-md px-3 py-2 print:px-2 print:py-1.5">
        <span className="font-bold text-[14px] print:text-[11px]">TOTAL</span>
        <span className="font-bold text-[15px] print:text-[12px]">
          {data.amount.toLocaleString("es-PY", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}{" "}
          Gs
        </span>
      </div>

      <div className="mt-2 flex justify-between text-[12px] print:text-[9px]">
        <span className="text-black/70">Método</span>
        <span className="font-semibold">{data.paymentMethod}</span>
      </div>

      {/* OBS */}
      {data.notes && (
        <div className="mt-3 pt-2 border-t border-black/30 print:mt-2">
          <p className="font-bold tracking-wide mb-1">OBSERVACIONES</p>
          <p className="text-[12px] print:text-[9px] text-black/80 leading-snug">
            {data.notes}
          </p>
        </div>
      )}

      {/* PIE */}
      <div className="mt-3 pt-3 border-t-2 border-dashed border-black/60 text-center print:mt-2 print:pt-2">
        <p className="font-semibold">Gracias por su pago</p>
        <p className="text-[11px] text-black/60 print:text-[9px]">
          Emitido: {new Date().toLocaleString("es-PY")}
        </p>
      </div>
    </div>
  </div>
</div>

  );

  const content = (
    <div className="receipt-overlay fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div
        id="receipt-content"
        className="bg-white p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl print:shadow-none print:border-none print:p-0"
      >
        {/* BOTONES DE ACCIÓN */}
        <div className="print:hidden flex justify-between items-center mb-4 pb-3 border-b">
          <h2 className="font-bold text-lg">Vista Previa Recibo</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button onClick={onClose} size="sm" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="receipt-page">
          {/* PRIMERA COPIA */}
          <div className="receipt-copy">
            <ReceiptCopy copyType="Copia Escuela" />
          </div>

          {/* SEPARADOR */}
          <div className="receipt-separator my-1 border-t border-dashed border-gray-400"></div>

          {/* SEGUNDA COPIA */}
          <div className="receipt-copy">
            <ReceiptCopy copyType="Copia Cliente" />
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 2cm;
          }
          html, body {
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            font-size: 10px !important;
          }
          body > *:not(.receipt-overlay) { 
            display: none !important;
          }
          .receipt-overlay {
            position: static !important;
            inset: auto !important;
            display: block !important;
            padding: 0 !important;
            background: transparent !important;
          }
          #receipt-content { 
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          .receipt-page {
            display: flex;
            flex-direction: column;
            gap: 6mm;
          }
          .receipt-copy,
          .receipt-separator {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
};
