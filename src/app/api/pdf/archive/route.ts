// route.ts (api/pdf/archive)
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { SurveyArchiveTemplate } from '@/components/SurveyArchiveTemplate';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { sanitizeText } from '@/lib/pdfSanitize';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get('responseId');

    if (!responseId) {
      return new Response(JSON.stringify({ error: "Brak parametru responseId." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Pobierz odpowiedź z bazy wraz z powiązanymi danymi ucznia i ankiety
    const { data: response, error: responseErr } = await supabaseAdmin
      .from('responses')
      .select(`
        *,
        codes (first_name, last_name, school, class),
        surveys (title)
      `)
      .eq('id', responseId)
      .single();

    if (responseErr || !response) {
      return new Response(JSON.stringify({ error: "Nie odnaleziono odpowiedzi w bazie." }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const studentInfo = response.codes;
    const surveyInfo = response.surveys;

    if (!studentInfo || !surveyInfo) {
      return new Response(JSON.stringify({ error: "Niekompletne dane relacyjne (uczeń lub ankieta)." }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Budowanie listy odpowiedzi w formacie dla PDF.
    // Historyczne odpowiedzi zaimportowane z MS Forms (source='ms_forms_import') nie mają
    // odpowiadającego wpisu w live tabeli `questions` — ich pytania są zdenormalizowane
    // wprost w `answers` jako {"q_1": {question, answer}, ...}. Dla odpowiedzi z live-flow
    // (`source='live'`) `answers` jest kluczowane po UUID pytania, więc trzeba je złączyć
    // z bieżącą tabelą `questions`, żeby uzyskać treść pytania.
    let answersList: { nr: number; question: string; answer: string }[];

    if (response.source === 'ms_forms_import') {
      const denormalized = response.answers as Record<string, { question: string; answer: string }>;
      answersList = Object.keys(denormalized)
        .sort((a, b) => {
          const na = parseInt(a.replace('q_', ''), 10);
          const nb = parseInt(b.replace('q_', ''), 10);
          return na - nb;
        })
        .map((key, i) => ({
          nr: i + 1,
          question: sanitizeText(denormalized[key].question),
          answer: sanitizeText(denormalized[key].answer)
        }));
    } else {
      const { data: questions, error: questionsErr } = await supabaseAdmin
        .from('questions')
        .select('*')
        .eq('survey_id', response.survey_id)
        .order('order_index', { ascending: true });

      if (questionsErr || !questions) {
        return new Response(JSON.stringify({ error: "Błąd podczas wczytywania pytań." }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      answersList = questions.map((q: any, i: number) => {
        let ans = response.answers[q.id] || '';
        if (Array.isArray(ans)) {
          ans = ans.join(', ');
        }
        return {
          nr: i + 1,
          question: sanitizeText(q.text),
          answer: sanitizeText(ans.toString())
        };
      });
    }

    const dateStr = new Date(response.created_at).toLocaleDateString('pl-PL');

    // 4. Generujemy strumień PDF z szablonu Reactowego
    const stream = await renderToStream(
      React.createElement(SurveyArchiveTemplate, {
        studentName: sanitizeText(`${studentInfo.first_name} ${studentInfo.last_name}`),
        studentCode: sanitizeText(response.student_code),
        school: sanitizeText(studentInfo.school),
        studentClass: sanitizeText(studentInfo.class),
        dateStr: sanitizeText(dateStr),
        consent: response.consent,
        surveyTitle: sanitizeText(surveyInfo.title),
        taskId: response.task_id,
        version: response.version,
        answersList,
      }) as any
    );

    // Zwracamy strumień jako odpowiedź PDF do przeglądarki
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Karta_Odpowiedzi_${studentInfo.first_name}_${studentInfo.last_name}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (e: any) {
    console.error("Generowanie Archiwum PDF nie powiodło się: ", e);
    return new Response(JSON.stringify({ error: "Błąd podczas generowania pliku PDF: " + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
