// page.tsx (admin manage codes and generate)
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  QrCode, 
  UserPlus, 
  Trash2, 
  Download, 
  Search, 
  Plus, 
  School,
  CheckCircle2,
  FileDown
} from 'lucide-react';

interface StudentCode {
  code: string;
  first_name: string;
  last_name: string;
  school: string;
  class: string;
  created_at: string;
}

export default function ManageCodes() {
  const [codes, setCodes] = useState<StudentCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<StudentCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Stan formularza generowania pojedynczego/masowego
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [school, setSchool] = useState('');
  const [className, setClassName] = useState('');
  const [bulkInput, setBulkInput] = useState(''); // Lista uczniów "Imię Nazwisko" linijka po linijce
  const [showBulk, setShowBulk] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchCodes();
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredCodes(codes);
      return;
    }
    const q = search.toLowerCase();
    const filtered = codes.filter(c => 
      c.code.toLowerCase().includes(q) ||
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.school.toLowerCase().includes(q) ||
      c.class.toLowerCase().includes(q)
    );
    setFilteredCodes(filtered);
  }, [search, codes]);

  // Supabase/PostgREST domyślnie ucina każde zapytanie bez .range() do 1000 wierszy.
  // Przy >10 000 kodów (po imporcie archiwum MS Forms) trzeba pobrać wszystko partiami,
  // inaczej lista i eksport CSV cichutko pokazują tylko najnowszy tysiąc.
  const fetchAllCodes = async (): Promise<StudentCode[]> => {
    const PAGE = 1000;
    const all: StudentCode[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('codes')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...(data as StudentCode[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }

    return all;
  };

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const data = await fetchAllCodes();
      setCodes(data);
      setFilteredCodes(data);
    } catch (err) {
      console.error("Fetch codes error: ", err);
    } finally {
      setLoading(false);
    }
  };

  // Generator unikalnego kodu na podstawie imienia i klasy (np. ALAN5A)
  const generateUniqueCode = (first: string, cls: string, existingCodes: string[]): string => {
    const cleanFirst = first.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, '');
    const cleanClass = cls.toUpperCase().replace(/\s+/g, '');
    const prefix = cleanFirst.slice(0, 4); // Pierwsze 4 litery imienia
    const baseCode = `${prefix}${cleanClass}`;
    
    // Sprawdzamy czy w pobranych już kodach istnieje taki sam
    let finalCode = baseCode;
    let counter = 1;
    while (existingCodes.includes(finalCode)) {
      finalCode = `${baseCode}${counter}`;
      counter++;
    }
    return finalCode;
  };

  // Pobiera świeżą listę istniejących kodów tuż przed generowaniem, żeby zminimalizować
  // okno wyścigu z innym równoległym zapisem (np. druga otwarta karta przeglądarki).
  // Paginowane z tego samego powodu co fetchAllCodes — bez .range() PostgREST ucina
  // wynik do 1000 wierszy, co przy >10 000 kodów pozwoliłoby wygenerować kolidujący kod.
  const fetchExistingCodeStrings = async (): Promise<string[]> => {
    const PAGE = 1000;
    const all: string[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase.from('codes').select('code').range(from, from + PAGE - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      all.push(...data.map((c: any) => c.code));
      if (data.length < PAGE) break;
      from += PAGE;
    }

    return all;
  };

  // Dodawanie jednego kodu
  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !school || !className) {
      setMessage({ text: 'Wypełnij wszystkie pola formularza.', type: 'error' });
      return;
    }

    try {
      const existingCodes = await fetchExistingCodeStrings();
      const generatedCode = generateUniqueCode(firstName, className, existingCodes);
      const { error } = await supabase
        .from('codes')
        .insert({
          code: generatedCode,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          school: school.trim(),
          class: className.trim()
        });

      if (error) {
        if ((error as any).code === '23505') {
          throw new Error('Konflikt kodów — ktoś inny dodał ucznia w tym samym momencie. Spróbuj ponownie.');
        }
        throw error;
      }

      setMessage({ text: `Pomyślnie dodano ucznia. Wygenerowany kod: ${generatedCode}`, type: 'success' });
      setFirstName('');
      setLastName('');
      fetchCodes();
    } catch (err: any) {
      setMessage({ text: 'Błąd podczas dodawania: ' + err.message, type: 'error' });
    }
  };

  // Masowe generowanie kodów (linia po linii)
  const handleAddBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput || !school || !className) {
      setMessage({ text: 'Wypełnij listę uczniów, szkołę oraz klasę.', type: 'error' });
      return;
    }

    const lines = bulkInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setMessage({ text: 'Lista uczniów jest pusta.', type: 'error' });
      return;
    }

    try {
      const rowsToInsert: any[] = [];
      const existingCodes = await fetchExistingCodeStrings();

      lines.forEach(line => {
        const parts = line.split(/\s+/);
        const first = parts[0] || 'Uczeń';
        const last = parts.slice(1).join(' ') || 'BrakNazwiska';

        // Generowanie z weryfikacją unikalności względem świeżo pobranych kodów z bazy
        // oraz kodów już przygotowanych w tej samej paczce
        const finalCode = generateUniqueCode(first, className, [
          ...existingCodes,
          ...rowsToInsert.map(r => r.code)
        ]);

        rowsToInsert.push({
          code: finalCode,
          first_name: first,
          last_name: last,
          school: school.trim(),
          class: className.trim()
        });
      });

      const { error } = await supabase
        .from('codes')
        .insert(rowsToInsert);

      if (error) {
        if ((error as any).code === '23505') {
          throw new Error('Konflikt kodów — ktoś inny dodał ucznia w tym samym momencie. Odśwież i spróbuj ponownie.');
        }
        throw error;
      }

      setMessage({ text: `Pomyślnie wygenerowano ${rowsToInsert.length} kodów uczniów!`, type: 'success' });
      setBulkInput('');
      fetchCodes();
    } catch (err: any) {
      setMessage({ text: 'Błąd generowania masowego: ' + err.message, type: 'error' });
    }
  };

  // Usuwanie kodu
  const handleDelete = async (codeToDelete: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć kod ${codeToDelete}? Uczeń straci dostęp, a jego odpowiedzi zostaną osierocone.`)) return;

    try {
      const { error } = await supabase
        .from('codes')
        .delete()
        .eq('code', codeToDelete);

      if (error) throw error;
      setMessage({ text: 'Pomyślnie usunięto kod.', type: 'success' });
      fetchCodes();
    } catch (err: any) {
      setMessage({ text: 'Błąd usuwania: ' + err.message, type: 'error' });
    }
  };

  // Eksport kodów do pliku CSV (zgodne z polskimi znakami - UTF-8 z BOM dla Excela)
  const exportToCSV = () => {
    if (filteredCodes.length === 0) return;

    const headers = ['Kod Dostepu', 'Imie', 'Nazwisko', 'Szkola', 'Klasa'];
    const csvRows = [
      '\uFEFF' + headers.join(';'), // BOM + nagłówki rozdzielane średnikiem (polski Excel)
      ...filteredCodes.map(c => [
        c.code,
        c.first_name,
        c.last_name,
        c.school,
        c.class
      ].join(';'))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Kody_Uczniow_${school.replace(/\s+/g, '_') || 'Eksport'}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#1a2a3a]">Kody Uczniów</h1>
          <p className="text-gray-400 font-light mt-1">Generowanie, import i eksport unikalnych kodów autoryzacyjnych</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredCodes.length === 0}
          className="self-start sm:self-center px-5 py-3 bg-[#c5a059] hover:bg-[#b08b47] disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-all active:scale-95"
        >
          <FileDown className="w-5 h-5" />
          <span>Eksportuj CSV (Excel)</span>
        </button>
      </div>

      {/* POWIADOMIENIA */}
      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-sm max-w-2xl ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* GENERATOR KODÓW */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-4xl">
        <div className="flex border-b border-gray-100 pb-3 mb-6">
          <button 
            onClick={() => { setShowBulk(false); setMessage({text:'', type:''}); }}
            className={`px-4 py-2 text-sm font-semibold transition-all ${
              !showBulk ? 'border-b-2 border-[#1a2a3a] text-[#1a2a3a]' : 'text-gray-400 hover:text-[#1a2a3a]'
            }`}
          >
            Pojedynczy Uczeń
          </button>
          <button 
            onClick={() => { setShowBulk(true); setMessage({text:'', type:''}); }}
            className={`px-4 py-2 text-sm font-semibold transition-all ${
              showBulk ? 'border-b-2 border-[#1a2a3a] text-[#1a2a3a]' : 'text-gray-400 hover:text-[#1a2a3a]'
            }`}
          >
            Masowe Generowanie klasy (Z listy)
          </button>
        </div>

        {/* FORMULARZ POJEDYNCZEGO UCZNIA */}
        {!showBulk ? (
          <form onSubmit={handleAddSingle} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Imię</label>
              <input
                type="text"
                placeholder="np. Alan"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Nazwisko</label>
              <input
                type="text"
                placeholder="np. Sternalski"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Szkoła</label>
              <input
                type="text"
                placeholder="np. SP5 Gniezno"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Klasa</label>
              <input
                type="text"
                placeholder="np. 5a"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
              />
            </div>
            <button
              type="submit"
              className="py-3 bg-[#1a2a3a] hover:bg-[#2b3c4f] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all hover:shadow active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj Ucznia</span>
            </button>
          </form>
        ) : (
          /* FORMULARZ MASOWEGO GENEROWANIA */
          <form onSubmit={handleAddBulk} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Szkoła (Dla wszystkich)</label>
                <input
                  type="text"
                  placeholder="np. SP5 Gniezno"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Klasa (Dla wszystkich)</label>
                <input
                  type="text"
                  placeholder="np. 5a"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Lista Uczniów (Imię i Nazwisko w nowej linijce)</label>
              <textarea
                placeholder="Jan Kowalski&#10;Anna Nowak&#10;Michał Wiśniewski"
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all font-mono"
                rows={5}
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3.5 bg-[#1a2a3a] hover:bg-[#2b3c4f] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all hover:shadow active:scale-95"
            >
              <UserPlus className="w-5 h-5" />
              <span>Generuj kody dla całej klasy</span>
            </button>
          </form>
        )}
      </div>

      {/* LISTA WYGENEROWANYCH KODÓW */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-serif font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#c5a059]" />
            Baza Kodów ({filteredCodes.length})
          </h3>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filtruj po imieniu, szkole, kodzie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                <th className="py-4 font-bold">Kod Dostępu</th>
                <th className="py-4 font-bold">Imię i Nazwisko</th>
                <th className="py-4 font-bold">Szkoła</th>
                <th className="py-4 font-bold text-center">Klasa</th>
                <th className="py-4 font-bold text-center">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    <div className="w-8 h-8 border-4 border-[#1a2a3a] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Brak wygenerowanych kodów spełniających kryteria.
                  </td>
                </tr>
              ) : (
                filteredCodes.map((c) => (
                  <tr key={c.code} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 font-mono font-bold text-[#c5a059] text-base">{c.code}</td>
                    <td className="py-4 font-semibold text-[#1a2a3a]">{c.first_name} {c.last_name}</td>
                    <td className="py-4 text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <School className="w-4 h-4 text-gray-400" />
                        <span>{c.school}</span>
                      </div>
                    </td>
                    <td className="py-4 text-center font-mono font-bold text-[#1a2a3a]">{c.class}</td>
                    <td className="py-4 text-center">
                      <button
                        onClick={() => handleDelete(c.code)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
