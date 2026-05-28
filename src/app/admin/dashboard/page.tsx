// page.tsx (admin dashboard)
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  FileSpreadsheet, 
  Award, 
  Activity, 
  School, 
  ExternalLink,
  Download,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

interface LatestResponse {
  id: string;
  created_at: string;
  score: number;
  max_score: number;
  version: string;
  cert_pdf_url: string;
  codes: {
    first_name: string;
    last_name: string;
    school: string;
    class: string;
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
  const [latestResponses, setLatestResponses] = useState<LatestResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // 1. Liczba kodów uczniów
        const { count: codesCount } = await supabase
          .from('codes')
          .select('*', { count: 'exact', head: true });

        // 2. Liczba ankiet
        const { count: surveysCount } = await supabase
          .from('surveys')
          .select('*', { count: 'exact', head: true });

        // 3. Statystyki odpowiedzi i średni wynik
        const { data: responses, count: responsesCount } = await supabase
          .from('responses')
          .select('score, max_score');

        let avgPercent = 0;
        if (responses && responses.length > 0) {
          let totalScore = 0;
          let totalMax = 0;
          responses.forEach(r => {
            if (r.max_score > 0) {
              totalScore += r.score;
              totalMax += r.max_score;
            }
          });
          avgPercent = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
        }

        setStats({
          totalCodes: codesCount || 0,
          totalSurveys: surveysCount || 0,
          totalResponses: responsesCount || 0,
          averageScorePercent: avgPercent
        });

        // 4. Najnowsze 6 odpowiedzi z relacjami
        const { data: latest } = await supabase
          .from('responses')
          .select(`
            id,
            created_at,
            score,
            max_score,
            version,
            cert_pdf_url,
            codes (first_name, last_name, school, class),
            surveys (title)
          `)
          .order('created_at', { ascending: false })
          .limit(6);

        setLatestResponses((latest as any) || []);

      } catch (err) {
        console.error("Dashboard data error: ", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
        <h3 className="text-xl font-serif font-bold mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#c5a059]" />
          Najnowsze Podejścia do Ankiet
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                <th className="py-4 font-bold">Uczeń</th>
                <th className="py-4 font-bold">Szkoła & Klasa</th>
                <th className="py-4 font-bold">Ankieta</th>
                <th className="py-4 font-bold text-center">Wersja</th>
                <th className="py-4 font-bold text-center">Wynik</th>
                <th className="py-4 font-bold text-center">Certyfikat</th>
                <th className="py-4 font-bold text-center">Karta Odpowiedzi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {latestResponses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Brak wypełnionych ankiet w systemie.
                  </td>
                </tr>
              ) : (
                latestResponses.map((r) => {
                  const studentInfo = r.codes;
                  const surveyInfo = r.surveys;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 font-semibold text-[#1a2a3a]">
                        {studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : 'Nieznany Uczeń'}
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
                      <td className="py-4 text-center font-mono font-bold">
                        {r.max_score > 0 ? `${r.score} / ${r.max_score}` : '---'}
                      </td>
                      <td className="py-4 text-center">
                        {r.cert_pdf_url ? (
                          <a 
                            href={r.cert_pdf_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">brak</span>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        <a 
                          href={(r as any).archive_pdf_url || `/api/pdf/archive?responseId=${r.id}`}
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
      </div>
    </div>
  );
}
