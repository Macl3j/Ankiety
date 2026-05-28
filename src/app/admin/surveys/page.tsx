// page.tsx (admin list and create surveys)
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  FileText,
  AlertCircle
} from 'lucide-react';

interface Survey {
  id: string;
  task_id: number;
  title: string;
  group: string;
  version: string;
  status: string;
  created_at: string;
}

export default function ManageSurveys() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stan formularza nowej ankiety
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [taskId, setTaskId] = useState(1);
  const [group, setGroup] = useState('Klasa 5');
  const [version, setVersion] = useState('P');
  const [status, setStatus] = useState('DRAFT');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from('surveys')
        .select('*')
        .order('task_id', { ascending: true })
        .order('version', { ascending: true });

      if (fetchErr) throw fetchErr;
      setSurveys(data || []);
    } catch (err) {
      console.error("Fetch surveys error: ", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !group) {
      setError('Wypełnij tytuł oraz grupę docelową.');
      return;
    }

    try {
      setError('');
      const { data, error: insertErr } = await supabase
        .from('surveys')
        .insert({
          title: title.trim(),
          task_id: Number(taskId),
          group: group.trim(),
          version,
          status
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setShowCreate(false);
      setTitle('');
      fetchSurveys();
      
      // Przekieruj od razu do kreatora pytań dla nowo utworzonej ankiety
      router.push(`/admin/surveys/${data.id}`);
    } catch (err: any) {
      setError('Błąd podczas tworzenia ankiety: ' + err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć ankietę "${name}"? Usunięcie usunie również wszystkie powiązane pytania i odpowiedzi uczniów!`)) return;

    try {
      const { error: deleteErr } = await supabase
        .from('surveys')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;
      fetchSurveys();
    } catch (err: any) {
      alert('Błąd usuwania ankiety: ' + err.message);
    }
  };

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#1a2a3a]">Zarządzaj Ankietami</h1>
          <p className="text-gray-400 font-light mt-1">Tworzenie, edycja struktur pytań oraz publikacja kwestionariuszy</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="self-start sm:self-center px-5 py-3 bg-[#1a2a3a] hover:bg-[#2b3c4f] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Nowa Ankieta</span>
        </button>
      </div>

      {/* KREATOR NOWEJ ANKIETY */}
      {showCreate && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
          <h3 className="text-xl font-serif font-bold mb-4">Stwórz nowy kwestionariusz</h3>
          
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tytuł Ankiety</label>
              <input
                type="text"
                placeholder="np. Ankieta Ewaluacyjna - Klasa 5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Grupa docelowa (Klasa)</label>
                <input
                  type="text"
                  placeholder="np. Klasa 5"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Zadanie Projektowe (Task ID)</label>
                <input
                  type="number"
                  min={1}
                  value={taskId}
                  onChange={(e) => setTaskId(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Wersja ankiety</label>
                <select
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all bg-white"
                >
                  <option value="P">Początkowa (P)</option>
                  <option value="E">Ewaluacyjna (E)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Status publikacji</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all bg-white"
                >
                  <option value="DRAFT">Szkic (DRAFT)</option>
                  <option value="PUBLISHED">Opublikowana (PUBLISHED)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 font-medium rounded-xl text-sm transition-colors"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#1a2a3a] hover:bg-[#2b3c4f] text-white font-semibold rounded-xl text-sm transition-all"
              >
                Stwórz i przejdź do pytań
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTA ANKIET */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-xl font-serif font-bold mb-6 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#c5a059]" />
          Wykaz Kwestionariuszy ({surveys.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                <th className="py-4 font-bold">Zadanie</th>
                <th className="py-4 font-bold">Nazwa Ankiety</th>
                <th className="py-4 font-bold">Klasa (Grupa)</th>
                <th className="py-4 font-bold text-center">Wersja</th>
                <th className="py-4 font-bold text-center">Status</th>
                <th className="py-4 font-bold text-center">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <div className="w-8 h-8 border-4 border-[#1a2a3a] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : surveys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Brak ankiet w systemie. Kliknij "Nowa Ankieta", aby dodać pierwszy formularz.
                  </td>
                </tr>
              ) : (
                surveys.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 font-mono font-bold text-[#1a2a3a] text-base pl-2">Zadanie {s.task_id}</td>
                    <td className="py-4 font-semibold text-[#1a2a3a]">{s.title}</td>
                    <td className="py-4 text-gray-500 font-medium">{s.group}</td>
                    <td className="py-4 text-center">
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        s.version === 'P' ? 'bg-[#c5a059]/10 text-[#c5a059]' : 'bg-[#1a2a3a]/10 text-[#1a2a3a]'
                      }`}>
                        {s.version === 'P' ? 'Początkowa' : 'Ewaluacyjna'}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        s.status === 'PUBLISHED' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        <span>{s.status === 'PUBLISHED' ? 'Opublikowana' : 'Szkic'}</span>
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => router.push(`/admin/surveys/${s.id}`)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edytuj pytania"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.title)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Usuń ankietę"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
