import {
  X,
  Minus,
  Plus,
  Trash2,
  Pause,
  Play,
  StopCircle,
  Edit,
} from "lucide-react";

interface VisitDetailsModalProps {
  visit: any;
  onClose: () => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onEnd: (id: string) => void;
  onAddProduct: (productId: string, quantity: number) => void;
  onRemoveProduct: (productId: string) => void;
  products: any[];
  loading: boolean;
  isCalculated: boolean;
  onUpdatePeople: (num: number) => void;
}

export const VisitDetailsModal = ({
  visit,
  onClose,
  onPause,
  onResume,
  onEnd,
  onAddProduct,
  onRemoveProduct,
  products,
  loading,
  isCalculated,
  onUpdatePeople,
}: VisitDetailsModalProps) => {
  // ... منطق المودال

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* محتوى المودال */}
      </div>
    </div>
  );
};
