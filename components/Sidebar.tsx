import React, { useState } from 'react';
import { View, User, UserRole } from '../types';
import {
  LayoutDashboard,
  BarChart3,
  Activity,
  PlusCircle,
  Database,
  FileText,
  ClipboardList,
  Settings,
  Star,
  LogOut,
  ChevronRight,
  History
} from 'lucide-react';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  lang: 'ar' | 'en';
  enabledFeatures: View[];
  onLogout: () => void;
  currentUser: User;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setView,
  lang,
  enabledFeatures,
  onLogout,
  currentUser
}) => {
  const isAr = lang === 'ar';
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === 'Admin';

  const hasAccess = (viewId: View) => {
    if (!enabledFeatures.includes(viewId)) return false;
    if (isAdmin) return true;
    return currentUser.permissions?.includes(viewId) ?? false;
  };

  const menuGroups = [
    {
      title: isAr ? 'لوحة المعلومات' : 'Dashboard',
      items: [
        {
          id: 'sample-registration' as View,
          icon: LayoutDashboard,
          label: isAr ? 'لوحة التحكم الرئيسية' : 'Main Dashboard'
        },
        {
          id: 'dashboard' as View,
          icon: BarChart3,
          label: isAr ? 'تقرير الثلاجة' : 'Fridge Report'
        },
        {
          id: 'hold-dashboard' as View,
          icon: Activity,
          label: isAr ? 'إحصائيات Hold' : 'Hold Stats'
        },
      ]
    },
    {
      title: isAr ? 'العينات' : 'Samples',
      items: [
        {
          id: 'home' as View,
          icon: PlusCircle,
          label: isAr ? 'تسجيل عينة جديدة' : 'New Entry'
        },
        {
          id: 'inventory' as View,
          icon: Database,
          label: isAr ? 'سجل العينات' : 'Inventory'
        },
      ]
    },
    {
      title: isAr ? 'الحالات المعلقة' : 'Holds',
      items: [
        {
          id: 'hold-cases' as View,
          icon: FileText,
          label: isAr ? 'تسجيل Hold' : 'Hold Entry'
        },
        {
          id: 'register-pending-cases' as View,
          icon: ClipboardList,
          label: isAr ? 'سجل الحالات المعلقة' : 'Pending Log'
        },
      ]
    },
    {
      title: isAr ? 'الإدارة' : 'Management',
      items: [
        {
          id: 'staff-evaluation' as View,
          icon: Star,
          label: isAr ? 'تقييم الموظفين' : 'Evaluation'
        },
        {
          id: 'settings' as View,
          icon: Settings,
          label: isAr ? 'إدارة النظام' : 'Settings'
        },
        {
          id: 'updates' as View,
          icon: History,
          label: isAr ? 'تحديثات النظام' : 'Updates'
        },
      ]
    }
  ];

  return (
    <aside
      className={`bg-slate-900 ${isAr ? 'border-l' : 'border-r'} border-slate-800 flex flex-col h-screen sticky top-0 shadow-2xl z-50 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-72'}`}
    >
      {/* Header / Logo */}
      <div className="py-8 flex flex-col items-center justify-center">
        {!isCollapsed ? (
          <div className="flex flex-col items-center gap-0">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-[180px] w-auto"
              style={{
                filter: 'brightness(0) invert(1) drop-shadow(0 0 6px #00E5FF) drop-shadow(0 0 12px #00E5FF)'
              }}
            />
            <span className="font-medium text-white tracking-[0.1em] uppercase text-xs text-center mt-0">
              GENEOPS ADMINISTRATION SYSTEM
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-[90px] w-auto"
              style={{
                filter: 'brightness(0) invert(1) drop-shadow(0 0 6px #00E5FF)'
              }}
            />
          </div>
        )}
      </div>

      <div className="px-6 mb-4">
        <div className="h-px bg-slate-800 w-full"></div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-2 space-y-6">
        {menuGroups.map((group, idx) => {
          const visibleGroupItems = group.items.filter(item => hasAccess(item.id));
          if (visibleGroupItems.length === 0) return null;

          return (
            <div key={idx} className="px-3">
              {!isCollapsed && (
                <h3 className="px-4 mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  {group.title}
                  <div className="h-px bg-slate-800 flex-1"></div>
                </h3>
              )}

              <div className="space-y-1">
                {visibleGroupItems.map(item => {
                  const isActive = currentView === item.id;

                  return (
                    <button
                      key={`${group.title}-${item.id}`}
                      onClick={() => setView(item.id)}
                      title={isCollapsed ? item.label : ''}
                      type="button"
                      className={`w-full flex items-center ${
                        isCollapsed
                          ? 'justify-center'
                          : isAr
                            ? 'justify-end flex-row-reverse'
                            : 'justify-start'
                      } gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out group ${
                        isActive
                          ? 'bg-blue-800/50 text-white border border-blue-500/20 shadow-inner'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center transition-all duration-200 ease-in-out flex-shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                        }`}
                      >
                        <item.icon
                          strokeWidth={isActive ? 2.5 : 2}
                          className="w-5 h-5"
                          style={isActive ? { filter: 'drop-shadow(0 0 3px #00E5FF)' } : {}}
                        />
                      </div>

                      {!isCollapsed && (
                        <span className={`font-bold text-sm flex-1 ${isAr ? 'text-right' : 'text-left'}`}>
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          type="button"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200 ease-in-out group`}
          title={
            isAr
              ? (isCollapsed ? 'توسيع القائمة' : 'طي القائمة')
              : (isCollapsed ? 'Expand Menu' : 'Collapse Menu')
          }
        >
          {!isCollapsed && (
            <span className="font-bold text-sm">
              {isAr ? 'طي القائمة' : 'Collapse Menu'}
            </span>
          )}

          <div className="flex items-center justify-center transition-all duration-200 ease-in-out flex-shrink-0 text-slate-400 group-hover:text-white">
            <ChevronRight
              strokeWidth={2}
              className={`w-5 h-5 transition-transform duration-200 ${
                isCollapsed ? (isAr ? 'rotate-180' : '') : (isAr ? '' : 'rotate-180')
              }`}
            />
          </div>
        </button>

        <button
          onClick={onLogout}
          type="button"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 ease-in-out group`}
          title={isAr ? 'خروج من النظام' : 'Logout'}
        >
          {!isCollapsed && (
            <span className="font-bold text-sm">
              {isAr ? 'خروج من النظام' : 'Logout'}
            </span>
          )}

          <div className="flex items-center justify-center transition-all duration-200 ease-in-out flex-shrink-0 text-slate-400 group-hover:text-rose-400">
            <LogOut strokeWidth={2} className="w-5 h-5" />
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;