import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';

import { Logo } from './Logo';

interface QuickStartGuideProps {
  lang: 'ar' | 'en';
}

const QuickStartGuide: React.FC<QuickStartGuideProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenQuickStart_v2');
    if (!hasSeenGuide) {
      // Small delay to let the app load first
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenQuickStart_v2', 'true');
  };

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 font-['Cairo'] p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative">
        {/* Header / Logo Area */}
        <div className="bg-gradient-to-br from-blue-50 to-slate-50 p-8 flex flex-col items-center justify-center border-b border-slate-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
           
           <div className="bg-white rounded-[1.5rem] flex items-center justify-center shadow-xl border-4 border-white p-2 relative z-10 mb-4 w-24 h-24">
             <Logo className="w-full h-full text-black" />
           </div>
           <h2 className="text-2xl font-black text-black text-center relative z-10">Generations Genetics Labs</h2>
           <p className="text-sm font-bold text-blue-600 tracking-[0.15em] uppercase mt-1 text-center relative z-10">A Better Chance at Life</p>
        </div>

        {/* Content Area */}
        <div className="p-8 min-h-[280px] flex flex-col justify-center bg-white relative z-10">
          {step === 0 && (
            <div className="text-center space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-2xl font-black text-black">{isAr ? 'مرحباً بك في النظام الجديد' : 'Welcome to the New System'}</h3>
              <p className="text-black font-bold leading-relaxed max-w-lg mx-auto text-base">
                {isAr 
                  ? 'لقد قمنا بتحديث النظام ليكون أسرع وأكثر احترافية. دعنا نأخذك في جولة سريعة للتعرف على أهم الميزات الجديدة.' 
                  : 'We have updated the system to be faster and more professional. Let\'s take a quick tour to discover the key new features.'}
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <ICONS.LayoutDashboard className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-black">{isAr ? 'القائمة الجانبية المحدثة' : 'Updated Sidebar'}</h3>
                  <p className="text-sm text-black font-bold">{isAr ? 'تنقل أسهل وأكثر وضوحاً' : 'Easier and clearer navigation'}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                 <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-black group-hover:text-blue-600 group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                       <ICONS.Plus className="w-6 h-6" />
                    </div>
                    <p className="text-base font-bold text-black group-hover:text-black transition-colors">
                      {isAr ? 'تسجيل العينات الجديدة بسرعة من أي مكان.' : 'Quickly register new samples from anywhere.'}
                    </p>
                 </div>
                 <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-black group-hover:text-amber-500 group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                       <ICONS.FileText className="w-6 h-6" />
                    </div>
                    <p className="text-base font-bold text-black group-hover:text-black transition-colors">
                      {isAr ? 'إدارة الحالات المعلقة (Hold) في سجل منفصل.' : 'Manage Hold cases in a dedicated registry.'}
                    </p>
                 </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <ICONS.Database className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-black">{isAr ? 'إعدادات قاعدة البيانات' : 'Database Configuration'}</h3>
                  <p className="text-sm text-black font-bold">{isAr ? 'ربط النظام ببياناتك الخاصة' : 'Connect the system to your data'}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                 <p className="text-base font-bold text-black leading-relaxed mb-6">
                   {isAr 
                     ? 'يمكنك الآن ربط النظام بقاعدة بيانات Firebase الخاصة بك لضمان الخصوصية التامة. توجه إلى:' 
                     : 'You can now connect the system to your own Firebase database for complete privacy. Go to:'}
                 </p>
                 <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm w-fit group hover:shadow-md transition-all">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-black group-hover:bg-slate-200 transition-colors">
                      <ICONS.Settings className="w-5 h-5" />
                    </div>
                    <span className="font-black text-black text-base">{isAr ? 'الإعدادات' : 'Settings'}</span>
                    <ICONS.ChevronRight className={`w-5 h-5 text-black ${isAr ? 'rotate-180' : ''}`} />
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition-colors">
                      <ICONS.Database className="w-5 h-5" />
                    </div>
                    <span className="font-black text-blue-600 text-base">{isAr ? 'قاعدة البيانات' : 'Database Config'}</span>
                 </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <ICONS.CheckCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-black">{isAr ? 'تسجيل عينة جديدة' : 'Register a New Sample'}</h3>
                  <p className="text-sm text-black font-bold">{isAr ? 'خطوات بسيطة للبدء' : 'Simple steps to start'}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col items-center text-center space-y-6">
                 <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-blue-50 text-blue-600 mb-2 animate-bounce">
                    <ICONS.Plus className="w-10 h-10" />
                 </div>
                 <p className="text-base font-bold text-black leading-relaxed max-w-md">
                   {isAr 
                     ? 'انقر على زر "تسجيل جديد" من القائمة الجانبية، أو استخدم زر (+) السريع في أعلى الشاشة لإضافة عينات جديدة فوراً.' 
                     : 'Click the "New Entry" button from the sidebar, or use the quick (+) button at the top of the screen to add new samples instantly.'}
                 </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Controls */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between relative z-10">
           <div className="flex gap-2">
             {[0, 1, 2, 3].map(i => (
               <div key={i} className={`h-2.5 rounded-full transition-all duration-500 ${step === i ? 'w-10 bg-blue-600' : 'w-2.5 bg-slate-300'}`}></div>
             ))}
           </div>
           
           <div className="flex gap-3">
             {step > 0 && (
               <button 
                 onClick={prevStep}
                 className="px-6 py-3 rounded-xl font-black text-black hover:bg-slate-200 transition-colors text-base"
               >
                 {isAr ? 'السابق' : 'Back'}
               </button>
             )}
             <button 
               onClick={nextStep}
               className="px-8 py-3 rounded-xl font-black bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-base"
             >
               {step === 3 ? (isAr ? 'ابدأ الآن' : 'Get Started') : (isAr ? 'التالي' : 'Next')}
               {step < 3 && <ICONS.ChevronRight className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStartGuide;
