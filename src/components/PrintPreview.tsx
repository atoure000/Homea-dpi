import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui';

export function PrintPreview({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add('printing');
    return () => document.body.classList.remove('printing');
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-navy-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 md:p-8">
        <div className="w-full max-w-3xl">
          <div className="no-print flex items-center justify-between gap-2 bg-white rounded-xl border border-navy-100 px-5 py-3 mb-4 shadow-lg">
            <h3 className="font-semibold text-navy-900 text-sm">{title}</h3>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1" /> Imprimer
              </Button>
              <button onClick={onClose} className="text-navy-400 hover:text-navy-700">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="print-sheet bg-white rounded-xl shadow-2xl p-8">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
