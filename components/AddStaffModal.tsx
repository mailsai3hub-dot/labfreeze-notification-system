import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, UserRole, View } from '../types';
import { ICONS } from '../constants';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Partial<User>) => void;
  userToEdit?: User | null;
}

const AddStaffModal: React.FC<AddStaffModalProps> = ({ isOpen, onClose, onSave, userToEdit }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'permissions'>('info');
  
  const [formData, setFormData] = useState<{
    name: string;
    username: string;
    password: string;
    role: UserRole;
    phone: string;
    email: string;
    permissions: View[];
  }>({ 
    name: '', 
    username: '', 
    password: '', 
    role: UserRole.USER,
    phone: '',
    email: '',
    permissions: ['home', 'sample-registration', 'dashboard', 'inventory', 'hold-cases', 'register-pending-cases', 'hold-dashboard', 'staff-evaluation', 'settings', 'updates']
  });

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        name: userToEdit.name,
        username: userToEdit.username,
        password: '', // Don't show password
        role: userToEdit.role,
        phone: userToEdit.phone || '',
        email: userToEdit.email || '',
        permissions: userToEdit.permissions || ['home', 'sample-registration', 'dashboard', 'inventory', 'hold-cases', 'register-pending-cases', 'hold-dashboard', 'staff-evaluation', 'settings', 'updates']
      });
    } else {
      setFormData({ 
        name: '', 
        username: '', 
        password: '', 
        role: UserRole.USER, 
        phone: '', 
        email: '', 
        permissions: ['home', 'sample-registration', 'dashboard', 'inventory', 'hold-cases', 'register-pending-cases', 'hold-dashboard', 'staff-evaluation', 'settings', 'updates'] 
      });
    }
    setActiveTab('info');
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.username.trim()) {
      alert('يرجى إدخال الاسم واسم المستخدم');
      setActiveTab('info');
      return;
    }

    if (!userToEdit && !formData.password.trim()) {
      alert('يرجى إدخال كلمة المرور للمستخدم الجديد');
      setActiveTab('info');
      return;
    }

    if (!userToEdit && formData.password.trim().length < 6) {
      alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setActiveTab('info');
      return;
    }

    onSave(formData);
    onClose();
  };

  const featureList: { id: View; labelAr: string; labelEn: string; icon: any }[] = [
    { id: 'sample-registration', labelAr: 'لوحة التحكم الرئيسية', labelEn: 'Overview', icon: ICONS.LayoutDashboard },
    { id: 'dashboard', labelAr: 'التقارير والإحصائيات', labelEn: 'Reports', icon: ICONS.BarChart },
    { id: 'hold-dashboard', labelAr: 'إحصائيات Hold', labelEn: 'Hold Stats', icon: ICONS.Activity },
    { id: 'home', labelAr: 'تسجيل عينة جديدة', labelEn: 'New Entry', icon: ICONS.Plus },
    { id: 'inventory', labelAr: 'سجل العينات', labelEn: 'Inventory', icon: ICONS.Database },
    { id: 'hold-cases', labelAr: 'تسجيل Hold', labelEn: 'Hold Entry', icon: ICONS.FileText },
    { id: 'register-pending-cases', labelAr: 'سجل الحالات المعلقة', labelEn: 'Pending Log', icon: ICONS.Register },
    { id: 'staff-evaluation', labelAr: 'تقييم الموظفين', labelEn: 'Evaluation', icon: ICONS.Star },
    { id: 'settings', labelAr: 'إدارة النظام', labelEn: 'Settings', icon: ICONS.Settings },
    { id: 'updates', labelAr: 'تحديثات النظام', labelEn: 'Updates', icon: ICONS.History },
  ];

  const togglePermission = (id: View) => {
    setFormData(prev => {
      const perms = prev.permissions.includes(id) 
        ? prev.permissions.filter(p => p !== id)
        : [...prev.permissions, id];
      return { ...prev, permissions: perms };
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-md border border-white/20 w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 font-['Cairo'] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/20 flex items-center justify-between bg-white/40 shrink-0">
          <div>
            <h2 className="text-xl font-black text-black">
              {userToEdit ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-1">
              يرجى إدخال البيانات بدقة
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-colors"
          >
            <ICONS.X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-4 flex gap-4 border-b border-white/20 bg-white/20 shrink-0">
          <button 
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'info' ? 'text-cyan-600 border-cyan-600' : 'text-slate-500 border-transparent hover:text-black'}`}
          >
            البيانات الشخصية
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'permissions' ? 'text-cyan-600 border-cyan-600' : 'text-slate-500 border-transparent hover:text-black'}`}
          >
            الصلاحيات
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 min-h-0">
          
          {activeTab === 'info' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="staffName" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">الاسم الكامل</label>
                  <input 
                    id="staffName"
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    placeholder="مثال: أحمد محمد"
                  />
                </div>

                <div>
                  <label htmlFor="staffUsername" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">اسم المستخدم</label>
                  <input 
                    id="staffUsername"
                    type="text" 
                    required
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    className="w-full bg-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    placeholder="مثال: mahmoud_2026"
                  />
                </div>

                <div>
                  <label htmlFor="staffPassword" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">كلمة المرور</label>
                  <input 
                    id="staffPassword"
                    type="password" 
                    required={!userToEdit}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    placeholder={userToEdit ? '********' : ''}
                  />
                  {userToEdit && (
                    <p className="text-[10px] text-amber-600 mt-1 font-bold">
                      تنبيه: تغيير كلمة المرور هنا لن يغيرها في نظام تسجيل الدخول لأسباب أمنية.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="staffRole" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">الدور الوظيفي</label>
                  <select 
                    id="staffRole"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full bg-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                  >
                    <option value={UserRole.USER}>موظف</option>
                    <option value={UserRole.ADMIN}>مدير</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="staffPhone" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">رقم الهاتف</label>
                  <input 
                    id="staffPhone"
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="staffEmail" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">البريد الإلكتروني</label>
                  <input 
                    id="staffEmail"
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-white/50 border border-white/30 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                  />
                  {!userToEdit && (
                    <p className="text-[10px] text-slate-500 mt-1 font-bold">
                      * إذا تُرك فارغاً، سيتم إنشاء بريد تلقائي
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4">
              {formData.role === UserRole.ADMIN ? (
                <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-2xl">
                  <ICONS.Shield className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="text-amber-800 font-black mb-1">صلاحيات كاملة</h3>
                  <p className="text-amber-600 text-sm font-bold">المدير لديه كافة الصلاحيات في النظام ولا يحتاج لتحديد صلاحيات مخصصة.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, permissions: featureList.map(f => f.id) }))}
                      className="text-xs font-bold text-cyan-600 hover:text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      تحديد الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, permissions: [] }))}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {featureList.map(feature => (
                      <div 
                        key={feature.id}
                        onClick={() => togglePermission(feature.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${formData.permissions.includes(feature.id) ? 'bg-cyan-50 border-cyan-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${formData.permissions.includes(feature.id) ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <feature.icon className="w-4 h-4" />
                        </div>
                        <span className={`text-xs font-bold ${formData.permissions.includes(feature.id) ? 'text-cyan-700' : 'text-slate-700'}`}>
                          {feature.labelAr}
                        </span>
                        {formData.permissions.includes(feature.id) && (
                          <ICONS.Check className="w-4 h-4 text-cyan-500 ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/20 bg-white/40 flex gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-black text-slate-500 hover:bg-white hover:shadow-sm transition-all text-xs border border-transparent hover:border-slate-200"
          >
            إلغاء
          </button>
          <button 
            type="submit"
            className="flex-[2] bg-gradient-to-r from-cyan-500 to-teal-500 text-black py-3.5 rounded-xl font-black shadow-lg shadow-cyan-500/20 hover:from-cyan-600 hover:to-teal-600 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <ICONS.Save className="w-4 h-4" />
            {userToEdit ? 'حفظ التعديلات' : 'حفظ'}
          </button>
        </div>

      </form>
    </div>,
    document.body
  );
};

export default AddStaffModal;
