import React from "react";
import { X } from "lucide-react";
import { Spinner } from "../common/Spinner";

interface DeleteAllVisitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteAll: () => void;
  isDeleting: boolean;
}

export const DeleteAllVisitsModal: React.FC<DeleteAllVisitsModalProps> = ({
  isOpen,
  onClose,
  onDeleteAll,
  isDeleting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            تأكيد حذف جميع الزيارات
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            disabled={isDeleting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-slate-300 mb-6">
          هل أنت متأكد من رغبتك في حذف{" "}
          <span className="font-bold text-white">جميع الزيارات</span>؟<br />
          لا يمكن التراجع عن هذه العملية.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white bg-slate-600 hover:bg-slate-700 rounded-lg"
            disabled={isDeleting}
          >
            إلغاء
          </button>
          <button
            onClick={onDeleteAll}
            disabled={isDeleting}
            className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                جاري الحذف...
                <Spinner />
              </>
            ) : (
              "نعم، احذف الكل"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
