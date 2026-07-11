// page.tsx (admin dashboard)
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  FileSpreadsheet, 
  Activity, 
  School, 
  Download,
  CheckCircle,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface LatestResponse {
  id: string;
  created_at: string;
  score: number;
  max_score: number;
  version: string;
  cert_pdf_url: string | null;
  archive_pdf_url: string | null;
  codes: {
    first_name: string;
    last_name: string;
    school: string;
    class: string;
    code: string;
  } | null;
  surveys: {
    title: string;
  } | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCodes: 0,
    totalSurveys: 0,
    totalResponses: 0,
    averageScorePercent: 0
  });
  const [pageResponses, setPageResponses] = useState<LatestResponse[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  // Wyszukiwanie i paginacja — obie realizowane po stronie serwera (.range()), bo
  // Supabase/PostgREST domyślnie ucina wynik zapytania bez .range() do 1000 wierszy,
  // co przy tysiącach odpowiedzi cichutko gubiło większość danych z widoku i ze średniej.
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Statystyki KPI ładowane raz przy wejściu na stronę
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [
          { count: codesCount },
          { count: surveysCount },
          { count: responsesCount },
          { data: avgData }
        ] = await Promise.all([
          supabase.from('codes').select('*', { count: 'exact', head: true }),
          supabase.from('surveys').select('*', { count: 'exact', head: true }),
          supabase.from('responses').select('*', { count: 'exact', head: true }),
          supabase.rpc('get_average_score_percent')
        ]);

        setStats({
          totalCodes: codesCount || 0,
          totalSurveys: surveysCount || 0,
          totalResponses: responsesCount || 0,
          averageScorePercent: (avgData as unknown as number) || 0
        });
      } catch (err) {
        console.error("Dashboard stats error: ", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Debounce wyszukiwania (300ms), żeby nie odpytywać bazy przy każdym naciśnięciu klawisza
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset paginacji po zmianie wyszukiwania
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery]);

  // Pobranie aktualnej strony tabeli (i przeliczenie licznika wyników) po zmianie strony/wyszukiwania
  useEffect(() => {
    const fetchPage = async () => {
      try {
        setTableLoading(true);
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        const hasSearch = debouncedQuery.trim().length > 0;

        let query = supabase
          .from('responses')
          .select(
            `
              id,
              created_at,
              score,
              max_score,
              version,
              cert_pdf_url,
              archive_pdf_url,
              codes${hasSearch ? '!inner' : ''} (first_name, last_name, school, class, code),
              surveys (title)
            `,
            { count: 'exact' }
          )
          .order('created_at', { ascending: false })
          .range(from, to);

        if (hasSearch) {
          const q = debouncedQuery.trim();
          query = query.or(
            `first_name.ilike.%${q}%,last_name.ilike.%${q}%,code.ilike.%${q}%`,
            { foreignTable: 'codes' }
          );
        }

        const { data, count, error } = await query;
        if (error) throw error;

        setPageResponses((data as any) || []);
        setFilteredCount(count || 0);
      } catch (err) {
        console.error("Dashboard table page error: ", err);
      } finally {
        setTableLoading(false);
      }
    };

    fetchPage();
  }, [currentPage, debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / itemsPerPage));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#1a2a3a] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* 1. HEADER */}
      <div>
        <h1 className="text-4xl font-serif font-bold text-[#1a2a3a]">Dashboard KPI</h1>
        <p className="text-gray-400 font-light mt-1">Analityka i weryfikacja wyników szkoleniowych na żywo</p>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Uczniowie (Kody)</span>
            <div className="text-3xl font-bold font-mono">{stats.totalCodes}</div>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Wypuszczone Ankiety</span>
            <div className="text-3xl font-bold font-mono">{stats.totalSurveys}</div>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Wypełnione Ankiety</span>
            <div className="text-3xl font-bold font-mono">{stats.totalResponses}</div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Średnia Zdawalność</span>
            <div className="text-3xl font-bold font-mono">{stats.averageScorePercent}%</div>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. LATEST RESPONSES */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h3 className="text-xl font-serif font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#c5a059]" />
            Wypełnione Ankiety ({filteredCount})
          </h3>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Szukaj po imieniu, nazwisku lub kodzie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-[#c5a059] focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                <th className="py-4 font-bold">Uczeń</th>
                <th className="py-4 font-bold">Szkoła & Klasa</th>
                <th className="py-4 font-bold">Ankieta</th>
                <th className="py-4 font-bold text-center">Wersja</th>
                <th className="py-4 font-bold">Data wypełnienia</th>
                <th className="py-4 font-bold text-center">Wynik</th>
                <th className="py-4 font-bold text-center">Certyfikat</th>
                <th className="py-4 font-bold text-center">Karta Odpowiedzi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {tableLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Ładowanie...
                  </td>
                </tr>
              ) : pageResponses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Brak wyników do wyświetlenia.
                  </td>
                </tr>
              ) : (
                pageResponses.map((r) => {
                  const studentInfo = r.codes;
                  const surveyInfo = r.surveys;
                  const dateObj = new Date(r.created_at);
                  const dateFormatted = dateObj.toLocaleDateString('pl-PL') + ' ' + dateObj.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 font-semibold text-[#1a2a3a]">
                        {studentInfo ? (
                          <div className="flex flex-col">
                            <span>{studentInfo.first_name} {studentInfo.last_name}</span>
                            <span className="text-xs text-gray-400 font-normal">Kod: {studentInfo.code}</span>
                          </div>
                        ) : 'Nieznany Uczeń'}
                      </td>
                      <td className="py-4 text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <School className="w-4 h-4 text-gray-400" />
                          <span>{studentInfo ? `${studentInfo.school} (${studentInfo.class})` : '---'}</span>
                        </div>
                      </td>
                      <td className="py-4 text-[#1a2a3a] max-w-[200px] truncate">
                        {surveyInfo ? surveyInfo.title : 'Nieznana Ankieta'}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          r.version === 'P' ? 'bg-[#c5a059]/10 text-[#c5a059]' : 'bg-[#1a2a3a]/10 text-[#1a2a3a]'
                        }`}>
                          {r.version === 'P' ? 'Początkowa' : 'Ewaluacyjna'}
                        </span>
                      </td>
                      <td className="py-4 text-gray-500 text-xs">
                        {dateFormatted}
                      </td>
                      <td className="py-4 text-center font-mono font-bold">
                        {r.max_score > 0 ? `${r.score} / ${r.max_score}` : '---'}
                      </td>
                      <td className="py-4 text-center">
                        <a
                          href={r.cert_pdf_url || `/api/pdf/certificate?responseId=${r.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      </td>
                      <td className="py-4 text-center">
                        <a 
                          href={r.archive_pdf_url || `/api/pdf/archive?responseId=${r.id}`}
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Archiwum</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacja */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-4">
            <span className="text-sm text-gray-500">
              Strona <span className="font-semibold text-[#1a2a3a]">{currentPage}</span> z <span className="font-semibold text-[#1a2a3a]">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
