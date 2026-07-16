'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  School, Users, TrendingUp, ArrowUp, ArrowDown, ArrowUpDown, AlertCircle,
} from 'lucide-react';

interface Filters {
  schools: { name: string; count: number }[];
  classesBySchool: Record<string, { grade: string; letter: string; label: string; count: number }[]>;
  tasks: { taskId: number; label: string }[];
}

interface Summary {
  studentsTotal: number;
  studentsP: number;
  studentsE: number;
  bothPandE: number;
  avgP: number | null;
  avgE: number | null;
  delta: number | null;
  participationRate: number;
}

interface QuestionRow {
  question: string;
  avgPercentP: number | null;
  avgPercentE: number | null;
  delta: number | null;
  nP: number;
  nE: number;
}

interface QuestionCoverage {
  pWithData: number;
  pTotal: number;
  eWithData: number;
  eTotal: number;
}

type SortColumn = 'question' | 'avgPercentP' | 'avgPercentE' | 'delta';

export default function ClassAnalyticsPage() {
  const [filters, setFilters] = useState<Filters | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [school, setSchool] = useState('');
  const [classKey, setClassKey] = useState(''); // `${grade}|${letter}`
  const [taskId, setTaskId] = useState<string>(''); // '' = wszystkie rundy

  const [summary, setSummary] = useState<Summary | null>(null);
  const [questionDifficulty, setQuestionDifficulty] = useState<QuestionRow[]>([]);
  const [questionCoverage, setQuestionCoverage] = useState<QuestionCoverage | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortColumn, setSortColumn] = useState<SortColumn>('avgPercentE');
  const [sortAsc, setSortAsc] = useState(true);

  // Wczytanie listy filtrow (szkoly/klasy/rundy) raz przy wejsciu na strone
  useEffect(() => {
    fetch('/api/analytics/classes')
      .then((res) => res.json())
      .then((json) => {
        setFilters(json.filters);
        setLoadingFilters(false);
      })
      .catch(() => setLoadingFilters(false));
  }, []);

  const classes = school && filters ? filters.classesBySchool[school] || [] : [];

  // Wczytanie danych za kazdym razem, gdy zmieni sie wybor szkola/klasa/runda
  useEffect(() => {
    if (!school || !classKey) {
      setSummary(null);
      setQuestionDifficulty([]);
      setQuestionCoverage(null);
      return;
    }
    const [grade, letter] = classKey.split('|');

    setLoadingData(true);
    setError(null);

    const params = new URLSearchParams({ school, grade, letter });
    if (taskId) params.set('taskId', taskId);

    fetch(`/api/analytics/classes?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setSummary(json.summary);
        setQuestionDifficulty(json.questionDifficulty || []);
        setQuestionCoverage(json.questionCoverage || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingData(false));
  }, [school, classKey, taskId]);

  const sortedQuestions = useMemo(() => {
    const rows = [...questionDifficulty];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortColumn === 'question') cmp = a.question.localeCompare(b.question, 'pl');
      else {
        const av = a[sortColumn] ?? -1;
        const bv = b[sortColumn] ?? -1;
        cmp = av - bv;
      }
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [questionDifficulty, sortColumn, sortAsc]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) setSortAsc((v) => !v);
    else {
      setSortColumn(column);
      setSortAsc(true);
    }
  };

  const hardestQuestions = useMemo(
    () => [...questionDifficulty].filter((q) => q.avgPercentE !== null).sort((a, b) => (a.avgPercentE as number) - (b.avgPercentE as number)).slice(0, 3),
    [questionDifficulty]
  );
  const biggestProgress = useMemo(
    () => [...questionDifficulty].filter((q) => q.delta !== null).sort((a, b) => (b.delta as number) - (a.delta as number)).slice(0, 3),
    [questionDifficulty]
  );

  const chartData = questionDifficulty.map((q, i) => ({
    name: q.question.length > 28 ? `${i + 1}. ${q.question.slice(0, 28)}…` : `${i + 1}. ${q.question}`,
    poczatkowa: q.avgPercentP,
    ewaluacyjna: q.avgPercentE,
  }));

  // Przyrost wzgledny: o ile procent lepszy jest wynik Ewaluacyjny w stosunku do
  // Poczatkowego (a nie tylko o ile punktow procentowych) - przy niskim wyniku startowym
  // sama roznica punktow procentowych zaniza postrzegany postep (np. 2%->11% to +9 pkt
  // proc., ale realnie wynik wzrosl 5,5-krotnie).
  const relativeGrowth = useMemo(() => {
    if (!summary || summary.avgP === null || summary.avgE === null) return null;
    if (summary.avgP === 0) {
      return summary.avgE === 0 ? { kind: 'zero' as const } : { kind: 'fromZero' as const };
    }
    return { kind: 'percent' as const, value: Math.round(((summary.avgE - summary.avgP) / summary.avgP) * 100) };
  }, [summary]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#1a2a3a]">Ewaluacja Klas</h1>
        <p className="text-gray-500 font-light mt-1">
          Porównanie ankiety Początkowej i Ewaluacyjnej dla wybranej szkoły i klasy, wraz z trudnością poszczególnych pytań.
        </p>
      </div>

      {/* FILTRY */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label htmlFor="klasy-school-select" className="text-xs text-gray-400 font-bold uppercase tracking-wider">Szkoła</label>
          <select
            id="klasy-school-select"
            value={school}
            onChange={(e) => { setSchool(e.target.value); setClassKey(''); }}
            disabled={loadingFilters}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
          >
            <option value="">— wybierz szkołę —</option>
            {filters?.schools.map((s) => (
              <option key={s.name} value={s.name}>{s.name} ({s.count})</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="klasy-class-select" className="text-xs text-gray-400 font-bold uppercase tracking-wider">Klasa</label>
          <select
            id="klasy-class-select"
            value={classKey}
            onChange={(e) => setClassKey(e.target.value)}
            disabled={!school}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all disabled:opacity-50"
          >
            <option value="">— wybierz klasę —</option>
            {classes.map((c) => (
              <option key={`${c.grade}|${c.letter}`} value={`${c.grade}|${c.letter || 'none'}`}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="klasy-round-select" className="text-xs text-gray-400 font-bold uppercase tracking-wider">Runda / Edycja</label>
          <select
            id="klasy-round-select"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
          >
            <option value="">Wszystkie rundy (bez trudności pytań)</option>
            {filters?.tasks.map((t) => (
              <option key={t.taskId} value={t.taskId}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {!school || !classKey ? (
        <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          Wybierz szkołę i klasę, żeby zobaczyć porównanie ankiet.
        </div>
      ) : loadingData ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-10 h-10 border-4 border-[#1a2a3a] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : summary === null ? (
        <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          Brak uczniów spełniających wybrane kryteria.
        </div>
      ) : (
        <>
          {/* KARTY PODSUMOWANIA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard icon={<School className="w-6 h-6" />} label="Śr. wynik Początkowa" value={summary.avgP !== null ? `${summary.avgP}%` : '—'} color="blue" />
            <SummaryCard icon={<TrendingUp className="w-6 h-6" />} label="Śr. wynik Ewaluacyjna" value={summary.avgE !== null ? `${summary.avgE}%` : '—'} color="green" />
            <SummaryCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Przyrost Wiedzy (Δ)"
              value={summary.delta !== null ? `${summary.delta > 0 ? '+' : ''}${summary.delta} pkt proc.` : '—'}
              subValue={
                relativeGrowth?.kind === 'percent'
                  ? `${relativeGrowth.value > 0 ? '+' : ''}${relativeGrowth.value}% względem wyniku Początkowego`
                  : relativeGrowth?.kind === 'fromZero'
                  ? 'wzrost od 0% (brak punktu odniesienia)'
                  : relativeGrowth?.kind === 'zero'
                  ? 'bez zmian'
                  : undefined
              }
              color={summary.delta !== null && summary.delta < 0 ? 'red' : 'amber'}
            />
            <SummaryCard
              icon={<Users className="w-6 h-6" />}
              label="Uzupełnili obie ankiety"
              value={`${summary.bothPandE} / ${summary.studentsTotal} (${summary.participationRate}%)`}
              color="purple"
            />
          </div>

          {!taskId ? (
            <div className="p-6 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 text-sm">
              Wybierz konkretną rundę/edycję powyżej, żeby zobaczyć rozkład trudności poszczególnych pytań — pytania mogą się różnić między edycjami, więc porównanie liczone jest zawsze w obrębie jednej rundy.
            </div>
          ) : questionDifficulty.length === 0 ? (
            <div className="p-6 bg-white rounded-2xl border border-gray-100 text-center text-gray-400">
              Brak danych pytaniowych dla tej rundy (być może to ankiety live bez odpowiedzi, lub wszystkie pytania są nieoceniane).
            </div>
          ) : (
            <>
              {questionCoverage && (questionCoverage.pWithData < questionCoverage.pTotal || questionCoverage.eWithData < questionCoverage.eTotal) && (
                <div className="p-4 bg-blue-50 text-blue-800 rounded-2xl border border-blue-100 text-sm">
                  Uwaga: część historycznych odpowiedzi nie ma zapisanych punktów per pytanie (starszy import bez pełnego backfillu) — wykres i tabela poniżej liczone są tylko z odpowiedzi, które je mają:
                  {' '}Początkowa {questionCoverage.pWithData}/{questionCoverage.pTotal}, Ewaluacyjna {questionCoverage.eWithData}/{questionCoverage.eTotal}.
                </div>
              )}

              {/* WYRÓŻNIONE */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HighlightList title="Najtrudniejsze pytania (najniższy % w Ewaluacyjnej)" rows={hardestQuestions} metric="avgPercentE" />
                <HighlightList title="Największy postęp (P → E)" rows={biggestProgress} metric="delta" showSign />
              </div>

              {/* WYKRES */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-[#1a2a3a] mb-6">Wynik per pytanie: Początkowa vs Ewaluacyjna</h2>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} height={80} />
                      <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [`${value}%`, '']} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar dataKey="poczatkowa" name="Początkowa" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="ewaluacyjna" name="Ewaluacyjna" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TABELA */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-[#1a2a3a] mb-6">Szczegóły per pytanie</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                        <SortableHeader column="question" label="Pytanie" sortColumn={sortColumn} sortAsc={sortAsc} onSort={handleSort} />
                        <SortableHeader column="avgPercentP" label="Śr. % Początkowa" sortColumn={sortColumn} sortAsc={sortAsc} onSort={handleSort} center />
                        <SortableHeader column="avgPercentE" label="Śr. % Ewaluacyjna" sortColumn={sortColumn} sortAsc={sortAsc} onSort={handleSort} center />
                        <SortableHeader column="delta" label="Δ" sortColumn={sortColumn} sortAsc={sortAsc} onSort={handleSort} center />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {sortedQuestions.map((q, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 pr-4 max-w-[400px]">{q.question}</td>
                          <td className="py-4 text-center font-mono">{q.avgPercentP !== null ? `${q.avgPercentP}% (n=${q.nP})` : '—'}</td>
                          <td className="py-4 text-center font-mono">{q.avgPercentE !== null ? `${q.avgPercentE}% (n=${q.nE})` : '—'}</td>
                          <td className={`py-4 text-center font-mono font-bold ${
                            q.delta === null ? 'text-gray-400' : q.delta > 0 ? 'text-green-600' : q.delta < 0 ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {q.delta !== null ? `${q.delta > 0 ? '+' : ''}${q.delta}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, subValue, color }: { icon: React.ReactNode; label: string; value: string; subValue?: string; color: 'blue' | 'green' | 'red' | 'amber' | 'purple' }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="space-y-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">{label}</span>
        <div className="text-2xl font-bold font-mono text-[#1a2a3a]">{value}</div>
        {subValue && <div className="text-xs text-gray-400 font-medium">{subValue}</div>}
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colors[color]}`}>
        {icon}
      </div>
    </div>
  );
}

function HighlightList({ title, rows, metric, showSign }: { title: string; rows: QuestionRow[]; metric: 'avgPercentE' | 'delta'; showSign?: boolean }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-sm font-bold text-[#1a2a3a] mb-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">Brak danych.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => {
            const val = r[metric] as number;
            return (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#1a2a3a] truncate">{r.question}</span>
                <span className={`font-mono font-bold shrink-0 ${val < 0 ? 'text-red-600' : val > 0 && showSign ? 'text-green-600' : 'text-[#1a2a3a]'}`}>
                  {showSign && val > 0 ? '+' : ''}{val}{metric === 'avgPercentE' ? '%' : ' pkt proc.'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SortableHeader({
  column, label, sortColumn, sortAsc, onSort, center = false,
}: {
  column: SortColumn;
  label: string;
  sortColumn: SortColumn;
  sortAsc: boolean;
  onSort: (column: SortColumn) => void;
  center?: boolean;
}) {
  const isActive = sortColumn === column;
  const ariaSort = isActive ? (sortAsc ? 'ascending' : 'descending') : 'none';
  return (
    <th className={`py-4 font-bold select-none ${center ? 'text-center' : ''}`} aria-sort={ariaSort as any}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 hover:text-[#1a2a3a] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a2a3a] focus-visible:ring-offset-1 rounded ${isActive ? 'text-[#1a2a3a]' : ''}`}
      >
        <span>{label}</span>
        {isActive ? (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
      </button>
    </th>
  );
}
