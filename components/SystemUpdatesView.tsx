import React from 'react';
import { ICONS } from '../constants';

interface SystemUpdatesViewProps {
  lang: 'ar' | 'en';
  onBack: () => void;
}

const SystemUpdatesView: React.FC<SystemUpdatesViewProps> = ({ lang, onBack }) => {
  const isAr = lang === 'ar';

  const updates = [
    {
      version: '2.9.5',
      date: '2025-05-15',
      title: isAr ? 'تحسين واجهة المستخدم والتقارير' : 'UI/UX Overhaul & Reporting',
      type: 'Major',
      features: [
        isAr ? 'إعادة تصميم اللوحة الرئيسية (Dashboard) لتشمل مؤشرات أداء KPI.' : 'Redesigned Main Dashboard with interactive KPIs.',
        isAr ? 'إضافة سجل تحديثات النظام.' : 'Added System Updates Changelog.',
        isAr ? 'تحسين خطوط النظام (Cairo Font) لزيادة القراءة.' : 'Enhanced Typography (Cairo Font) for readability.',
        isAr ? 'نظام تنبيهات ذكي للعينات منتهية الصلاحية.' : 'Smart Alerts for expiring samples.'
      ]
    },
    {
      version: '2.9.0',
      date: '2025-04-20',
      title: isAr ? 'فصل سجل الـ Hold' : 'Separate Hold Registry',
      type: 'Feature',
      features: [
        isAr ? 'فصل حالات الـ Hold في قاعدة بيانات مستقلة.' : 'Decoupled Hold Cases into separate database.',
        isAr ? 'إضافة حقول (المركز، نوع التحليل، السبب) لسجل الـ Hold.' : 'Added Center, Test Type, and Reason fields to Hold Registry.',
        isAr ? 'لوحة إحصائيات خاصة للحالات المعلقة.' : 'Dedicated Dashboard for Hold Cases analytics.'
      ]
    },
    {
      version: '2.8.2',
      date: '2025-03-10',
      title: isAr ? 'تحسينات الأداء' : 'Performance Improvements',
      type: 'Fix',
      features: [
        isAr ? 'تسريع عملية تحميل البيانات بنسبة 40%.' : 'Improved data loading speed by 40%.',
        isAr ? 'إصلاح مشكلة التزامن مع السحابة.' : 'Fixed Cloud Sync issues.'
      ]
    },
    {
      version: '2.8.0',
      date: '2025-02-01',
      title: isAr ? 'نظام تقييم الموظفين' : 'Staff Evaluation System',
      type: 'Feature',
      features: [
        isAr ? 'إمكانية تقييم الموظفين وتتبع الالتزام.' : 'Staff rating and commitment tracking.',
        isAr ? 'جدولة مواعيد الجرد تلقائياً.' : 'Automated Inventory Scheduling.'
      ]
    }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Major': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Feature': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Fix': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-black border-slate-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 font-['Cairo']">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-black hover:text-blue-600 transition-colors mb-4 font-bold text-sm"
          >
            <ICONS.ArrowRightLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
            {isAr ? 'العودة للرئيسية' : 'Back to Dashboard'}
          </button>
          <h2 className="text-3xl font-black text-black flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
               <ICONS.Bell className="w-6 h-6" />
            </div>
            {isAr ? 'سجل تحديثات النظام' : 'System Changelog'}
          </h2>
          <p className="text-black font-bold mt-2 max-w-lg">
            {isAr ? 'تتبع كافة التغييرات والتحسينات الجديدة في نظام Lab Freeze.' : 'Track all new changes and improvements in the Lab Freeze system.'}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative border-l-2 border-slate-100 ml-6 md:ml-10 space-y-12">
        {updates.map((update, idx) => (
          <div key={idx} className="relative pl-8 md:pl-12 group">
            {/* Timeline Dot */}
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-transform group-hover:scale-125 ${update.type === 'Major' ? 'bg-purple-500' : update.type === 'Feature' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
            
            <div className="bg-white/20 backdrop-blur-md rounded-[2.5rem] p-8 shadow-sm border border-white/30 hover:shadow-md transition-shadow relative overflow-hidden">
               {/* Background Decor */}
               <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-10 -translate-y-1/2 translate-x-1/2 ${update.type === 'Major' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>

               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
                 <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getTypeColor(update.type)}`}>
                        {update.type}
                      </span>
                      <span className="text-black text-xs font-bold">{update.date}</span>
                    </div>
                    <h3 className="text-xl font-black text-black">{update.title}</h3>
                 </div>
                 <div className="text-right">
                    <span className="text-3xl font-black text-black tracking-tighter">v{update.version}</span>
                 </div>
               </div>

               <ul className="space-y-3 relative z-10">
                 {update.features.map((feat, fIdx) => (
                   <li key={fIdx} className="flex items-start gap-3 text-black font-medium text-sm">
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0"></div>
                     {feat}
                   </li>
                 ))}
               </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center py-10 text-black font-bold text-xs uppercase tracking-widest">
         {isAr ? 'نهاية السجل' : 'End of Changelog'}
      </div>

    </div>
  );
};

export default SystemUpdatesView;