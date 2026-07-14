// layout.tsx (admin layout with auth guard & sidebar)
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  LayoutDashboard,
  ClipboardList,
  QrCode,
  LogOut,
  Menu,
  X,
  Sparkles,
  Lock,
  LineChart,
  GraduationCap,
  CloudDownload
} from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sprawdzamy sesję przy załadowaniu i zmianie ścieżki
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        // Jeśli nie ma sesji i jesteśmy w podkatalogu admina, przekieruj do /admin
        if (pathname !== '/admin') {
          router.push('/admin');
        }
      } else {
        setUser(session.user);
        // Jeśli jest sesja i jesteśmy na stronie logowania, przekieruj do dashboardu
        if (pathname === '/admin') {
          router.push('/admin/dashboard');
        }
      }
      setLoading(false);
    };

    checkAuth();

    // Słuchamy zmian stanu uwierzytelniania w Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        if (pathname !== '/admin') router.push('/admin');
      } else {
        setUser(session.user);
        if (pathname === '/admin') router.push('/admin/dashboard');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcf9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#1a2a3a] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-light text-sm">Weryfikacja autoryzacji...</p>
        </div>
      </div>
    );
  }

  // Dla ekranu logowania (/admin) zwracamy czystą treść bez panelu bocznego
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#fcfcf9] flex">
      {/* 1. BOCZNY PANEL NAWIGACYJNY (DESKTOP) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#1a2a3a] text-white border-r border-[#2b3c4f] shrink-0">
        <div className="p-6 border-b border-[#2b3c4f]">
          <div className="flex items-center gap-2 text-[#c5a059] font-serif text-lg font-bold">
            <Sparkles className="w-5 h-5 fill-current" />
            <span>Admin Panel</span>
          </div>
          <div className="text-xs text-gray-400 font-light mt-1">Stolica eXperymentu</div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/admin/dashboard"
            aria-current={pathname === '/admin/dashboard' ? 'page' : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
              pathname === '/admin/dashboard' ? 'bg-[#c5a059] text-white font-bold shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard KPI</span>
          </Link>

          <Link
            href="/admin/surveys"
            aria-current={pathname.startsWith('/admin/surveys') ? 'page' : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
              pathname.startsWith('/admin/surveys') ? 'bg-[#c5a059] text-white font-bold shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span>Zarządzaj Ankietami</span>
          </Link>

          <Link
            href="/admin/analytics"
            aria-current={pathname === '/admin/analytics' ? 'page' : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
              pathname === '/admin/analytics' ? 'bg-[#c5a059] text-white font-bold shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LineChart className="w-5 h-5" />
            <span>Analityka</span>
          </Link>

          <Link
            href="/admin/analytics/klasy"
            aria-current={pathname === '/admin/analytics/klasy' ? 'page' : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
              pathname === '/admin/analytics/klasy' ? 'bg-[#c5a059] text-white font-bold shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <GraduationCap className="w-5 h-5" />
            <span>Ewaluacja Klas</span>
          </Link>

          <Link
            href="/admin/codes"
            aria-current={pathname === '/admin/codes' ? 'page' : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
              pathname === '/admin/codes' ? 'bg-[#c5a059] text-white font-bold shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span>Kody Uczniów</span>
          </Link>

          <Link
            href="/admin/import-sheet"
            aria-current={pathname === '/admin/import-sheet' ? 'page' : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
              pathname === '/admin/import-sheet' ? 'bg-[#c5a059] text-white font-bold shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <CloudDownload className="w-5 h-5" />
            <span>Import z Arkusza</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-[#2b3c4f] space-y-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
            <Lock className="w-4 h-4 text-[#c5a059]" />
            <span className="text-[10px] text-gray-300 font-mono truncate">{user?.email}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Wyloguj się</span>
          </button>
        </div>
      </aside>

      {/* 2. MENU MOBILNE (MOBILE DRAWER) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setSidebarOpen(false)}>
          <aside className="w-64 h-full bg-[#1a2a3a] text-white flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#2b3c4f] flex justify-between items-center">
              <div className="flex items-center gap-2 text-[#c5a059] font-serif text-lg font-bold">
                <Sparkles className="w-5 h-5 fill-current" />
                <span>Admin Panel</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} aria-label="Zamknij menu">
                <X className="w-6 h-6 text-gray-400 hover:text-white" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              <Link
                href="/admin/dashboard"
                onClick={() => setSidebarOpen(false)}
                aria-current={pathname === '/admin/dashboard' ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                  pathname === '/admin/dashboard' ? 'bg-[#c5a059] text-white font-bold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard KPI</span>
              </Link>

              <Link
                href="/admin/surveys"
                onClick={() => setSidebarOpen(false)}
                aria-current={pathname.startsWith('/admin/surveys') ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                  pathname.startsWith('/admin/surveys') ? 'bg-[#c5a059] text-white font-bold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <ClipboardList className="w-5 h-5" />
                <span>Zarządzaj Ankietami</span>
              </Link>

              <Link
                href="/admin/analytics"
                onClick={() => setSidebarOpen(false)}
                aria-current={pathname === '/admin/analytics' ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                  pathname === '/admin/analytics' ? 'bg-[#c5a059] text-white font-bold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <LineChart className="w-5 h-5" />
                <span>Analityka</span>
              </Link>

              <Link
                href="/admin/analytics/klasy"
                onClick={() => setSidebarOpen(false)}
                aria-current={pathname === '/admin/analytics/klasy' ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                  pathname === '/admin/analytics/klasy' ? 'bg-[#c5a059] text-white font-bold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
                <span>Ewaluacja Klas</span>
              </Link>

              <Link
                href="/admin/codes"
                onClick={() => setSidebarOpen(false)}
                aria-current={pathname === '/admin/codes' ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                  pathname === '/admin/codes' ? 'bg-[#c5a059] text-white font-bold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>Kody Uczniów</span>
              </Link>

              <Link
                href="/admin/import-sheet"
                onClick={() => setSidebarOpen(false)}
                aria-current={pathname === '/admin/import-sheet' ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                  pathname === '/admin/import-sheet' ? 'bg-[#c5a059] text-white font-bold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <CloudDownload className="w-5 h-5" />
                <span>Import z Arkusza</span>
              </Link>
            </nav>

            <div className="p-4 border-t border-[#2b3c4f] space-y-3">
              <button 
                onClick={() => { setSidebarOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm"
              >
                <LogOut className="w-5 h-5" />
                <span>Wyloguj się</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* 3. GŁÓWNA STRONA POKAZOWA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="flex md:hidden items-center justify-between p-4 bg-[#1a2a3a] text-white sticky top-0 z-40">
          <div className="flex items-center gap-2 text-[#c5a059] font-serif text-lg font-bold">
            <Sparkles className="w-5 h-5 fill-current" />
            <span>Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} aria-label="Otwórz menu">
            <Menu className="w-6 h-6 text-white" />
          </button>
        </header>

        <section className="flex-1 p-6 md:p-10">
          {children}
        </section>
      </div>
    </div>
  );
}
