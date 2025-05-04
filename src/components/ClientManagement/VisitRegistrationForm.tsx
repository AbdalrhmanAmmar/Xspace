import React from "react";
import { Minus, Plus, Users } from "lucide-react";

interface VisitRegistrationFormProps {
  formData: { name: string; phone: string; job: string };
  setFormData: (data: { name: string; phone: string; job: string }) => void;
  clientStatus: "new" | "existing" | null;
  numberOfPeople: number;
  setNumberOfPeople: (num: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

export const VisitRegistrationForm: React.FC<VisitRegistrationFormProps> = ({
  formData,
  setFormData,
  clientStatus,
  numberOfPeople,
  setNumberOfPeople,
  onSubmit,
  loading,
}) => {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Users className="h-5 w-5" />
        تسجيل زيارة
      </h2>
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-blue-200 mb-2">
            اسم العميل
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="أدخل اسم العميل"
              dir="rtl"
              disabled={loading}
              required
            />
            {clientStatus && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    clientStatus === "new"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {clientStatus === "new" ? "عميل جديد" : "عميل حالي"}
                </span>
              </div>
            )}
          </div>
        </div>

        {clientStatus === "new" && (
          <>
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="أدخل رقم الهاتف"
                dir="rtl"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                التخصص الدراسي
              </label>
              <input
                type="text"
                value={formData.job}
                onChange={(e) =>
                  setFormData({ ...formData, job: e.target.value })
                }
                className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="أدخل التخصص الدراسي"
                dir="rtl"
                disabled={loading}
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-blue-200 mb-2">
            عدد الأشخاص
          </label>
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg border border-slate-700 px-3 w-full">
            <button
              type="button"
              onClick={() => setNumberOfPeople(Math.max(1, numberOfPeople - 1))}
              className="text-slate-400 hover:text-white"
              disabled={numberOfPeople <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-white flex-1 text-center">
              {numberOfPeople}
            </span>
            <button
              type="button"
              onClick={() => setNumberOfPeople(numberOfPeople + 1)}
              className="text-slate-400 hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "جاري الحفظ..." : "تسجيل زيارة"}
        </button>
      </form>
    </div>
  );
};
