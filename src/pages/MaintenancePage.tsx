import React from "react";
import { Construction } from "lucide-react";

export const MaintenancePage = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <Construction className="h-24 w-24 text-primary-600 dark:text-primary-400 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            جاري الصيانة
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            نقوم حاليًا بإجراء بعض التحديثات على الموقع لتحسين تجربتك. نعتذر عن أي إزعاج وسنعود قريبًا!
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 max-w-3xl mx-auto">
    
        </div>
      </main>
    </div>
  );
};