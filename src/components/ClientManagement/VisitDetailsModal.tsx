import React, { useState, useEffect } from "react";
import {
  Edit,
  Minus,
  Pause,
  Play,
  Plus,
  StopCircle,
  Trash2,
  X,
} from "lucide-react";
import type { Visit } from "../types/visit";
import type { Product, CartItem } from "../types/product";
import { ProductSelector } from "./ProductSelector";
import { TimeEditor } from "./TimeEditor";

interface VisitDetailsModalProps {
  visit: Visit;
  products: Product[];
  onClose: () => void;
  onPauseVisit: (visitId: string) => void;
  onResumeVisit: (visitId: string) => void;
  onEndVisit: (visitId: string) => void;
  onAddProduct: (visitId: string, productId: string, quantity: number) => void;
  onRemoveProduct: (visitId: string, productId: string) => void;
  onUpdateTime: (visitId: string, startTime: string, endTime: string) => void;
  loading: boolean;
}

export const VisitDetailsModal: React.FC<VisitDetailsModalProps> = ({
  visit,
  products,
  onClose,
  onPauseVisit,
  onResumeVisit,
  onEndVisit,
  onAddProduct,
  onRemoveProduct,
  onUpdateTime,
  loading,
}) => {
  const [isCalculated, setIsCalculated] = useState(!!visit.endTime);
  const [numberOfPeople, setNumberOfPeople] = useState(
    visit.numberOfPeople || 1
  );

  const HOUR_RATE_FIRST = 10;
  const HOUR_RATE_NEXT = 5;

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "مساءً" : "صباحاً";
    const twelveHour = hours % 12 || 12;
    return `${twelveHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("ar-EG")} جنيه`;
  };

  const calculateVisitDuration = (visit: Visit): number => {
    let totalMilliseconds: number;
    if (!visit.endTime) {
      totalMilliseconds = new Date().getTime() - visit.startTime.getTime();
    } else {
      totalMilliseconds = visit.endTime.getTime() - visit.startTime.getTime();
    }
    visit.pauseHistory.forEach((pause) => {
      const pauseEnd = pause.endTime || new Date();
      totalMilliseconds -= pauseEnd.getTime() - pause.startTime.getTime();
    });
    const totalMinutes = Math.floor(totalMilliseconds / (1000 * 60));
    if (totalMinutes < 15) return 0;
    const fullHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    return remainingMinutes >= 15 ? fullHours + 1 : fullHours;
  };

  const calculateTimeCost = (
    hours: number,
    numberOfPeople: number = 1
  ): number => {
    if (hours === 0) return 0;
    if (hours === 1) return HOUR_RATE_FIRST * numberOfPeople;
    return (HOUR_RATE_FIRST + (hours - 1) * HOUR_RATE_NEXT) * numberOfPeople;
  };

  const calculateTotalAmount = (visit: Visit): number => {
    const productsTotal = visit.products.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    );
    const hours = calculateVisitDuration(visit);
    const timeTotal = calculateTimeCost(hours, visit.numberOfPeople || 1);
    return productsTotal + timeTotal;
  };

  const handleEndVisit = () => {
    onEndVisit(visit.id);
    setIsCalculated(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">تفاصيل الزيارة</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-300 mb-1">
                عدد الأشخاص
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() =>
                    setNumberOfPeople(Math.max(1, numberOfPeople - 1))
                  }
                  className="text-slate-400 hover:text-white p-1"
                  disabled={loading}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-white px-2">{numberOfPeople}</span>
                <button
                  onClick={() => setNumberOfPeople(numberOfPeople + 1)}
                  className="text-slate-400 hover:text-white p-1"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-300 mb-1">
                العميل
              </h3>
              <p className="text-white">{visit.clientName}</p>
            </div>
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-300 mb-1">
                التاريخ والوقت
              </h3>
              <TimeEditor
                startTime={visit.startTime}
                endTime={visit.endTime}
                onSave={(startTime, endTime) =>
                  onUpdateTime(visit.id, startTime, endTime)
                }
                loading={loading}
              />
            </div>
          </div>

          <div className="bg-slate-700/50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              إضافة منتجات
            </h3>
            <ProductSelector
              products={products}
              onAddProduct={(productId, quantity) =>
                onAddProduct(visit.id, productId, quantity)
              }
              isDisabled={loading || !!visit.endTime}
            />
          </div>

          <div className="bg-slate-700/50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-1">
              حالة الزيارة
            </h3>
            <div className="flex items-center gap-2">
              {visit.endTime ? (
                <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                  منتهية
                </span>
              ) : visit.isPaused ? (
                <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">
                  متوقفة مؤقتاً
                </span>
              ) : (
                <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                  جارية
                </span>
              )}
              <div className="text-white flex-1 text-right">
                <span>المدة: {calculateVisitDuration(visit)} ساعة</span>
              </div>
            </div>
          </div>

          {visit.products.length > 0 && (
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-slate-300 mb-3">
                المنتجات
              </h3>
              <div className="space-y-2">
                {visit.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white">{product.name}</span>
                      <span className="text-slate-400">
                        ({product.quantity}x)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white">
                        {formatCurrency(product.price * product.quantity)}
                      </span>
                      {!visit.endTime && (
                        <button
                          onClick={() => onRemoveProduct(visit.id, product.id)}
                          disabled={loading}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-700/50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              ملخص الزيارة
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-white">
                <span>المنتجات:</span>
                <span>
                  {formatCurrency(
                    visit.products.reduce(
                      (sum, p) => sum + p.price * p.quantity,
                      0
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between text-white">
                <span>مدة الزيارة:</span>
                <span>
                  {calculateVisitDuration(visit)} ساعة × {numberOfPeople} أشخاص
                </span>
              </div>
              <div className="flex justify-between text-white">
                <span>تكلفة الوقت:</span>
                <span>
                  {formatCurrency(
                    calculateTimeCost(
                      calculateVisitDuration(visit),
                      numberOfPeople
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-600">
                <span>الإجمالي:</span>
                <span>{formatCurrency(calculateTotalAmount(visit))}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {!isCalculated ? (
              <>
                {visit.isPaused ? (
                  <button
                    onClick={() => onResumeVisit(visit.id)}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    استئناف
                  </button>
                ) : (
                  <button
                    onClick={() => onPauseVisit(visit.id)}
                    disabled={loading}
                    className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  >
                    <Pause className="h-4 w-4" />
                    إيقاف مؤقت
                  </button>
                )}
                <button
                  onClick={handleEndVisit}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <StopCircle className="h-4 w-4" />
                  إنهاء الزيارة
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  setIsCalculated(false);
                }}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
