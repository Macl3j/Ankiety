'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Trophy, TrendingUp, Users, AlertCircle } from 'lucide-react';

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => {
        if (!res.ok) throw new Error('Błąd ładowania danych');
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-4 border-[#1a2a3a] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-light text-sm">Przetwarzanie analityki...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3">
        <AlertCircle className="w-6 h-6" />
        <p>{error || 'Brak danych'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1a2a3a]">Analityka & Raporty</h1>
          <p className="text-gray-500 font-light mt-1">Kompleksowe zestawienie wyników dla wszystkich szkół.</p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Przebadanych Uczniów</p>
            <p className="text-3xl font-bold text-[#1a2a3a] mt-1">{data.overview.totalResponses}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Globalna Średnia</p>
            <p className="text-3xl font-bold text-[#1a2a3a] mt-1">{data.overview.overallAvg}%</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1a2a3a] to-[#2b3c4f] p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 text-white hover:shadow-md transition-shadow relative overflow-hidden">
          <SparklesBg />
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm z-10">
            <Trophy className="w-6 h-6 text-[#c5a059]" />
          </div>
          <div className="z-10">
            <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Top Szkoła</p>
            <p className="text-xl font-bold text-white mt-1 truncate max-w-[150px]" title={data.schoolsData[0]?.name}>
              {data.schoolsData[0]?.name || '-'}
            </p>
            <p className="text-sm text-[#c5a059] font-medium">{data.schoolsData[0]?.avg || 0}% średnia</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BAR CHART - SCHOOLS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-[#1a2a3a] mb-6">Porównanie Średniej w Szkołach</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.schoolsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{fontSize: 12}} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                <YAxis tick={{fontSize: 12}} domain={[0, 100]} unit="%" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`${value}%`, 'Średnia']}
                />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {data.schoolsData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#c5a059' : '#1a2a3a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE CHART - DISTRIBUTION */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#1a2a3a] mb-6">Rozkład Wyników</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.scoreDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {data.scoreDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [value, 'Uczniów']}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEADERBOARD TABLE */}
        <div className="bg-white p-0 rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-[#1a2a3a]">Top 10 Najlepszych Klas</h2>
            <p className="text-sm text-gray-500 font-light mt-1">Ranking klas ze wszystkich szkół</p>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-6 font-medium">Miejsce</th>
                  <th className="py-4 px-6 font-medium">Klasa</th>
                  <th className="py-4 px-6 font-medium">Szkoła</th>
                  <th className="py-4 px-6 font-medium text-right">Średnia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.topClasses.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-200 text-gray-700' :
                        i === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-[#1a2a3a]">{item.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-500 truncate max-w-[150px]">{item.school}</td>
                    <td className="py-4 px-6 text-right font-medium text-green-600">{item.avg}%</td>
                  </tr>
                ))}
                {data.topClasses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">Brak wystarczających danych</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TIMELINE AREA CHART */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#1a2a3a] mb-6">Aktywność w Czasie</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [value, 'Wypełnione ankiety']}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

// Dekoracja z iskrami dla karty Top Szkoła
function SparklesBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <div className="absolute top-2 left-10 w-2 h-2 rounded-full bg-white blur-[1px]"></div>
      <div className="absolute top-10 right-10 w-3 h-3 rounded-full bg-white blur-[2px]"></div>
      <div className="absolute bottom-4 left-1/4 w-1.5 h-1.5 rounded-full bg-white blur-[1px]"></div>
      <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-[#c5a059] blur-[1px]"></div>
    </div>
  );
}
