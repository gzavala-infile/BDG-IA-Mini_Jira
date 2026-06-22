import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface Props { mes: number; anio: number; onChange: (mes: number, anio: number) => void; }

export function MonthYearPicker({ mes, anio, onChange }: Props) {
  function prev() {
    if (mes === 1) onChange(12, anio - 1);
    else onChange(mes - 1, anio);
  }
  function next() {
    const now = new Date();
    if (anio === now.getFullYear() && mes === now.getMonth() + 1) return;
    if (mes === 12) onChange(1, anio + 1);
    else onChange(mes + 1, anio);
  }
  return (
    <div className="flex items-center gap-3">
      <Button variant="subtle" size="sm" onClick={prev}><ChevronLeft size={16} /></Button>
      <span className="text-title-lg text-on-surface w-28 text-center">{MESES[(mes - 1) ?? 0]} {anio}</span>
      <Button variant="subtle" size="sm" onClick={next}><ChevronRight size={16} /></Button>
    </div>
  );
}
