import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Evaluation, UserRole, InventorySchedule, CommitmentGrade, Sample, HoldCase } from '../types';
import { ICONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StaffEvaluationProps {
  lang: 'ar' | 'en';
  users: User[];
  evaluations: Evaluation[];
  schedules: InventorySchedule[];
  samples: Sample[];
  holdCases: HoldCase[];
  onRate: (staffId: string, rating: number) => void;
  onAddSchedule: (schedule: Omit<InventorySchedule, 'id' | 'status'>) => void;
  onDeleteSchedule: (id: string) => void;
  onUpdateUser: (userId: string, data: Partial<User>) => void;
  onUpdateScheduleGrade: (scheduleId: string, grade: CommitmentGrade) => void;
  currentUser: User;
}

const StaffEvaluation: React.FC<StaffEvaluationProps> = ({ 
  lang, users, evaluations, schedules, samples, holdCases, onRate, onAddSchedule, onDeleteSchedule, onUpdateScheduleGrade, currentUser 
}) => {
  const isAr = lang === 'ar';
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const [activeTab, setActiveTab] = useState<'rating' | 'scheduling' | 'review'>('rating');
  
  // Calendar States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date()); // For navigating months
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const [selectedStaff, setSelectedStaff] = useState('');
  const [reminderType, setReminderType] = useState<'WhatsApp' | 'Email' | 'Both'>('Both');
  const [sendAdvance, setSendAdvance] = useState(true);
  const [sendSameDay, setSendSameDay] = useState(true);
  const [customMessage, setCustomMessage] = useState(isAr ? 'تذكير: يرجى البدء في جرد ثلاجة المختبر غداً في تمام الساعة التاسعة صباحاً.' : 'Reminder: Please start the lab fridge inventory tomorrow at 9:00 AM.');

  const staffMembers = useMemo(() => {
    return users.filter(u => u.id !== currentUser.id || u.role !== UserRole.ADMIN);
  }, [users, currentUser]);

  // Handle click outside to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- AI PERFORMANCE ENGINE ---
  const getAiPerformance = (staff: User) => {
    const finishedHoldCount = holdCases.filter(c => c.finished_by === staff.username && c.is_finished).length;
    
    const staffSchedules = schedules.filter(s => s.staff_id === staff.id);
    let schedulesMet = 0;
    let schedulesMissed = 0;

    staffSchedules.forEach(sched => {
      const workedOnDay = samples.some(s => 
        s.finished_by === staff.username && 
        s.finished_at && 
        s.finished_at.startsWith(sched.date)
      );
      
      if (workedOnDay) schedulesMet++;
      else {
        if (new Date(sched.date) < new Date()) schedulesMissed++;
      }
    });

    let aiRating = 0;
    let aiReason = isAr ? 'لا توجد بيانات كافية' : 'Insufficient data';
    let grade: CommitmentGrade = 'Unrated';

    if (staffSchedules.length > 0) {
      if (schedulesMet === 0 && schedulesMissed > 0) {
        aiRating = 0;
        aiReason = isAr ? 'تغيب عن موعد الجرد المحدد (0 نجوم)' : 'Missed Inventory Schedule (0 Stars)';
        grade = 'Poor';
      } else if (schedulesMet > 0) {
        aiRating = 3; 
        grade = 'Average';
        aiReason = isAr ? 'التزام بموعد الجرد (متوسط 3 نجوم)' : 'Adhered to Schedule (Avg 3 Stars)';

        if (finishedHoldCount >= 5 && finishedHoldCount < 10) {
          aiRating = 4;
          grade = 'Good';
          aiReason = isAr ? 'التزام بالجرد + إنهاء حالات Hold (جيد جداً 4 نجوم)' : 'Schedule + High Hold Finishes (4 Stars)';
        } else if (finishedHoldCount >= 10) {
          aiRating = 5;
          grade = 'Good';
          aiReason = isAr ? 'أداء ممتاز في الجرد والـ Hold (5 نجوم)' : 'Excellent Inventory & Hold Performance (5 Stars)';
        }
      }
    } else if (finishedHoldCount > 0) {
        aiRating = Math.min(finishedHoldCount > 10 ? 4 : 3, 5);
        aiReason = isAr ? 'نشاط Hold جيد بدون جدول جرد' : 'Good Hold activity without schedule';
    }

    return { 
      score: aiRating, 
      reason: aiReason, 
      finishedHold: finishedHoldCount, 
      schedulesMet, 
      schedulesMissed,
      suggestedGrade: grade
    };
  };

  const leaderboardData = useMemo(() => {
    return staffMembers.map(staff => {
      const aiData = getAiPerformance(staff);
      const manualEvals = evaluations.filter(e => e.staffId === staff.id);
      const avgManual = manualEvals.length > 0 ? (manualEvals.reduce((a,b) => a+b.rating, 0) / manualEvals.length) : aiData.score;

      return { 
        name: staff.name, 
        username: staff.username,
        score: aiData.score, 
        manualRating: avgManual,
        aiData
      };
    }).sort((a, b) => b.score - a.score);
  }, [staffMembers, evaluations, schedules, samples, holdCases]);

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !selectedDate) return;
    const staff = users.find(u => u.id === selectedStaff);
    
    onAddSchedule({
      staff_id: selectedStaff,
      staff_name: staff?.name || '',
      staff_phone: staff?.phone || '',
      staff_email: staff?.email || '',
      date: selectedDate,
      time: '09:00',
      type: reminderType,
      message: customMessage,
      send_advance_reminder: sendAdvance,
      send_same_day_reminder: sendSameDay
    });
    
    alert(isAr ? 'تم حفظ جدول الجرد وتفعيل خيارات التنبيه بنجاح.' : 'Schedule saved and notification options activated.');
    setSelectedStaff('');
  };

  // --- CALENDAR LOGIC ---
  const handlePrevMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setViewDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setViewDate(newDate);
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
    
    const days = [];
    const weekDaysEn = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const weekDaysAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const weekDays = isAr ? weekDaysAr : weekDaysEn;

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      
      // Check if this date already has a schedule (visual indicator)
      const hasSchedule = schedules.some(s => s.date === dateStr);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => {
            setSelectedDate(dateStr);
            setIsCalendarOpen(false); // Close calendar on selection
          }}
          className={`
            relative p-2 h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all
            ${isSelected 
              ? 'bg-blue-600 text-white shadow-lg scale-110 z-10' 
              : 'bg-white text-black hover:bg-slate-100'
            }
            ${isToday && !isSelected ? 'border-2 border-blue-200 text-blue-600' : ''}
          `}
        >
          {day}
          {hasSchedule && !isSelected && (
            <div className="absolute bottom-1 w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
          )}
        </button>
      );
    }

    return (
      <div className="bg-white p-4 rounded-3xl shadow-2xl border border-slate-100 select-none animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4 px-2">
          <button type="button" onClick={isAr ? handleNextMonth : handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-black">
            <ICONS.ChevronDown className="w-5 h-5 rotate-90" />
          </button>
          <span className="text-sm font-black text-black">
            {viewDate.toLocaleString(isAr ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" onClick={isAr ? handlePrevMonth : handleNextMonth} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-black">
            <ICONS.ChevronDown className="w-5 h-5 -rotate-90" />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekDays.map((d, i) => (
            <div key={i} className="text-[10px] font-black text-black uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 place-items-center">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-['Cairo']">
      <div className="flex bg-white/20 backdrop-blur-md p-2 rounded-3xl border border-white/30 shadow-sm max-w-fit mx-auto overflow-hidden">
        <button 
          onClick={() => setActiveTab('rating')}
          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${activeTab === 'rating' ? 'bg-blue-600 text-white shadow-lg' : 'text-black hover:bg-slate-50'}`}
        >
          <ICONS.Star className="w-4 h-4" />
          {isAr ? 'تقييم الذكاء الاصطناعي' : 'AI Rating'}
        </button>
        <button 
          onClick={() => setActiveTab('scheduling')}
          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${activeTab === 'scheduling' ? 'bg-blue-600 text-white shadow-lg' : 'text-black hover:bg-slate-50'}`}
        >
          <ICONS.Bell className="w-4 h-4" />
          {isAr ? 'جدولة التنبيهات' : 'Scheduling'}
        </button>
        <button 
          onClick={() => setActiveTab('review')}
          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${activeTab === 'review' ? 'bg-blue-600 text-white shadow-lg' : 'text-black hover:bg-slate-50'}`}
        >
          <ICONS.CheckCircle className="w-4 h-4" />
          {isAr ? 'مراجعة الالتزام' : 'Review'}
        </button>
      </div>

      {activeTab === 'rating' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 bg-white/20 backdrop-blur-md p-8 rounded-[3rem] shadow-sm border border-white/30">
                <div className="flex items-center gap-3 mb-8">
                   <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                      <ICONS.Shield className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-black">{isAr ? 'تقييم الأداء الذكي (AI)' : 'AI Performance Rating'}</h3>
                      <p className="text-xs text-black font-bold uppercase tracking-widest">{isAr ? 'بناءً على الالتزام بالجداول وإنهاء الحالات' : 'Based on Schedule Adherence & Finished Cases'}</p>
                   </div>
                </div>

                <div className="space-y-4">
                  {leaderboardData.length > 0 ? leaderboardData.map((data) => {
                     const staff = users.find(u => u.username === data.username);
                     if (!staff) return null;
                     
                     return (
                      <div key={staff.id} className="flex flex-col md:flex-row items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white transition-all group">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-100">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-black text-lg">{staff.name}</p>
                            <p className="text-xs text-black font-black uppercase tracking-widest flex items-center gap-1">
                               @{staff.username} • 
                               <span className="text-purple-500">{data.aiData.reason}</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                            <div className="flex gap-2">
                               <div className="flex flex-col items-center px-3 py-1 bg-white rounded-xl border border-slate-200">
                                   <span className="text-[10px] font-black text-black uppercase">HOLD Finished</span>
                                   <span className="text-base font-black text-emerald-600">{data.aiData.finishedHold}</span>
                               </div>
                               <div className="flex flex-col items-center px-3 py-1 bg-white rounded-xl border border-slate-200">
                                   <span className="text-[10px] font-black text-black uppercase">Sched. Met</span>
                                   <span className={`text-base font-black ${data.aiData.schedulesMet > 0 ? 'text-blue-600' : 'text-black'}`}>{data.aiData.schedulesMet}</span>
                               </div>
                            </div>

                            <div className="flex items-center gap-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 right-0 bg-purple-500 text-white text-[8px] font-bold px-1.5 rounded-bl-lg z-10">AI</div>
                              {[1,2,3,4,5].map(s => (
                                <ICONS.Star 
                                  key={s} 
                                  onClick={() => isAdmin && onRate(staff.id, s)}
                                  className={`w-5 h-5 cursor-pointer transition-transform hover:scale-125 ${ (data.score) >= s ? 'fill-amber-400 text-amber-400' : 'text-black'}`} 
                                />
                              ))}
                            </div>
                        </div>
                      </div>
                     );
                  }) : (
                    <div className="py-20 text-center text-black italic font-bold">
                       {isAr ? 'لم يتم العثور على موظفين مسجلين' : 'No registered staff found'}
                    </div>
                  )}
                </div>
             </div>
             
             <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                <div className="mb-6">
                  <h3 className="text-xl font-black text-black">{isAr ? 'الموظفين الأعلى تقييماً' : 'Top AI Rated Staff'}</h3>
                  <p className="text-xs text-black font-bold uppercase mt-1 tracking-widest">{isAr ? 'تقييم تلقائي بناءً على معايير الجودة' : 'Automated quality assurance rating'}</p>
                </div>
                <div className="h-80">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leaderboardData} layout="vertical">
                         <XAxis type="number" hide />
                         <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 9, fontWeight: 900}} />
                         <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                         <Bar dataKey="score" fill="#8b5cf6" radius={[0,10,10,0]} barSize={24}>
                            {leaderboardData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : '#94a3b8'} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                   <p className="text-xs text-purple-700 leading-relaxed font-bold">
                      {isAr 
                        ? 'الذكاء الاصطناعي يمنح 3 نجوم للالتزام بموعد الجرد (تحديث في نفس اليوم)، ويرفع التقييم لـ 4 أو 5 نجوم بناءً على عدد حالات Hold المنجزة.' 
                        : 'AI awards 3 stars for schedule adherence (Same-day update), boosting to 4 or 5 stars based on the volume of finished Hold cases.'}
                   </p>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'scheduling' && (
        <div className="w-full animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
             <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <ICONS.Bell className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-black">{isAr ? 'جدولة تذكير جرد الثلاجة' : 'Fridge Inventory Reminders'}</h2>
                  <p className="text-sm text-black font-bold uppercase tracking-widest">Notification Engine & Timing Settings</p>
                </div>
             </div>

             <form onSubmit={handleScheduleSubmit} className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <div className="space-y-2">
                       <label htmlFor="staffSelect" className="text-xs font-black text-black uppercase px-1">{isAr ? 'الموظف المسؤول' : 'Staff Name'}</label>
                       <select 
                         id="staffSelect"
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none font-black text-black appearance-none cursor-pointer focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all"
                         value={selectedStaff}
                         onChange={(e) => setSelectedStaff(e.target.value)}
                         required
                       >
                         <option value="">{isAr ? 'اختر الموظف...' : 'Select staff member...'}</option>
                         {users.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                       </select>
                     </div>

                     <div className="space-y-2">
                        <label htmlFor="customMessage" className="text-xs font-black text-black uppercase px-1">{isAr ? 'نص الرسالة' : 'Message Text'}</label>
                        <textarea 
                          id="customMessage"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 outline-none font-black text-black text-sm min-h-[140px] focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all resize-none"
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          required
                        />
                     </div>
                  </div>

                  <div className="space-y-2 relative" ref={calendarRef}>
                     <label className="text-xs font-black text-black uppercase px-1">{isAr ? 'تاريخ الجرد' : 'Inventory Date'}</label>
                     
                     {/* Calendar Trigger */}
                     <button
                        type="button"
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none font-black text-black flex items-center justify-between cursor-pointer focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all ${isCalendarOpen ? 'border-blue-500' : ''}`}
                     >
                       <span>{selectedDate}</span>
                       <ICONS.Calendar className={`w-5 h-5 text-black ${isCalendarOpen ? 'text-blue-500' : ''}`} />
                     </button>

                     {/* Absolute Positioned Hidden Calendar */}
                     {isCalendarOpen && (
                       <div className="absolute top-full left-0 right-0 z-50 mt-2">
                          {renderCalendar()}
                       </div>
                     )}
                  </div>
               </div>

               {/* إعدادات توقيت الإرسال */}
               <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <h4 className="text-xs font-black text-black uppercase tracking-widest mb-4">{isAr ? 'إعدادات وقت الإرسال' : 'Timing Settings'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-black">{isAr ? 'تنبيه قبل 24 ساعة' : 'Reminder 24h Before'}</span>
                        <button 
                          type="button"
                          onClick={() => setSendAdvance(!sendAdvance)}
                          className={`w-12 h-6 rounded-full relative transition-colors ${sendAdvance ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                           <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${sendAdvance ? (isAr ? 'left-1' : 'right-1') : (isAr ? 'left-7' : 'right-7')}`} />
                        </button>
                     </div>
                     <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-black">{isAr ? 'تنبيه نفس اليوم (12:00 م)' : 'Same Day Reminder (12 PM)'}</span>
                        <button 
                          type="button"
                          onClick={() => setSendSameDay(!sendSameDay)}
                          className={`w-12 h-6 rounded-full relative transition-colors ${sendSameDay ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                           <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${sendSameDay ? (isAr ? 'left-1' : 'right-1') : (isAr ? 'left-7' : 'right-7')}`} />
                        </button>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  <div className="space-y-2">
                     <label className="text-xs font-black text-black uppercase px-1">{isAr ? 'طريقة التنبيه' : 'Method'}</label>
                     <div className="flex gap-2">
                        {['WhatsApp', 'Email', 'Both'].map(type => (
                          <button 
                            key={type}
                            type="button"
                            onClick={() => setReminderType(type as any)}
                            className={`flex-1 py-3 rounded-xl border-2 font-black text-xs transition-all ${reminderType === type ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-sm' : 'border-slate-100 bg-slate-50 text-black'}`}
                          >
                            {type}
                          </button>
                        ))}
                     </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-[#0056b3] text-white py-4 rounded-[1.5rem] font-black hover:shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ICONS.Bell className="w-5 h-5" />
                    {isAr ? 'تثبيت الموعد وجدولة التنبيهات' : 'Fix Schedule & Automate'}
                  </button>
               </div>
             </form>
          </div>
        </div>
      )}

      {activeTab === 'review' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-black">{isAr ? 'مراجعة الالتزام (مدعوم بالذكاء الاصطناعي)' : 'Commitment Review (AI Powered)'}</h3>
                  <p className="text-sm text-black font-bold">{isAr ? 'يقوم النظام بتحليل نشاط المستخدم في يوم الجرد ويقترح التقييم المناسب' : 'System analyzes user activity on inventory day and suggests a rating'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {schedules.map(item => {
                    const staff = users.find(u => u.id === item.staff_id);
                    let aiSuggestion = { grade: 'Unrated' as CommitmentGrade, label: isAr ? 'غير محدد' : 'Unrated', color: 'bg-slate-100' };
                    let workedOnDay = false;
                    
                    if (staff) {
                       workedOnDay = samples.some(s => s.finished_by === staff.username && s.finished_at && s.finished_at.startsWith(item.date));
                       const holdCount = holdCases.filter(c => c.finished_by === staff.username && c.is_finished).length; 
                       
                       if (!workedOnDay && new Date(item.date) < new Date()) {
                          aiSuggestion = { grade: 'Poor', label: isAr ? 'AI: لم يتم الجرد (0)' : 'AI: Missed', color: 'bg-rose-100 text-rose-600 border-rose-200' };
                       } else if (workedOnDay) {
                          if (holdCount >= 10) aiSuggestion = { grade: 'Good', label: isAr ? 'AI: ممتاز (جرد + Hold)' : 'AI: Excellent', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
                          else aiSuggestion = { grade: 'Average', label: isAr ? 'AI: متوسط (تم الجرد)' : 'AI: Average', color: 'bg-amber-100 text-amber-600 border-amber-200' };
                       }
                    }

                    return (
                    <div key={item.id} className={`p-6 rounded-[2rem] border transition-all relative overflow-hidden ${item.commitment_grade === 'Unrated' ? 'bg-slate-50 border-slate-200' : 'bg-white border-blue-100 shadow-sm'}`}>
                       {workedOnDay && <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-[2rem] -mr-4 -mt-4"></div>}
                       
                       <div className="flex items-center justify-between mb-4 relative z-10">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs">
                                {item.staff_name.charAt(0)}
                             </div>
                             <div>
                                <p className="font-black text-black text-sm">{item.staff_name}</p>
                                <p className="text-[10px] text-black font-bold">{item.date}</p>
                             </div>
                          </div>
                          
                          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${aiSuggestion.color}`}>
                             {aiSuggestion.label}
                          </div>
                       </div>
                       
                       <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                          {item.send_advance_reminder && <span className="text-[8px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black">24h Alert</span>}
                          {item.send_same_day_reminder && <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black">12PM Alert</span>}
                       </div>

                       {isAdmin && (
                         <div className="grid grid-cols-3 gap-2 relative z-10">
                            <button onClick={() => onUpdateScheduleGrade(item.id, 'Good')} className={`py-2 rounded-xl text-[10px] font-black border transition-all ${item.commitment_grade === 'Good' ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-600 border-emerald-100'}`}>{isAr ? 'ممتاز' : 'Good'}</button>
                            <button onClick={() => onUpdateScheduleGrade(item.id, 'Average')} className={`py-2 rounded-xl text-[10px] font-black border transition-all ${item.commitment_grade === 'Average' ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border-amber-100'}`}>{isAr ? 'متوسط' : 'Average'}</button>
                            <button onClick={() => onUpdateScheduleGrade(item.id, 'Poor')} className={`py-2 rounded-xl text-[10px] font-black border transition-all ${item.commitment_grade === 'Poor' ? 'bg-rose-500 text-white' : 'bg-white text-rose-600 border-rose-100'}`}>{isAr ? 'ضعيف' : 'Poor'}</button>
                         </div>
                       )}
                       
                       <div className="flex items-center justify-between mt-4">
                          <span className="text-[9px] font-bold text-black">Current: {item.commitment_grade || 'None'}</span>
                          <button onClick={() => onDeleteSchedule(item.id)} className="text-[9px] font-black text-rose-400 hover:text-rose-600 uppercase transition-colors">{isAr ? 'حذف' : 'Remove'}</button>
                       </div>
                    </div>
                  );
               })}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffEvaluation;