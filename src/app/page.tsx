// page.tsx (Główny panel studenta)
'use client';

import React, { useState } from 'react';
import { 
  KeyRound, 
  School, 
  GraduationCap, 
  ArrowRight, 
  ClipboardCheck, 
  FileCheck, 
  Download, 
  CheckCircle2, 
  ArrowLeft,
  AlertCircle,
  Lock,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface Student {
  code: string;
  firstName: string;
  lastName: string;
  school: string;
  class: string;
}

interface Survey {
  id: string;
  taskId: number;
  title: string;
  group: string;
  version: string;
  completed: boolean;
  locked?: boolean;
}

interface SummaryData {
  id: string;
  score: number;
  maxScore: number;
  certUrl: string;
  wynikP: string;
  wynikE: string;
  przyrost: string;
}

export default function StudentPortal() {
  // Nawigacja SPA: 'login' | 'dashboard' | 'survey' | 'summary'
  const [step, setStep] = useState<'login' | 'dashboard' | 'survey' | 'summary'>('login');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Dane z API
  const [student, setStudent] = useState<Student | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [consent, setConsent] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  // 1. Walidacja kodu i logowanie
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length < 3) {
      setError('Kod dostępu musi mieć co najmniej 3 znaki.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/survey/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Błąd podczas autoryzacji.');
      }

      setStudent(data.student);
      setSurveys(data.surveys);
      setStep('dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Ładowanie pytań po kliknięciu "Wypełnij ankietę"
  const startSurvey = async (survey: Survey) => {
    setLoading(true);
    setError('');
    setActiveSurvey(survey);
    setAnswers({});
    setConsent(false);

    try {
      // Pobranie pytań przez klienta Supabase (publiczny odczyt, RLS pozwala na
      // SELECT dla pytań należących do opublikowanej ankiety)
      const { data: questionsData, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('survey_id', survey.id)
        .order('order_index', { ascending: true });

      if (qErr || !questionsData) {
        throw new Error('Nie udało się wczytać pytań do tej ankiety.');
      }

      // Parsujemy JSON z opcji pytań
      const parsedQuestions = questionsData.map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }));

      setQuestions(parsedQuestions);
      setStep('survey');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Obsługa zmiany odpowiedzi
  const handleAnswerChange = (qId: string, val: any) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: val
    }));
  };

  // 4. Obsługa wysłania ankiety
  const submitSurvey = async () => {
    if (!consent) {
      setError('Musisz wyrazić zgodę RODO, aby przesłać ankietę.');
      return;
    }

    // Sprawdzenie, czy wszystkie pytania mają odpowiedzi (w tym puste zaznaczenia MULTI)
    const unanswered = questions.filter(q => {
      if (q.weight <= 0) return false;
      const a = answers[q.id];
      if (Array.isArray(a)) return a.length === 0;
      return a === undefined || a === '';
    });
    if (unanswered.length > 0) {
      setError('Proszę odpowiedzieć na wszystkie pytania przed wysłaniem.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: activeSurvey?.id,
          answers,
          code: student?.code,
          consent
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Wystąpił błąd podczas wysyłania.');
      }

      setSummary({
        id: data.id,
        score: data.score,
        maxScore: data.maxScore,
        certUrl: data.certUrl,
        wynikP: data.wynikP,
        wynikE: data.wynikE,
        przyrost: data.przyrost
      });
      setStep('summary');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fcfcf9] text-[#1a2a3a] flex flex-col items-center justify-center p-4">
      {/* 1. KROK: LOGOWANIE KODEM */}
      {step === 'login' && (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center transition-all duration-300 hover:shadow-2xl">
          <div className="mx-auto w-16 h-16 bg-[#f7f5f0] text-[#c5a059] flex items-center justify-center rounded-full mb-6">
            <KeyRound className="w-8 h-8" />
          </div>
          
          <h1 className="text-3xl font-serif font-bold text-[#1a2a3a] mb-2">Panel Ucznia</h1>
          <p className="text-gray-500 mb-8 font-light">Wpisz swój unikalny kod, aby uzyskać dostęp do ankiet projektu <strong>Stolica eXperymentu</strong></p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="text"
                placeholder="Napisz Twój kod (np. ALAN5A)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-5 py-4 border border-gray-200 rounded-xl text-center font-mono text-xl tracking-widest text-[#1a2a3a] focus:outline-none focus:ring-2 focus:ring-[#c5a059] focus:border-transparent transition-all duration-300"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#1a2a3a] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#2b3c4f] active:scale-95 transition-all duration-300 disabled:opacity-50"
            >
              <span>{loading ? 'Logowanie...' : 'Rozpocznij'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {/* 2. KROK: DASHBOARD UCZNIA */}
      {step === 'dashboard' && student && (
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 p-8 transition-all duration-300">
          <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
            <div>
              <div className="text-[#c5a059] font-serif text-lg italic mb-1">Witaj,</div>
              <h2 className="text-3xl font-serif font-bold text-[#1a2a3a]">{student.firstName} {student.lastName}</h2>
            </div>
            <div className="bg-[#f7f5f0] border border-[#e2dccf] text-[#1a2a3a] px-4 py-2 rounded-lg font-mono text-sm font-bold">
              Kod: {student.code}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
              <School className="w-6 h-6 text-[#c5a059]" />
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Szkoła</div>
                <div className="font-semibold text-sm">{student.school}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
              <GraduationCap className="w-6 h-6 text-[#c5a059]" />
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Klasa</div>
                <div className="font-semibold text-sm">{student.class}</div>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-serif font-bold text-[#1a2a3a] mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#c5a059]" />
            Twoje ankiety:
          </h3>

          <div className="space-y-4">
            {surveys.length === 0 ? (
              <div className="text-center p-8 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                Brak przypisanych ankiet dla Twojej klasy.
              </div>
            ) : (
              surveys.map((survey) => (
                <div 
                  key={survey.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl border transition-all duration-300 ${
                    survey.completed 
                      ? 'bg-emerald-50/30 border-emerald-100 hover:border-emerald-200' 
                      : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm hover:shadow'
                  }`}
                >
                  <div className="mb-4 sm:mb-0">
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold uppercase mr-2 ${
                      survey.version === 'P' ? 'bg-[#c5a059]/10 text-[#c5a059]' : 'bg-[#1a2a3a]/10 text-[#1a2a3a]'
                    }`}>
                      {survey.version === 'P' ? 'Początkowa (P)' : 'Ewaluacyjna (E)'}
                    </span>
                    <h4 className="font-serif font-bold text-lg text-[#1a2a3a] mt-1">{survey.title}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Zadanie {survey.taskId} &bull; {survey.group}</p>
                  </div>

                  {survey.completed ? (
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-lg text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Wypełniono</span>
                    </div>
                  ) : survey.locked ? (
                    <div className="flex items-center gap-2 text-amber-700 font-semibold bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-lg text-sm" title="Najpierw wypełnij Ankietę Początkową (P)!">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>Zablokowana</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => startSurvey(survey)}
                      className="px-5 py-2.5 bg-[#1a2a3a] hover:bg-[#2b3c4f] text-white font-medium rounded-lg text-sm flex items-center justify-center gap-1.5 transition-all duration-300"
                    >
                      <span>Wypełnij</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. KROK: FORMULARZ ANKIETY */}
      {step === 'survey' && activeSurvey && (
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 p-8 transition-all duration-300">
          <button 
            onClick={() => setStep('dashboard')}
            className="flex items-center gap-1 text-gray-400 hover:text-[#1a2a3a] text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Wróć do listy
          </button>

          <span className="text-xs text-[#c5a059] uppercase tracking-wider font-bold">Wypełniasz ankietę:</span>
          <h2 className="text-3xl font-serif font-bold text-[#1a2a3a] mt-1 mb-6 border-b border-gray-100 pb-4">
            {activeSurvey.title}
          </h2>

          <div className="space-y-8 mb-8">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-6 bg-gray-50 rounded-xl space-y-4 border border-gray-100">
                <h4 className="font-serif font-bold text-lg text-[#1a2a3a] leading-snug">
                  {idx + 1}. {q.text}
                </h4>

                {/* Wyświetlanie zdjęcia pytania (ilustracja) */}
                {q.image_url && (
                  <div className="w-full max-h-64 rounded-xl overflow-hidden border border-gray-100 mb-4 bg-white flex items-center justify-center">
                    <img src={q.image_url} className="max-h-64 object-contain" alt="Ilustracja do pytania" referrerPolicy="no-referrer" />
                  </div>
                )}

                {/* OPCJA: SINGLE (Jednokrotny wybór) */}
                {q.type === 'SINGLE' && (
                  <div className="space-y-2.5">
                    {q.options?.map((opt: any, oIdx: number) => {
                      const text = typeof opt === 'object' ? opt.text : opt;
                      return (
                        <label 
                          key={oIdx} 
                          className={`flex items-center gap-3 p-3.5 bg-white border rounded-xl cursor-pointer hover:border-[#c5a059]/50 transition-all ${
                            answers[q.id] === text ? 'border-[#c5a059] bg-[#f7f5f0]/30' : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            value={text}
                            checked={answers[q.id] === text}
                            onChange={() => handleAnswerChange(q.id, text)}
                            className="w-5 h-5 text-[#c5a059] focus:ring-[#c5a059]"
                          />
                          {((opt as any).image_url || (opt as any).image) && (
                            <div className="w-12 h-12 rounded overflow-hidden border border-gray-200 bg-white shrink-0">
                              <img src={(opt as any).image_url || (opt as any).image} className="w-full h-full object-cover" alt="Opcja" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          <span className="text-sm text-[#1a2a3a]">{text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* OPCJA: MULTI (Wielokrotny wybór) */}
                {q.type === 'MULTI' && (
                  <div className="space-y-2.5">
                    {q.options?.map((opt: any, oIdx: number) => {
                      const text = typeof opt === 'object' ? opt.text : opt;
                      const currentAnswers = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                      const isChecked = currentAnswers.includes(text);
                      
                      const toggleCheck = () => {
                        let newAnswers;
                        if (isChecked) {
                          newAnswers = currentAnswers.filter((a: any) => a !== text);
                        } else {
                          newAnswers = [...currentAnswers, text];
                        }
                        handleAnswerChange(q.id, newAnswers);
                      };

                      return (
                        <label 
                          key={oIdx} 
                          className={`flex items-center gap-3 p-3.5 bg-white border rounded-xl cursor-pointer hover:border-[#c5a059]/50 transition-all ${
                            isChecked ? 'border-[#c5a059] bg-[#f7f5f0]/30' : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={toggleCheck}
                            className="w-5 h-5 rounded text-[#c5a059] focus:ring-[#c5a059]"
                          />
                          {((opt as any).image_url || (opt as any).image) && (
                            <div className="w-12 h-12 rounded overflow-hidden border border-gray-200 bg-white shrink-0">
                              <img src={(opt as any).image_url || (opt as any).image} className="w-full h-full object-cover" alt="Opcja" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          <span className="text-sm text-[#1a2a3a]">{text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* OPCJA: LIKERT (Skala 1-5) */}
                {q.type === 'LIKERT' && (
                  <div className="flex justify-between items-center max-w-md mx-auto pt-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleAnswerChange(q.id, val)}
                        className={`w-12 h-12 rounded-full font-bold flex items-center justify-center border transition-all ${
                          answers[q.id] === val 
                            ? 'bg-[#1a2a3a] border-[#1a2a3a] text-white scale-110 shadow-md' 
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}

                {/* OPCJA: TEXT (Pytanie otwarte) */}
                {q.type === 'TEXT' && (
                  <div>
                    <textarea
                      placeholder="Wpisz swoją odpowiedź..."
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059] focus:border-transparent transition-all"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Akceptacja RODO */}
          <div className="bg-[#f7f5f0]/50 border border-[#e2dccf] p-5 rounded-xl mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={() => setConsent(!consent)}
                className="w-5 h-5 mt-0.5 rounded text-[#c5a059] focus:ring-[#c5a059]"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                Wyrażam zgodę na przetwarzanie moich danych osobowych w celu udziału w badaniu ankietowym w ramach projektu <strong>Stolica eXperymentu</strong>, współfinansowanego ze środków Unii Europejskiej. Rozumiem, że moje dane zostaną zarchiwizowane wyłącznie do celów weryfikacji i audytów dofinansowania.
              </span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl text-sm mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={submitSurvey}
            disabled={loading}
            className="w-full py-4 bg-[#1a2a3a] hover:bg-[#2b3c4f] text-white font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all duration-300 disabled:opacity-50"
          >
            <FileCheck className="w-5 h-5" />
            <span>{loading ? 'Przetwarzanie...' : 'Wyślij ankietę'}</span>
          </button>
        </div>
      )}

      {/* 4. KROK: PODSUMOWANIE (EKRAN SUKCESU Z CERTYFIKATEM) */}
      {step === 'summary' && summary && student && activeSurvey && (
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center transition-all duration-300">
          <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-full mb-6 relative">
            <CheckCircle2 className="w-10 h-10" />
            <div className="absolute -top-1 -right-1 text-yellow-500 animate-bounce">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
          </div>

          <h2 className="text-3xl font-serif font-bold text-[#1a2a3a] mb-2">Gratulacje!</h2>
          <p className="text-gray-500 mb-8 font-light">Twoja ankieta została pomyślnie zapisana w bazie projektu.</p>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8 text-left space-y-4">
            <h4 className="font-serif font-bold text-[#1a2a3a] text-lg border-b border-gray-200 pb-2 flex justify-between">
              <span>Podsumowanie Wyników</span>
              <span className="text-xs text-[#c5a059] uppercase tracking-wider font-bold mt-1">
                {activeSurvey.version === 'P' ? 'Początkowa' : 'Ewaluacyjna'}
              </span>
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white border border-gray-100 rounded-xl text-center">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Wynik z ankiety</div>
                <div className="font-bold text-lg mt-0.5">{summary.wynikE !== '---' ? summary.wynikE : summary.wynikP}</div>
              </div>
              
              {activeSurvey.version === 'E' && (
                <div className="p-3 bg-white border border-gray-100 rounded-xl text-center">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">Przed Szkoleniem</div>
                  <div className="font-bold text-lg mt-0.5">{summary.wynikP}</div>
                </div>
              )}
            </div>

            {activeSurvey.version === 'E' && summary.przyrost !== '---' && (
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center flex items-center justify-between px-6">
                <span className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Przyrost Wiedzy:</span>
                <span className="font-extrabold text-2xl text-emerald-700">{summary.przyrost}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {summary.certUrl ? (
              <a
                href={summary.certUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 bg-[#c5a059] hover:bg-[#b08b47] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 transition-all duration-300"
              >
                <Download className="w-5 h-5" />
                <span>Pobierz Certyfikat PDF</span>
              </a>
            ) : (
              // Alternatywny link na wypadek problemów z wrzuceniem do Storage (Edge streaming)
              // Dane certyfikatu są tu zawsze pobierane z bazy po responseId, nigdy z parametrów URL
              <a
                href={`/api/pdf/certificate?responseId=${summary.id}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 bg-[#c5a059] hover:bg-[#b08b47] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 transition-all duration-300"
              >
                <Download className="w-5 h-5" />
                <span>Pobierz Certyfikat PDF</span>
              </a>
            )}

            <button
              onClick={() => setStep('dashboard')}
              className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-[#1a2a3a] font-semibold rounded-xl active:scale-95 transition-all duration-300"
            >
              Wróć do Pulpitu
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
