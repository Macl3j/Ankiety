// page.tsx (admin edit survey questions - Dynamic Form Builder)
'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  ClipboardList,
  Check,
  CheckCircle2,
  X,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface Survey {
  id: string;
  task_id: number;
  title: string;
  group: string;
  version: string;
  status: string;
}

interface Option {
  text: string;
  correct: boolean;
  image_url?: string;
}

interface Question {
  id?: string;
  survey_id: string;
  type: 'SINGLE' | 'MULTI' | 'TEXT' | 'LIKERT';
  text: string;
  options: Option[];
  order_index: number;
  weight: number;
  image_url?: string;
}

export default function EditSurvey({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const surveyId = resolvedParams.id;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Stan dla nowego pytania
  const [newType, setNewType] = useState<'SINGLE' | 'MULTI' | 'TEXT' | 'LIKERT'>('SINGLE');
  const [newText, setNewText] = useState('');
  const [newOptions, setNewOptions] = useState<Option[]>([
    { text: 'Opcja A', correct: false },
    { text: 'Opcja B', correct: false }
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchSurveyDetails();
  }, [surveyId]);

  const fetchSurveyDetails = async () => {
    try {
      setLoading(true);
      
      // 1. Pobranie ankiety
      const { data: surveyData, error: sErr } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

      if (sErr) throw sErr;
      setSurvey(surveyData);

      // 2. Pobranie pytań
      const { data: qData, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index', { ascending: true });

      if (qErr) throw qErr;

      const parsedQuestions = (qData || []).map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }));

      setQuestions(parsedQuestions);

    } catch (err) {
      console.error("Fetch survey details error: ", err);
    } finally {
      setLoading(false);
    }
  };

  // Obsługa zmiany statusu ankiety (DRAFT / PUBLISHED)
  const handleStatusChange = async (newStatus: string) => {
    if (!survey) return;
    try {
      const { error } = await supabase
        .from('surveys')
        .update({ status: newStatus })
        .eq('id', survey.id);

      if (error) throw error;
      setSurvey(prev => prev ? { ...prev, status: newStatus } : null);
      setMessage({ text: `Zmieniono status na ${newStatus === 'PUBLISHED' ? 'OPUBLIKOWANA' : 'SZKIC'}.`, type: 'success' });
    } catch (err: any) {
      setMessage({ text: 'Błąd podczas zmiany statusu: ' + err.message, type: 'error' });
    }
  };

  // Dodawanie kolejnej opcji w kreatorze pytań
  const addOptionField = () => {
    setNewOptions([...newOptions, { text: `Opcja ${String.fromCharCode(65 + newOptions.length)}`, correct: false }]);
  };

  // Usuwanie opcji
  const removeOptionField = (idx: number) => {
    if (newOptions.length <= 1) return;
    setNewOptions(newOptions.filter((_, i) => i !== idx));
  };

  // Edycja tekstu opcji
  const handleOptionTextChange = (idx: number, text: string) => {
    setNewOptions(
      newOptions.map((opt, i) => i === idx ? { ...opt, text } : opt)
    );
  };

  // Obsługa przesyłania zdjęcia do Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${surveyId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('survey-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from('survey-images')
        .getPublicUrl(fileName);
        
      setNewImageUrl(publicUrlData.publicUrl);
    } catch (err: any) {
      alert("Błąd przesyłania zdjęcia: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Obsługa przesyłania zdjęcia do konkretnej opcji
  const handleOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${surveyId}/opt_${Date.now()}_${idx}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('survey-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });
        
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from('survey-images')
        .getPublicUrl(fileName);
        
      setNewOptions(
        newOptions.map((opt, i) => i === idx ? { ...opt, image_url: publicUrlData.publicUrl } : opt)
      );
    } catch (err: any) {
      alert("Błąd przesyłania zdjęcia dla opcji: " + err.message);
    }
  };

  // Zaznaczenie poprawnej odpowiedzi (dla SINGLE wybiera jedną, dla MULTI pozwala na wiele)
  const handleOptionCorrectToggle = (idx: number) => {
    if (newType === 'SINGLE') {
      setNewOptions(
        newOptions.map((opt, i) => ({ ...opt, correct: i === idx }))
      );
    } else {
      setNewOptions(
        newOptions.map((opt, i) => i === idx ? { ...opt, correct: !opt.correct } : opt)
      );
    }
  };

  // Dodawanie pytania do lokalnej listy
  const handleAddQuestion = () => {
    if (!newText.trim()) {
      alert("Wpisz treść pytania!");
      return;
    }

    const qOptions = ['SINGLE', 'MULTI'].includes(newType) ? newOptions : [];

    const newQ: Question = {
      survey_id: surveyId,
      type: newType,
      text: newText.trim(),
      options: qOptions,
      order_index: questions.length + 1,
      weight: 1,
      image_url: newImageUrl || undefined
    };

    setQuestions([...questions, newQ]);
    
    // Zresetowanie formularza dodawania pytań
    setNewText('');
    setNewImageUrl('');
    setNewOptions([
      { text: 'Opcja A', correct: false },
      { text: 'Opcja B', correct: false }
    ]);
  };

  // Lokalna zmiana kolejności pytań w górę/dół
  const moveQuestion = (idx: number, direction: 'up' | 'down') => {
    const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= questions.length) return;

    const list = [...questions];
    const temp = list[idx];
    list[idx] = list[nextIdx];
    list[nextIdx] = temp;

    // Przypisujemy na nowo poprawne indeksy kolejności
    const updated = list.map((q, i) => ({
      ...q,
      order_index: i + 1
    }));

    setQuestions(updated);
  };

  // Usuwanie pytania z lokalnej listy
  const deleteQuestion = (idx: number) => {
    const filtered = questions.filter((_, i) => i !== idx);
    const updated = filtered.map((q, i) => ({
      ...q,
      order_index: i + 1
    }));
    setQuestions(updated);
  };

  // Zapis całej struktury pytań do bazy (Supabase)
  const saveAllQuestions = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      // 1. Usunięcie wszystkich dotychczasowych pytań dla tej ankiety w bazie
      const { error: delErr } = await supabase
        .from('questions')
        .delete()
        .eq('survey_id', surveyId);

      if (delErr) throw delErr;

      // 2. Jeśli mamy pytania, wrzucamy nową listę do bazy
      if (questions.length > 0) {
        const rowsToInsert = questions.map((q, idx) => ({
          survey_id: q.survey_id,
          type: q.type,
          text: q.text,
          options: JSON.stringify(q.options || []),
          order_index: idx + 1,
          weight: q.weight,
          image_url: q.image_url || null
        }));

        const { error: insErr } = await supabase
          .from('questions')
          .insert(rowsToInsert);

        if (insErr) throw insErr;
      }

      setMessage({ text: 'Pomyślnie zapisano wszystkie pytania i strukturę ankiety!', type: 'success' });
      fetchSurveyDetails(); // Ponowne wczytanie bazy

    } catch (err: any) {
      setMessage({ text: 'Błąd podczas zapisu: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#1a2a3a] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="text-center py-10 space-y-4">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold">Nie odnaleziono ankiety</h2>
        <button onClick={() => router.push('/admin/surveys')} className="px-5 py-2.5 bg-[#1a2a3a] text-white rounded-xl">
          Wróć do listy
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* NAGŁÓWEK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div className="space-y-1">
          <button 
            onClick={() => router.push('/admin/surveys')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-[#1a2a3a] text-sm transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Wróć do ankiet
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold uppercase ${
              survey.version === 'P' ? 'bg-[#c5a059]/10 text-[#c5a059]' : 'bg-[#1a2a3a]/10 text-[#1a2a3a]'
            }`}>
              Zadanie {survey.task_id} &bull; {survey.version === 'P' ? 'Początkowa (P)' : 'Ewaluacyjna (E)'}
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#1a2a3a]">{survey.title}</h1>
        </div>

        {/* PRZEŁĄCZNIK STATUSU I ZAPIS */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-end">
          <select
            value={survey.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
          >
            <option value="DRAFT">Szkic (DRAFT)</option>
            <option value="PUBLISHED">Opublikowana (PUBLISHED)</option>
          </select>

          <button
            onClick={saveAllQuestions}
            disabled={saving}
            className="px-5 py-2.5 bg-[#1a2a3a] hover:bg-[#2b3c4f] disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center gap-2 hover:shadow active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Zapisywanie...' : 'Zapisz strukturę pytań'}</span>
          </button>
        </div>
      </div>

      {/* POWIADOMIENIA */}
      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEWA KOLUMNA: KREATOR NOWEGO PYTANIA */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 h-fit space-y-6">
          <h3 className="text-xl font-serif font-bold border-b border-gray-100 pb-3 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#c5a059]" />
            Nowe Pytanie
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Typ pytania</label>
              <select
                value={newType}
                onChange={(e) => {
                  setNewType(e.target.value as any);
                  setNewOptions([
                    { text: 'Opcja A', correct: false },
                    { text: 'Opcja B', correct: false }
                  ]);
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
              >
                <option value="SINGLE">Jednokrotny wybór (SINGLE)</option>
                <option value="MULTI">Wielokrotny wybór (MULTI)</option>
                <option value="TEXT">Pytanie otwarte (TEXT)</option>
                <option value="LIKERT">Skala Likerta 1-5 (LIKERT)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Treść pytania</label>
              <textarea
                placeholder="np. Ile klatek potrzebujesz, by stworzyć film poklatkowy?"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
                rows={3}
              />
            </div>

            {/* DODAWANIE ZDJĘCIA (ILUSTRACJI) */}
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Ilustracja pytania (Opcjonalnie)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                  id="question-image-upload"
                />
                <label
                  htmlFor="question-image-upload"
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  {uploadingImage ? 'Przesyłanie...' : 'Dodaj Zdjęcie'}
                </label>
                {newImageUrl && (
                  <span className="text-xs text-emerald-600 font-semibold truncate max-w-[150px]">Zdjęcie wgrane!</span>
                )}
              </div>
              {newImageUrl && (
                <div className="relative mt-2 w-24 h-24 rounded-lg overflow-hidden border border-gray-100">
                  <img src={newImageUrl} className="w-full h-full object-cover" alt="Podgląd" />
                  <button
                    type="button"
                    onClick={() => setNewImageUrl('')}
                    className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* EDYCJA OPCJI (Tylko dla SINGLE / MULTI) */}
            {['SINGLE', 'MULTI'].includes(newType) && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Opcje odpowiedzi i klucz</label>
                  <button
                    type="button"
                    onClick={addOptionField}
                    className="text-xs text-[#c5a059] font-bold hover:underline"
                  >
                    + Dodaj opcję
                  </button>
                </div>

                <div className="space-y-2.5">
                  {newOptions.map((opt, idx) => (
                    <div key={idx} className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOptionCorrectToggle(idx)}
                          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${
                            opt.correct 
                              ? 'bg-emerald-500 border-emerald-600 text-white scale-105' 
                              : 'bg-white border-gray-300 text-transparent hover:border-gray-400'
                          }`}
                          title="Zaznacz jako poprawną odpowiedź (Ważne do naliczania punktów!)"
                        >
                          <Check className="w-5 h-5 stroke-[3]" />
                        </button>

                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                          placeholder={`Treść opcji ${String.fromCharCode(65 + idx)}`}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2a3a] transition-all"
                        />

                        <label className="p-2 text-gray-500 hover:text-[#1a2a3a] hover:bg-gray-200 rounded-lg transition-colors cursor-pointer" title="Dodaj zdjęcie do opcji">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleOptionImageUpload(e, idx)} />
                          <Plus className="w-4 h-4" />
                        </label>

                        <button
                          type="button"
                          onClick={() => removeOptionField(idx)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={newOptions.length <= 1}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {((opt as any).image_url || (opt as any).image) && (
                        <div className="relative mt-1 ml-10 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-white">
                          <img src={(opt as any).image_url || (opt as any).image} className="w-full h-full object-cover" alt="Opcja podgląd" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => setNewOptions(newOptions.map((o, i) => i === idx ? { ...o, image_url: undefined, image: undefined } as any : o))}
                            className="absolute top-1 right-1 p-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 leading-normal flex gap-1.5 items-start bg-gray-50 p-2.5 rounded-lg">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 text-gray-400 mt-0.5" />
                  <span>Kliknij ikonkę „ptaszka” po lewej stronie opcji, aby oznaczyć ją jako <strong>poprawną odpowiedź</strong> (służy to do automatycznej oceny i wyliczenia punktacji).</span>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full py-3 bg-[#1a2a3a] hover:bg-[#2b3c4f] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all hover:shadow active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj do ankiety</span>
            </button>
          </div>
        </div>

        {/* PRAWA KOLUMNA: LISTA PYTAŃ W ANKIECIE */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-serif font-bold flex items-center gap-2 text-[#1a2a3a] pl-2">
            <ClipboardList className="w-5 h-5 text-[#c5a059]" />
            Lista pytań ({questions.length})
          </h3>

          {questions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
              Ankieta nie ma jeszcze żadnych pytań. Użyj kreatora po lewej stronie, aby stworzyć pierwsze pytanie!
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow transition-shadow flex gap-4">
                  {/* KOLEJNOŚĆ W GÓRĘ / DÓŁ */}
                  <div className="flex flex-col items-center justify-center gap-1 text-gray-300">
                    <button 
                      onClick={() => moveQuestion(idx, 'up')}
                      disabled={idx === 0}
                      className="hover:text-[#1a2a3a] disabled:opacity-30 transition-colors font-bold text-lg p-1"
                    >
                      ▲
                    </button>
                    <span className="font-mono text-sm font-bold text-gray-400">{idx + 1}</span>
                    <button 
                      onClick={() => moveQuestion(idx, 'down')}
                      disabled={idx === questions.length - 1}
                      className="hover:text-[#1a2a3a] disabled:opacity-30 transition-colors font-bold text-lg p-1"
                    >
                      ▼
                    </button>
                  </div>

                  {/* TREŚĆ PYTANIA */}
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded uppercase">
                          {q.type}
                        </span>
                        {['SINGLE', 'MULTI'].includes(q.type) && q.options?.some((o: any) => o.correct === true) && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100 uppercase">
                            Punktowane
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteQuestion(idx)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Usuń pytanie"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    <h4 className="font-serif font-bold text-lg text-[#1a2a3a]">{q.text}</h4>

                    {/* PODGLĄD WGRANEGO ZDJĘCIA */}
                    {q.image_url && (
                      <div className="w-32 h-20 rounded-lg overflow-hidden border border-gray-100 mt-2">
                        <img src={q.image_url} className="w-full h-full object-cover" alt="Podgląd pytania" referrerPolicy="no-referrer" />
                      </div>
                    )}

                    {/* OPIS OPCJI JEŚLI WYSTĘPUJĄ */}
                    {['SINGLE', 'MULTI'].includes(q.type) && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {q.options.map((opt: any, oIdx: number) => {
                          const text = typeof opt === 'object' ? opt.text : opt;
                          const isCorrect = typeof opt === 'object' ? opt.correct === true : false;
                          return (
                            <div 
                              key={oIdx} 
                              className={`flex flex-col gap-2 p-2.5 rounded-lg border text-xs ${
                                isCorrect 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' 
                                  : 'bg-gray-50 border-gray-100 text-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isCorrect ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                <span className="truncate">{text}</span>
                              </div>
                              {((opt as any).image_url || (opt as any).image) && (
                                <div className="ml-4 w-16 h-16 rounded overflow-hidden border border-gray-200 bg-white">
                                  <img src={(opt as any).image_url || (opt as any).image} className="w-full h-full object-cover" alt="Opcja miniaturka" referrerPolicy="no-referrer" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
