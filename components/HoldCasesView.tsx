
import React, { useState, useRef, useEffect } from 'react';
import { HoldCase, HoldFileStatus, User } from '../types';
import { ICONS } from '../constants';

interface HoldCasesViewProps {
  lang: 'ar' | 'en';
  holdCases: HoldCase[];
  onSubmit: (data: any) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onUndoComplete: (id: string) => void;
  currentUser: User;
}

const HoldCasesView: React.FC<HoldCasesViewProps> = ({ lang, holdCases, onSubmit, onDelete, onComplete, onUndoComplete }) => {
  const isAr = lang === 'ar';
  const [isCenterOpen, setIsCenterOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    patientName: '',
    patientId: '',
    testType: 'Blood Chromosomes',
    centerName: 'Walk in Patient',
    comment: '',
    status: HoldFileStatus.FOLLOWUP
  });

  const testOptions = [
    'Blood Chromosomes', 'PGTM', 'WES', 'Tissue', 'Prenatel KM', 'K.Mution', 'Amnio', 'CVS'
  ];

  const centerOptions = [
    'Walk in Patient', 'bedaya Hospital', 'Sunrise Fertility Center', 'Adam international Hospital',
    'Royal Ivf Mansoura', 'Life Lab Mansoura', 'Air Force Specialized Hospital', 'Lab',
    'Dar el Tab Hospital', 'Nour elhayah Fertility Center', 'Wael Elbana Center', 'Y.Gohar',
    'Ganna Hospital', 'El Omam Hospital', 'Dar El Omoma Hospital', 'Dar El Khosoba IVF',
    'Mabaret Al Asafra Hospitals', 'Madina Ivf center', 'Madina Lab'
  ];

  const statuses = Object.values(HoldFileStatus);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCenterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.patientId) return;
    onSubmit(formData);
    setFormData({ 
      patientName: '', 
      patientId: '', 
      testType: 'Blood Chromosomes',
      centerName: 'Walk in Patient',
      comment: '',
      status: HoldFileStatus.FOLLOWUP 
    });
    setIsCenterOpen(false);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 font-['Cairo']">
      <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 overflow-visible">
        <h2 className="text-2xl font-black text-black mb-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
            <ICONS.FileText className="w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <span>{isAr ? 'تسجيل حالة Hold مستقلة' : 'Independent Hold Entry'}</span>
            <span className="text-xs text-blue-500 font-bold uppercase tracking-widest">Hold Registry Only</span>
          </div>
        </h2>

        {/* تنبيه للمستخدم عن انفصال السجل */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
           <ICONS.Shield className="w-6 h-6 text-blue-600 shrink-0" />
           <p className="text-sm font-bold text-blue-800 leading-relaxed">
             {isAr ? 'ملاحظة: البيانات المسجلة هنا تذهب لسجل الحالات المعلقة (Hold) فقط ولا تظهر في سجل جرد العينات العام.' : 'Note: Data recorded here goes to the Hold Registry only and will not appear in the Blood Inventory.'}
           </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label htmlFor="patientName" className="text-sm font-black text-black uppercase tracking-widest px-1">
              {isAr ? 'اسم الحالة' : 'Patient Name'}
            </label>
            <input
              id="patientName"
              type="text"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-black"
              placeholder={isAr ? 'اسم المريض' : 'Patient Name'}
              value={formData.patientName}
              onChange={e => setFormData({...formData, patientName: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="patientId" className="text-sm font-black text-black uppercase tracking-widest px-1">
              {isAr ? 'كود الحالة' : 'Patient ID'}
            </label>
            <input
              id="patientId"
              type="text"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-black"
              placeholder="ID-000"
              value={formData.patientId}
              onChange={e => setFormData({...formData, patientId: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="testType" className="text-sm font-black text-black uppercase tracking-widest px-1">
              {isAr ? 'اسم التحليل' : 'Test Type'}
            </label>
            <select
              id="testType"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-black appearance-none cursor-pointer"
              value={formData.testType}
              onChange={e => setFormData({...formData, testType: e.target.value})}
            >
              {testOptions.map(test => (
                <option key={test} value={test}>{test}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 relative" ref={dropdownRef}>
            <label className="text-sm font-black text-black uppercase tracking-widest px-1">
              {isAr ? 'اسم المركز' : 'Medical Center'}
            </label>
            <div 
              onClick={() => setIsCenterOpen(!isCenterOpen)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus-within:ring-4 focus-within:ring-blue-50 border-blue-100/50 flex items-center justify-between cursor-pointer hover:bg-white transition-all group"
            >
              <span className="font-bold text-black">{formData.centerName}</span>
              <ICONS.Filter className={`w-4 h-4 text-black group-hover:text-blue-500 transition-transform ${isCenterOpen ? 'rotate-180' : ''}`} />
            </div>

            {isCenterOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] max-h-64 overflow-y-auto animate-in slide-in-from-top-2 duration-200 divide-y divide-slate-50">
                {centerOptions.map(center => (
                  <div
                    key={center}
                    onClick={() => {
                      setFormData({...formData, centerName: center});
                      setIsCenterOpen(false);
                    }}
                    className={`px-5 py-3 hover:bg-blue-50 cursor-pointer transition-colors font-bold text-sm ${formData.centerName === center ? 'text-blue-600 bg-blue-50/50' : 'text-black'}`}
                  >
                    {center}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-black text-black uppercase tracking-widest px-1">
              {isAr ? 'السبب' : 'The Reason'}
            </label>
            <select
              id="status"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-black appearance-none cursor-pointer"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as HoldFileStatus})}
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-black text-black uppercase tracking-widest px-1">
              {isAr ? 'ملاحظات إضافية' : 'Comment / Details'}
            </label>
            <input
              id="comment"
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-bold text-black"
              placeholder={isAr ? 'اكتب أي تفاصيل هنا...' : 'Extra details...'}
              value={formData.comment}
              onChange={e => setFormData({...formData, comment: e.target.value})}
            />
          </div>

          <div className="md:col-span-2 pt-4">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <ICONS.Plus className="w-5 h-5" />
              {isAr ? 'حفظ في سجل الـ Hold فقط' : 'Save to Hold Registry Only'}
            </button>
          </div>
        </form>
      </div>

      {/* NEW: Recent Entries List with Finished Status Indicator */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 overflow-hidden">
         <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-black flex items-center gap-3 px-2">
               <ICONS.History className="w-6 h-6 text-blue-500" />
               {isAr ? 'الحالات المسجلة حديثاً' : 'Recently Recorded Cases'}
            </h3>
            <span className="text-xs font-black bg-slate-100 text-black px-3 py-1 rounded-full">
              {isAr ? 'آخر 10 حالات' : 'Last 10 entries'}
            </span>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
               <thead className="bg-slate-50/50 text-xs uppercase font-black text-black tracking-widest">
                  <tr>
                     <th className="px-6 py-4 rounded-r-2xl">{isAr ? 'المريض' : 'Patient'}</th>
                     <th className="px-6 py-4">{isAr ? 'المركز' : 'Center'}</th>
                     <th className="px-6 py-4">{isAr ? 'الحالة' : 'Status'}</th>
                     <th className="px-6 py-4 text-center rounded-l-2xl">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {holdCases.slice(0, 10).map(item => {
                     const isFinished = item.is_finished;
                     return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <span className={`font-black text-sm transition-all duration-300 ${isFinished ? 'line-through text-black' : 'text-black'}`}>
                                    {item.patient_name}
                                 </span>
                                 <span className="text-[10px] text-black font-mono">{item.patient_id}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-sm font-bold text-black">{item.center_name}</td>
                           <td className="px-6 py-4">
                              {isFinished ? (
                                 <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100 w-fit">
                                    <ICONS.CheckCircle className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">{isAr ? 'مكتمل' : 'Completed'}</span>
                                 </div>
                              ) : (
                                 <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black border border-amber-100">
                                    {item.status}
                                 </span>
                              )}
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                 {isFinished ? (
                                    <button 
                                      onClick={() => onUndoComplete(item.id)} 
                                      className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl transition-all shadow-sm" 
                                      title={isAr ? 'تراجع عن الإنجاز' : 'Undo Completion'}
                                    >
                                       <ICONS.Refresh className="w-4 h-4" />
                                    </button>
                                 ) : (
                                    <button 
                                      onClick={() => onComplete(item.id)} 
                                      className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm" 
                                      title={isAr ? 'إكمال الحالة' : 'Mark as Finished'}
                                    >
                                       <ICONS.CheckCircle className="w-4 h-4" />
                                    </button>
                                 )}
                                 <button 
                                   onClick={() => onDelete(item.id)} 
                                   className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm" 
                                   title={isAr ? 'حذف' : 'Delete'}
                                 >
                                    <ICONS.Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     )
                  })}
                  {holdCases.length === 0 && (
                     <tr>
                        <td colSpan={4} className="text-center py-12 text-black font-bold italic text-sm">
                           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-black">
                              <ICONS.Search className="w-6 h-6" />
                           </div>
                           {isAr ? 'لا توجد حالات مسجلة حتى الآن' : 'No cases recorded yet'}
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default HoldCasesView;
