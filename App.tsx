import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert } from 'lucide-react';
import {
  View,
  Sample,
  HoldCase,
  User,
  UserRole,
  SampleStatus,
  Evaluation,
  InventorySchedule,
  CommitmentGrade
} from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import DataEntryForm from './components/DataEntryForm';
import Dashboard from './components/Dashboard';
import HomeOverview from './components/HomeOverview';
import HoldDashboard from './components/HoldDashboard';
import InventoryTable from './components/InventoryTable';
import HoldCasesView from './components/HoldCasesView';
import PendingCasesRegistry from './components/PendingCasesRegistry';
import StaffEvaluation from './components/StaffEvaluation';
import SettingsView from './components/SettingsView';
import SystemUpdatesView from './components/SystemUpdatesView';
import QuickStartGuide from './components/QuickStartGuide';
import { storageService } from './services/storageService';
import { applyTheme } from './utils/theme';
import EditSampleModal from './components/EditSampleModal';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode; lang: 'ar' | 'en' }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isAr = this.props.lang === 'ar';
      let errorMessage = isAr ? 'حدث خطأ غير متوقع في النظام.' : 'An unexpected system error occurred.';

      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) {
          errorMessage = isAr ? `خطأ في قاعدة البيانات: ${parsed.error}` : `Database Error: ${parsed.error}`;
        }
      } catch (e) {
        if (this.state.error?.message) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-4">
            {isAr ? 'عذراً، حدث خطأ ما' : 'Oops, something went wrong'}
          </h1>
          <div className="bg-white border border-red-100 rounded-2xl p-6 max-w-lg shadow-sm mb-8">
            <p className="text-slate-600 font-medium leading-relaxed">{errorMessage}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-200"
          >
            {isAr ? 'إعادة تحميل الصفحة' : 'Reload Page'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const DEFAULT_FEATURES: View[] = [
  'sample-registration',
  'home',
  'dashboard',
  'inventory',
  'hold-cases',
  'register-pending-cases',
  'hold-dashboard',
  'staff-evaluation',
  'settings',
  'updates'
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedUserId, setLoggedUserId] = useState<string | null>(null);
  const [view, setView] = useState<View>('sample-registration');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [searchQuery, setSearchQuery] = useState('');
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('All');

  const [isLoading, setIsLoading] = useState(false);
  const [isAppReady, setIsAppReady] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [editingSample, setEditingSample] = useState<Sample | null>(null);

  const [samples, setSamples] = useState<Sample[]>([]);
  const [holdCases, setHoldCases] = useState<HoldCase[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [schedules, setSchedules] = useState<InventorySchedule[]>([]);
  const [enabledFeatures, setEnabledFeatures] = useState<View[]>(DEFAULT_FEATURES);

  const getDefaultViewForUser = (user: User, features: View[] = enabledFeatures): View => {
    const availableFeatures = features?.length ? features : DEFAULT_FEATURES;

    const userAllowedViews =
      user.role === UserRole.ADMIN || user.role === 'Admin'
        ? availableFeatures
        : (user.permissions || []).filter(permission => availableFeatures.includes(permission));

    if (userAllowedViews.includes('sample-registration')) return 'sample-registration';
    if (userAllowedViews.includes('dashboard')) return 'dashboard';
    if (userAllowedViews.length > 0) return userAllowedViews[0];

    return 'sample-registration';
  };

  const refreshData = async () => {
    try {
      const [freshSamples, freshHoldCases] = await Promise.all([
        storageService.getSamples(),
        storageService.getHoldCases()
      ]);

      if (freshSamples) setSamples(freshSamples);
      if (freshHoldCases) setHoldCases(freshHoldCases);
    } catch (error) {
      console.error('Refresh data error:', error);
    }
  };

  const loadData = async () => {
    setIsSyncing(true);

    try {
      const fetchPromise = Promise.all([
        storageService.getSamples(),
        storageService.getHoldCases(),
        storageService.getUsers(),
        storageService.getEnabledFeatures(),
        storageService.getEvaluations(),
        storageService.getSchedules(),
        storageService.getTheme()
      ]);

      const timeoutPromise = new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error('Data loading timed out')), 10000)
      );

      const [
        cloudSamples,
        cloudHoldCases,
        cloudUsers,
        cloudFeatures,
        cloudEvals,
        cloudSchedules,
        cloudTheme
      ] = await Promise.race([fetchPromise, timeoutPromise]);

      if (cloudTheme) {
        applyTheme(cloudTheme.primary as any, cloudTheme.isDark);
      }

      const resolvedFeatures =
        cloudFeatures && cloudFeatures.length > 0 ? cloudFeatures : DEFAULT_FEATURES;

      setEnabledFeatures(resolvedFeatures);
      setSamples(cloudSamples || []);
      setHoldCases(cloudHoldCases || []);
      setEvaluations(cloudEvals || []);
      setSchedules(cloudSchedules || []);

      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
      } else {
        const defaultStaff: User[] = [
          {
            id: 'admin-1',
            name: 'System Admin',
            username: 'admin',
            password: 'admin',
            role: UserRole.ADMIN,
            permissions: DEFAULT_FEATURES,
            createdAt: new Date().toISOString(),
            phone: '',
            email: 'admin@lab.com'
          }
        ];
        setUsers(defaultStaff);
        await storageService.saveUsers(defaultStaff);
      }
    } catch (error) {
      console.error('Data Load Error:', error);

      // لا نمسح البيانات القديمة هنا حتى لا تظهر الشاشة فارغة بشكل مضلل
      setEnabledFeatures(DEFAULT_FEATURES);

      if (users.length === 0) {
        const defaultStaff: User[] = [
          {
            id: 'admin-1',
            name: 'System Admin',
            username: 'admin',
            password: 'admin',
            role: UserRole.ADMIN,
            permissions: DEFAULT_FEATURES,
            createdAt: new Date().toISOString(),
            phone: '',
            email: 'admin@lab.com'
          }
        ];
        setUsers(defaultStaff);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // لا يوجد استرجاع جلسة عند فتح التطبيق
  useEffect(() => {
    setIsAuthenticated(false);
    setLoggedUserId(null);
    setView('sample-registration');
    setIsAppReady(true);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    if (isAuthenticated) {
      subscription = storageService.subscribeToChanges(
        () => refreshData(),
        () => refreshData()
      );
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [isAuthenticated]);

  const currentUser: User = useMemo(() => {
    const found = users.find(u => u.id === loggedUserId);
    if (found) return found;

    if (users.length > 0) return users[0];

    return {
      id: 'guest',
      name: 'Guest User',
      username: 'guest',
      role: UserRole.USER,
      permissions: [],
      createdAt: new Date().toISOString(),
      email: '',
      phone: ''
    };
  }, [users, loggedUserId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (currentUser.id === 'guest') return;
    if (users.length === 0) return;

    setView(getDefaultViewForUser(currentUser, enabledFeatures));
  }, [isAuthenticated, currentUser.id, users.length, enabledFeatures]);

  const handleSafeSetView = (nextView: View) => {
    setView(nextView);
  };

  const handleUpdateUser = async (userId: string, data: Partial<User>) => {
    const updatedUsers = users.map(u => (u.id === userId ? { ...u, ...data } : u));
    setUsers(updatedUsers);
    await storageService.saveUsers([updatedUsers.find(u => u.id === userId)!]);
  };

  const handleAddSchedule = async (data: Omit<InventorySchedule, 'id' | 'status'>) => {
    const newSchedule: InventorySchedule = {
      ...data,
      id: crypto.randomUUID(),
      status: 'pending',
      commitment_grade: 'Unrated'
    };
    setSchedules(prev => [newSchedule, ...prev]);
    await storageService.saveSchedules([newSchedule]);
  };

  const handleDeleteSchedule = async (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    await storageService.deleteSchedule(id);
  };

  const handleUpdateScheduleGrade = async (scheduleId: string, grade: CommitmentGrade) => {
    const updatedSchedules = schedules.map(s => (s.id === scheduleId ? { ...s, commitment_grade: grade } : s));
    setSchedules(updatedSchedules);
    await storageService.saveSchedules([updatedSchedules.find(s => s.id === scheduleId)!]);
  };

  const handleMarkFinished = async (id: string) => {
    setSamples(prev =>
      prev.map(s =>
        s.id === id
          ? {
              ...s,
              status: SampleStatus.FINISHED,
              finished_at: new Date().toISOString(),
              finished_by: currentUser.name
            }
          : s
      )
    );

    await storageService.updateSample(id, {
      status: SampleStatus.FINISHED,
      finished_at: new Date().toISOString(),
      finished_by: currentUser.name
    });

    await storageService.logInventoryAction(id, 'FINISH', `Sample finished via Inventory Table`, currentUser.name);
  };

  const handleRateStaff = async (staffId: string, rating: number) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const newEval: Evaluation = {
      id: crypto.randomUUID(),
      staffId,
      staffName: users.find(u => u.id === staffId)?.name || '',
      rating,
      adminId: currentUser.id,
      month: currentMonth,
      createdAt: new Date().toISOString()
    };
    setEvaluations(prev => {
      const filtered = prev.filter(e => !(e.staffId === staffId && e.month === currentMonth));
      return [newEval, ...filtered];
    });
    await storageService.saveEvaluations([newEval]);
  };

  const handleComplete = async (id: string) => {
    setHoldCases(p =>
      p.map(c =>
        c.id === id
          ? {
              ...c,
              is_finished: true,
              finished_at: new Date().toISOString(),
              finished_by: currentUser?.name || ''
            }
          : c
      )
    );
    await storageService.updateHoldCase(id, {
      is_finished: true,
      finished_at: new Date().toISOString(),
      finished_by: currentUser?.name || ''
    });
  };

  const handleUndoComplete = async (id: string) => {
    setHoldCases(p =>
      p.map(c =>
        c.id === id
          ? { ...c, is_finished: false, finished_at: undefined, finished_by: undefined }
          : c
      )
    );
    await storageService.updateHoldCase(id, {
      is_finished: false,
      finished_at: undefined,
      finished_by: undefined
    });
  };

  const handleLogout = async () => {
    await storageService.logout();
    setIsAuthenticated(false);
    setLoggedUserId(null);
    setView('sample-registration');
    setIsAppReady(true);
    setIsLoading(false);
  };

  const filteredSamples = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return samples.filter(
      s =>
        s?.patient_name?.toLowerCase().includes(query) ||
        s?.patient_id?.toLowerCase().includes(query)
    );
  }, [samples, searchQuery]);

  const hasAccess = (viewId: View) => {
    if (!enabledFeatures.includes(viewId)) return false;
    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === 'Admin') return true;
    return currentUser?.permissions?.includes(viewId) ?? false;
  };

  if (isLoading || !isAppReady) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 font-sans">
        <img
          src="/logo.png"
          alt="Loading Logo"
          className="w-24 h-24 animate-pulse mb-8 object-contain opacity-90"
          style={{ filter: 'drop-shadow(0 0 5px #00E5FF) brightness(1.2)' }}
        />
        <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-cyan-500 font-bold tracking-widest animate-pulse">
          {lang === 'ar' ? 'جاري تحميل النظام...' : 'Loading System...'}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Login
        onLogin={async (user) => {
          setIsLoading(true);
          setIsAppReady(false);

          try {
            setLoggedUserId(user.id);
            await loadData();
            setView('sample-registration');
            setIsAuthenticated(true);
          } catch (error) {
            console.error('Login load error:', error);
            setIsAuthenticated(false);
          } finally {
            setIsAppReady(true);
            setIsLoading(false);
          }
        }}
      />
    );
  }

  return (
    <ErrorBoundary lang={lang}>
      <div className="flex min-h-screen bg-blue-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Sidebar
          currentView={view}
          setView={handleSafeSetView}
          lang={lang}
          enabledFeatures={enabledFeatures}
          onLogout={handleLogout}
          currentUser={currentUser}
        />

        <div className="flex-1 flex flex-col min-w-0 relative">
          <Header
            lang={lang}
            setLang={setLang}
            searchQuery={searchQuery}
            setSearchQuery={(q) => {
              setSearchQuery(q);
              if (q && view !== 'inventory') {
                handleSafeSetView('inventory');
              }
            }}
            currentUser={currentUser}
            isSyncing={isSyncing}
            onLogout={handleLogout}
          />

          <div className="absolute inset-0 top-28 z-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
            <div className="opacity-[0.05] contrast-125 transform scale-110">
              <img
                src="/logo.png"
                alt="Watermark"
                className="w-[600px] h-[600px] object-contain"
                style={{
                  filter:
                    'invert(66%) sepia(90%) saturate(2500%) hue-rotate(145deg) brightness(105%) contrast(105%) drop-shadow(0 0 10px #00E5FF)'
                }}
              />
            </div>
          </div>

          <main className="flex-1 p-6 overflow-y-auto relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {!hasAccess(view) ? (
                  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
                      <ShieldAlert className="w-12 h-12 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">
                      {lang === 'ar' ? 'عذراً، لا تملك صلاحية الوصول' : 'Access Denied'}
                    </h2>
                    <p className="text-slate-500 font-medium max-w-md">
                      {lang === 'ar'
                        ? 'ليس لديك الصلاحيات الكافية لعرض هذه الصفحة. يرجى التواصل مع مدير النظام.'
                        : 'You do not have sufficient permissions to view this page. Please contact the system administrator.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {view === 'sample-registration' && (
                      <HomeOverview
                        samples={samples}
                        holdCases={holdCases}
                        schedules={schedules}
                        lang={lang}
                        users={users}
                        setView={handleSafeSetView}
                        currentUser={currentUser}
                        onAddSample={() => handleSafeSetView('home')}
                        onNavigate={(v, filter) => {
                          if (filter) setInventoryFilter(filter);
                          handleSafeSetView(v);
                        }}
                      />
                    )}

                    {view === 'home' && (
                      <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
                        <div className="flex items-center gap-4 mb-4 opacity-50">
                          <div className="h-px bg-slate-300 flex-1"></div>
                          <span className="text-xs font-black text-black uppercase tracking-widest">
                            {lang === 'ar' ? 'منطقة إدخال البيانات' : 'Data Entry Zone'}
                          </span>
                          <div className="h-px bg-slate-300 flex-1"></div>
                        </div>

                        <DataEntryForm
                          lang={lang}
                          onFinish={() => handleSafeSetView('inventory')}
                          onSubmit={async (s) => {
                            const newSample = {
                              patient_name: s.patientName,
                              patient_id: s.patientId,
                              tube_type: s.tubeType,
                              count: s.count,
                              status: s.status,
                              notes: s.notes,
                              created_at: new Date().toISOString(),
                              created_by: currentUser.name
                            };

                            setIsSyncing(true);
                            const inserted = await storageService.addSample(newSample);
                            setIsSyncing(false);

                            if (inserted) {
                              setSamples(p => [inserted, ...p]);
                              await storageService.logInventoryAction(
                                inserted.id,
                                'CREATE',
                                `New sample ${inserted.patient_id} registered`,
                                currentUser.name
                              );
                            }
                          }}
                        />

                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                          <input
                            id="homeSearchInput"
                            aria-label={lang === 'ar' ? 'ابحث هنا لتغيير الحالة إلى Finished...' : 'Search here to mark as Finished...'}
                            type="text"
                            placeholder={lang === 'ar' ? 'ابحث هنا لتغيير الحالة إلى Finished...' : 'Search here to mark as Finished...'}
                            value={homeSearchQuery}
                            onChange={(e) => setHomeSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 outline-none font-bold shadow-inner"
                          />
                        </div>
                      </div>
                    )}

                    {view === 'dashboard' && (
                      <Dashboard samples={samples} lang={lang} currentUser={currentUser} users={users} />
                    )}

                    {view === 'inventory' && (
                      <>
                        <InventoryTable
                          samples={filteredSamples}
                          lang={lang}
                          onDelete={async (id) => {
                            const previousSamples = [...samples];
                            setSamples(p => p.filter(s => s.id !== id));

                            const success = await storageService.deleteSample(id);
                            if (!success) {
                              setSamples(previousSamples);
                            } else {
                              setTimeout(() => refreshData(), 500);
                            }
                          }}
                          onEdit={(sample) => setEditingSample(sample)}
                          onMarkFinished={handleMarkFinished}
                          currentUser={currentUser}
                          users={users}
                          filter={inventoryFilter}
                          onFilterChange={setInventoryFilter}
                        />
                        {editingSample && (
                          <EditSampleModal
                            sample={editingSample}
                            isOpen={!!editingSample}
                            onClose={() => setEditingSample(null)}
                            lang={lang}
                            onSave={async (id, updates) => {
                              try {
                                const finalUpdates: any = { ...updates };

                                if (updates.status === SampleStatus.FINISHED && !updates.finished_at) {
                                  finalUpdates.finished_at = new Date().toISOString();
                                  finalUpdates.finished_by = currentUser.name;
                                }

                                setSamples(prev => prev.map(s => (s.id === id ? { ...s, ...finalUpdates } : s)));

                                await storageService.updateSample(id, finalUpdates);
                                await storageService.logInventoryAction(id, 'UPDATE', 'Sample details updated', currentUser.name);
                                setTimeout(() => refreshData(), 500);
                              } catch (error) {
                                console.error('Error saving sample:', error);
                                throw error;
                              }
                            }}
                          />
                        )}
                      </>
                    )}

                    {view === 'hold-cases' && (
                      <HoldCasesView
                        lang={lang}
                        holdCases={holdCases}
                        onSubmit={async (c) => {
                          const newHoldCase = {
                            patient_name: c.patientName,
                            patient_id: c.patientId,
                            test_type: c.testType,
                            center_name: c.centerName,
                            comment: c.comment,
                            status: c.status,
                            is_finished: false,
                            created_at: new Date().toISOString(),
                            created_by: currentUser.name
                          };

                          setIsSyncing(true);
                          const saved = await storageService.addHoldCase(newHoldCase);
                          setIsSyncing(false);

                          if (saved) {
                            setHoldCases(p => [saved, ...p]);
                          }
                        }}
                        onDelete={async (id) => {
                          setHoldCases(p => p.filter(c => c.id !== id));
                          await storageService.deleteHoldCase(id);
                        }}
                        onComplete={handleComplete}
                        onUndoComplete={handleUndoComplete}
                        currentUser={currentUser}
                      />
                    )}

                    {view === 'register-pending-cases' && (
                      <PendingCasesRegistry
                        lang={lang}
                        holdCases={holdCases}
                        onDelete={async (id) => {
                          setHoldCases(p => p.filter(c => c.id !== id));
                          await storageService.deleteHoldCase(id);
                        }}
                        onComplete={handleComplete}
                        onUndoComplete={handleUndoComplete}
                        currentUser={currentUser}
                      />
                    )}

                    {view === 'hold-dashboard' && (
                      <HoldDashboard holdCases={holdCases} lang={lang} currentUser={currentUser} users={users} />
                    )}

                    {view === 'staff-evaluation' && (
                      <StaffEvaluation
                        lang={lang}
                        users={users}
                        evaluations={evaluations}
                        schedules={schedules}
                        samples={samples}
                        holdCases={holdCases}
                        onRate={handleRateStaff}
                        onAddSchedule={handleAddSchedule}
                        onDeleteSchedule={handleDeleteSchedule}
                        onUpdateUser={handleUpdateUser}
                        currentUser={currentUser}
                        onUpdateScheduleGrade={handleUpdateScheduleGrade}
                      />
                    )}

                    {view === 'settings' && (
                      <SettingsView
                        lang={lang}
                        users={users}
                        setUsers={setUsers}
                        enabledFeatures={enabledFeatures}
                        setEnabledFeatures={setEnabledFeatures}
                      />
                    )}

                    {view === 'updates' && (
                      <SystemUpdatesView lang={lang} onBack={() => handleSafeSetView('sample-registration')} />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <QuickStartGuide lang={lang} />
      </div>
    </ErrorBoundary>
  );
};

export default App;