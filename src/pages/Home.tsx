import React from "react";
import { Link } from "react-router-dom";
import { Users, Calendar, Package, UserPlus, CreditCard } from "lucide-react";

export const Home = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            مرحباً بك في x-sace
          </h1>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/clients"
            className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <UserPlus className="h-12 w-12 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              إدارة العملاء
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              إضافة وإدارة العملاء الجدد والحاليين
            </p>
          </Link>

          <Link
            to="/clients-list"
            className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <Users className="h-12 w-12 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              قائمة العملاء
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              عرض وإدارة جميع العملاء
            </p>
          </Link>

          <Link
            to="/subscriptions"
            className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <CreditCard className="h-12 w-12 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              الاشتراكات
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              إدارة اشتراكات العملاء
            </p>
          </Link>

          <Link
            to="/reservations"
            className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <Calendar className="h-12 w-12 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              الحجوزات
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              إدارة حجوزات القاعات والمواعيد
            </p>
          </Link>

          <Link
            to="/products"
            className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
          >
            <Package className="h-12 w-12 text-primary-600 dark:text-primary-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              المنتجات
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              إدارة المنتجات والمبيعات
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
};
