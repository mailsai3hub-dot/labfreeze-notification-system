import React, { useState, useEffect } from 'react';
import { User, UserRole, View } from '../types';
import { ICONS } from '../constants';
import AddStaffModal from './AddStaffModal';
import { storageService } from '../services/storageService';
import { THEMES, applyTheme } from '../utils/theme';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig as appFirebaseConfig } from '../lib/firebase';

interface SettingsViewProps {
  lang: 'ar' | 'en';
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  enabledFeatures: View[];
  setEnabledFeatures: React.Dispatch<React.SetStateAction<View[]>>;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  lang,
  users,
  setUsers,
  enabledFeatures,
  setEnabledFeatures
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'users' | 'features' | 'theme' | 'database'>('users');
  const [showForm, setShowForm] = useState<'add' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [currentTheme, setCurrentTheme] = useState<{ primary: keyof typeof THEMES; isDark: boolean }>({
    primary: 'blue',
    isDark: false
  });

  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDNVmeqq8lYqOgI51-AbC3_shGD5OTrSPw',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'labfreeze-web-manager-2026.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'labfreeze-web-manager-2026',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'labfreeze-web-manager-2026.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '462307237061',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:462307237061:web:b932842b1225fc6bfc64ac'
  });

  useEffect(() => {
    const stored = localStorage.getItem('FIREBASE_CONFIG_OVERRIDE');
    if (stored) {
      setFirebaseConfig(JSON.parse(stored));
    }
  }, []);

  const handleSaveConfig = () => {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      alert(isAr ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    localStorage.setItem('FIREBASE_CONFIG_OVERRIDE', JSON.stringify(firebaseConfig));
    alert(isAr ? 'تم حفظ الإعدادات. سيتم إعادة تحميل الصفحة.' : 'Settings saved. Page will reload.');
    window.location.reload();
  };

  const handleResetConfig = () => {
    if (confirm(isAr ? 'هل أنت متأكد من استعادة الإعدادات الافتراضية؟' : 'Are you sure you want to restore default settings?')) {
      localStorage.removeItem('FIREBASE_CONFIG_OVERRIDE');
      alert(isAr ? 'تم استعادة الإعدادات الافتراضية. سيتم إعادة تحميل الصفحة.' : 'Default settings restored. Page will reload.');
      window.location.reload();
    }
  };

  useEffect(() => {
    const loadTheme = async () => {
      const theme = await storageService.getTheme();
      if (theme) {
        setCurrentTheme(theme as { primary: keyof typeof THEMES; isDark: boolean });
        applyTheme(theme.primary as keyof typeof THEMES, theme.isDark);
      }
    };
    loadTheme();
  }, []);

  const handleThemeChange = async (primary: keyof typeof THEMES, isDark: boolean) => {
    const newTheme = { primary, isDark };
    setCurrentTheme(newTheme);
    applyTheme(primary, isDark);
    await storageService.saveTheme(newTheme);
  };

  const featureList: { id: View; labelAr: string; labelEn: string; icon: any }[] = [
    { id: 'sample-registration', labelAr: 'لوحة التحكم الرئيسية', labelEn: 'Main Dashboard', icon: ICONS.LayoutDashboard },
    { id: 'home', labelAr: 'تسجيل عينة جديدة', labelEn: 'New Sample Entry', icon: ICONS.Plus },
    { id: 'dashboard', labelAr: 'تقرير الثلاجة', labelEn: 'Fridge Report', icon: ICONS.BarChart },
    { id: 'inventory', labelAr: 'سجل العينات', labelEn: 'Inventory', icon: ICONS.Filter },
    { id: 'hold-cases', labelAr: 'تسجيل Hold', labelEn: 'Hold Entry', icon: ICONS.FileText },
    { id: 'register-pending-cases', labelAr: 'سجل الحالات المعلقة', labelEn: 'Pending Registry', icon: ICONS.Register },
    { id: 'hold-dashboard', labelAr: 'إحصائيات Hold', labelEn: 'Hold Dashboard', icon: ICONS.Activity },
    { id: 'staff-evaluation', labelAr: 'تقييم الموظفين', labelEn: 'Staff Evaluation', icon: ICONS.Star },
    { id: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings', icon: ICONS.Settings },
    { id: 'updates', labelAr: 'تحديثات النظام', labelEn: 'System Updates', icon: ICONS.History },
  ];

  const handleToggleFeature = (featureId: View) => {
    if (featureId === 'settings' || featureId === 'sample-registration') return;
    setEnabledFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setShowForm('edit');
  };

  const handleSaveUser = async (data: Partial<User>) => {
    if (showForm === 'add') {
      let uid = crypto.randomUUID() as string;
      let finalEmail = data.email;

      try {
        const secondaryApp =
          getApps().find(app => app.name === 'SecondaryApp') || initializeApp(appFirebaseConfig, 'SecondaryApp');
        const secondaryAuth = getAuth(secondaryApp);

        if (!finalEmail) {
          finalEmail = `${data.username?.toLowerCase().trim()}@lab.com`;
        }

        if (!data.password || data.password.trim().length < 6) {
          throw new Error(isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters long');
        }

        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, data.password);
        uid = userCredential.user.uid;

        await secondaryAuth.signOut();
      } catch (error: any) {
        console.error('Error creating user in Firebase Auth:', error);
        alert(isAr ? `خطأ في إنشاء المستخدم: ${error.message}` : `Error creating user: ${error.message}`);
        return;
      }

      const newUser: User = {
        id: uid,
        name: data.name!,
        username: data.username!,
        password: data.password!,
        role: data.role || UserRole.USER,
        phone: data.phone,
        email: finalEmail,
        permissions: data.permissions || ['home'],
        createdAt: new Date().toISOString()
      };

      const newUsers = [...users, newUser];
      setUsers(newUsers);
      await storageService.saveUsers(newUsers);
      alert(isAr ? 'تم إضافة المستخدم بنجاح' : 'User added successfully');
    } else if (showForm === 'edit' && editingUser) {
      const updatedUsers = users.map(u =>
        u.id === editingUser.id
          ? {
              ...u,
              ...data,
              password: data.password ? data.password : u.password
            }
          : u
      );
      setUsers(updatedUsers);
      await storageService.saveUsers(updatedUsers);
      alert(isAr ? 'تم تحديث البيانات بنجاح' : 'Data updated successfully');
    }

    setShowForm(null);
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (userId === 'admin-1') {
      alert(isAr ? 'لا يمكن حذف مدير النظام الأساسي' : 'Cannot delete the primary system admin');
      return;
    }

    if (
      !confirm(
        isAr
          ? `هل أنت متأكد من حذف المستخدم "${userToDelete.name}"؟`
          : `Are you sure you want to delete user "${userToDelete.name}"?`
      )
    ) {
      return;
    }

    try {
      await storageService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      alert(isAr ? 'تم حذف المستخدم بنجاح' : 'User deleted successfully');
    } catch (error) {
      console.error('Delete user error:', error);
      alert(isAr ? 'حدث خطأ أثناء حذف المستخدم' : 'An error occurred while deleting the user');
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 font-['Cairo']">
      <AddStaffModal
        isOpen={!!showForm}
        onClose={() => setShowForm(null)}
        onSave={handleSaveUser}
        userToEdit={editingUser}
      />

      <div className="bg-white/20 backdrop-blur-md rounded-[2.5rem] shadow-sm border border-white/30 overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-5 font-black flex items-center justify-center gap-3 transition-all
              ${activeTab === 'users' ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600' : 'text-black hover:text-black'}`}
          >
            <ICONS.Users className="w-5 h-5" />
            {isAr ? 'إدارة الموظفين' : 'Staff Management'}
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`flex-1 py-5 font-black flex items-center justify-center gap-3 transition-all
              ${activeTab === 'features' ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600' : 'text-black hover:text-black'}`}
          >
            <ICONS.Shield className="w-5 h-5" />
            {isAr ? 'صلاحيات البرنامج' : 'Program Permissions'}
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex-1 py-5 font-black flex items-center justify-center gap-3 transition-all
              ${activeTab === 'theme' ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600' : 'text-black hover:text-black'}`}
          >
            <ICONS.Settings className="w-5 h-5" />
            {isAr ? 'المظهر والألوان' : 'Theme & Colors'}
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex-1 py-5 font-black flex items-center justify-center gap-3 transition-all
              ${activeTab === 'database' ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600' : 'text-black hover:text-black'}`}
          >
            <ICONS.Database className="w-5 h-5" />
            {isAr ? 'قاعدة البيانات' : 'Database Config'}
          </button>
        </div>

        <div className="p-10">
          {activeTab === 'database' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-black">{isAr ? 'إعدادات قاعدة البيانات' : 'Database Configuration'}</h3>
                  <p className="text-sm text-black font-bold">{isAr ? 'ربط النظام بقاعدة بيانات Firebase الخاصة بك' : 'Connect the system to your own Firebase project'}</p>
                </div>
                <button
                  onClick={handleResetConfig}
                  className="text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-xl font-bold text-xs transition-colors"
                >
                  {isAr ? 'استعادة الافتراضي' : 'Restore Default'}
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
                <ICONS.AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-amber-700 text-base mb-1">{isAr ? 'تنبيه هام' : 'Important Note'}</h4>
                  <p className="text-sm text-amber-600/80 font-bold leading-relaxed">
                    {isAr
                      ? 'تغيير هذه الإعدادات سيقوم بفصل النظام عن قاعدة البيانات الحالية. تأكد من نسخ بياناتك احتياطياً. سيتم إعادة تحميل الصفحة عند الحفظ.'
                      : 'Changing these settings will disconnect the system from the current database. Make sure to backup your data. The page will reload upon saving.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="apiKey" className="text-xs font-black text-black uppercase tracking-wider mb-2 block">API Key</label>
                  <input
                    id="apiKey"
                    type="text"
                    value={firebaseConfig.apiKey}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, apiKey: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="AIzaSy..."
                  />
                </div>
                <div>
                  <label htmlFor="authDomain" className="text-xs font-black text-black uppercase tracking-wider mb-2 block">Auth Domain</label>
                  <input
                    id="authDomain"
                    type="text"
                    value={firebaseConfig.authDomain}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, authDomain: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="project-id.firebaseapp.com"
                  />
                </div>
                <div>
                  <label htmlFor="projectId" className="text-xs font-black text-black uppercase tracking-wider mb-2 block">Project ID</label>
                  <input
                    id="projectId"
                    type="text"
                    value={firebaseConfig.projectId}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="project-id"
                  />
                </div>
                <div>
                  <label htmlFor="storageBucket" className="text-xs font-black text-black uppercase tracking-wider mb-2 block">Storage Bucket</label>
                  <input
                    id="storageBucket"
                    type="text"
                    value={firebaseConfig.storageBucket}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, storageBucket: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="project-id.appspot.com"
                  />
                </div>
                <div>
                  <label htmlFor="messagingSenderId" className="text-xs font-black text-black uppercase tracking-wider mb-2 block">Messaging Sender ID</label>
                  <input
                    id="messagingSenderId"
                    type="text"
                    value={firebaseConfig.messagingSenderId}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, messagingSenderId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <label htmlFor="appId" className="text-xs font-black text-black uppercase tracking-wider mb-2 block">App ID</label>
                  <input
                    id="appId"
                    type="text"
                    value={firebaseConfig.appId}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, appId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="1:123456789:web:..."
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                >
                  <ICONS.Save className="w-5 h-5" />
                  {isAr ? 'حفظ وإعادة التشغيل' : 'Save & Restart'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-black">{isAr ? 'دليل المستخدمين' : 'User Directory'}</h3>
                  <p className="text-sm text-black font-bold">{isAr ? 'إدارة بيانات التواصل وصلاحيات الوصول' : 'Manage contact info and access levels'}</p>
                </div>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setShowForm('add');
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black flex items-center gap-3 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
                >
                  <ICONS.UserPlus className="w-5 h-5" />
                  {isAr ? 'إضافة موظف جديد' : 'Add New Staff'}
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-[2.5rem] shadow-sm">
                <table className="w-full text-right">
                  <thead className="bg-slate-50/50 text-black text-xs uppercase font-black tracking-widest border-b">
                    <tr>
                      <th className="px-10 py-6">{isAr ? 'الموظف' : 'Staff'}</th>
                      <th className="px-10 py-6">{isAr ? 'تواصل' : 'Contact'}</th>
                      <th className="px-10 py-6">{isAr ? 'مستخدم' : 'Username'}</th>
                      <th className="px-10 py-6">{isAr ? 'صلاحية' : 'Role'}</th>
                      <th className="px-10 py-6 text-center">{isAr ? 'عمليات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-blue-50/20 group transition-all">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-black text-lg border border-blue-200">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-black text-base">{user.name}</p>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border shadow-sm ${user.role === UserRole.ADMIN ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                                  {user.role}
                                </span>
                              </div>
                              <p className="text-xs text-black font-bold mt-0.5">
                                {user.permissions?.length || 0} {isAr ? 'صلاحيات' : 'Permissions'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-black">{user.phone || 'N/A'}</span>
                            <span className="text-xs font-bold text-black">{user.email || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <span className="text-sm font-mono font-black text-black bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
                            @{user.username}
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase border shadow-sm ${user.role === UserRole.ADMIN ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleOpenEdit(user)} className="p-2.5 text-blue-600 hover:bg-white hover:shadow-md rounded-xl transition-all">
                              <ICONS.Edit2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="p-2.5 text-rose-500 hover:bg-white hover:shadow-md rounded-xl transition-all">
                              <ICONS.Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-black">{isAr ? 'تخصيص الواجهة (عام)' : 'Global Feature Visibility'}</h3>
                  <p className="text-sm text-black font-bold">{isAr ? 'إخفاء الموديولات من القائمة الجانبية لكافة المستخدمين' : 'Toggle modules to show or hide them from the main sidebar globally'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featureList.map((feature) => (
                  <div key={feature.id} className={`p-8 rounded-[2.5rem] border-2 flex items-center justify-between transition-all duration-300 ${enabledFeatures.includes(feature.id) ? 'border-blue-500 bg-blue-50/20 shadow-xl shadow-blue-500/5' : 'border-slate-100 opacity-60 grayscale'}`}>
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${enabledFeatures.includes(feature.id) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-black'}`}>
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-black text-base leading-tight">{isAr ? feature.labelAr : feature.labelEn}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFeature(feature.id)}
                      disabled={feature.id === 'settings' || feature.id === 'sample-registration'}
                      className={`w-14 h-7 rounded-full relative transition-all duration-300 ${enabledFeatures.includes(feature.id) ? 'bg-blue-600' : 'bg-slate-300'} ${feature.id === 'settings' || feature.id === 'sample-registration' ? 'opacity-30' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${enabledFeatures.includes(feature.id) ? (isAr ? 'left-1' : 'right-1') : (isAr ? 'left-8' : 'right-8')}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-black">{isAr ? 'المظهر والألوان' : 'Theme & Colors'}</h3>
                  <p className="text-sm text-black font-bold">{isAr ? 'تخصيص ألوان البرنامج والوضع الليلي' : 'Customize application colors and dark mode'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-8 rounded-[2.5rem] border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${currentTheme.isDark ? 'bg-slate-800 text-white' : 'bg-white text-black border border-slate-200'}`}>
                      {currentTheme.isDark ? <ICONS.Moon className="w-6 h-6" /> : <ICONS.Sun className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-black text-black text-lg leading-tight">{isAr ? 'الوضع الليلي' : 'Dark Mode'}</p>
                      <p className="text-xs text-black font-bold">{isAr ? 'تفعيل الألوان الداكنة للبرنامج' : 'Enable dark colors for the application'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleThemeChange(currentTheme.primary, !currentTheme.isDark)}
                    className={`w-14 h-7 rounded-full relative transition-all duration-300 ${currentTheme.isDark ? 'bg-blue-600' : 'bg-slate-300'} cursor-pointer hover:scale-105 active:scale-95`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${currentTheme.isDark ? (isAr ? 'left-1' : 'right-1') : (isAr ? 'left-8' : 'right-8')}`} />
                  </button>
                </div>

                <div className="p-8 rounded-[2.5rem] border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
                      <ICONS.Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-black text-lg leading-tight">{isAr ? 'اللون الأساسي' : 'Primary Color'}</p>
                      <p className="text-xs text-black font-bold">{isAr ? 'اختر اللون الرئيسي لواجهة المستخدم' : 'Choose the main color for the UI'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((colorKey) => (
                      <button
                        key={colorKey}
                        onClick={() => handleThemeChange(colorKey, currentTheme.isDark)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${currentTheme.primary === colorKey ? 'ring-4 ring-offset-2 ring-blue-500 scale-110' : 'ring-1 ring-slate-200'}`}
                        style={{ backgroundColor: `rgb(${THEMES[colorKey][500]})` }}
                        title={colorKey}
                      >
                        {currentTheme.primary === colorKey && <ICONS.Check className="w-5 h-5 text-white drop-shadow-md" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;