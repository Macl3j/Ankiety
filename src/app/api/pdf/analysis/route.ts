// route.ts (api/pdf/analysis)
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { AnalysisTemplate, AnalysisComparisonRow } from '@/components/AnalysisTemplate';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { sanitizeText, asciiFilename } from '@/lib/pdfSanitize';
import { findBestMatch } from '@/lib/textSimilarity';
import { buildQAFromImported, buildQAFromLive } from '@/lib/buildQA';

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

    const { data: eResponse, error: eErr } = await supabaseAdmin
      .from('responses')
      .select(`*, codes (first_name, last_name, class), surveys (title)`)
      .eq('id', responseId)
      .single();

    if (eErr || !eResponse) {
      return new Response(JSON.stringify({ error: "Nie odnaleziono odpowiedzi w bazie." }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (eResponse.version !== 'E') {
      return new Response(JSON.stringify({ error: "Analiza porównawcza jest dostępna tylko dla ankiet Ewaluacyjnych." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const studentInfo = eResponse.codes;
    if (!studentInfo) {
      return new Response(JSON.stringify({ error: "Niekompletne dane relacyjne (uczeń)." }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: pResponse, error: pErr } = await supabaseAdmin
      .from('responses')
      .select('*')
      .eq('student_code', eResponse.student_code)
      .eq('task_id', eResponse.task_id)
      .eq('version', 'P')
      .maybeSingle();

    if (pErr || !pResponse) {
      return new Response(JSON.stringify({ error: "Brak ankiety Początkowej do porównania dla tego ucznia." }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const qaE = eResponse.source !== 'live'
      ? buildQAFromImported(eResponse.answers)
      : await buildQAFromLive(eResponse.survey_id, eResponse.answers);

    const qaP = pResponse.source !== 'live'
      ? buildQAFromImported(pResponse.answers)
      : await buildQAFromLive(pResponse.survey_id, pResponse.answers);

    const comparisonRows: AnalysisComparisonRow[] = qaE.map((eItem) => {
      const match = findBestMatch(eItem.question, qaP, 0.4);
      const answerP = match ? match.answer || '-' : '---';
      const pointsP = match ? match.points : null;

      let delta = '';
      let deltaColor: AnalysisComparisonRow['deltaColor'] = 'none';

      if (eItem.points !== null) {
        const basePointsP = pointsP !== null ? pointsP : 0;
        const diff = eItem.points - basePointsP;
        delta = diff > 0 ? `+${diff}` : `${diff}`;
        deltaColor = diff > 0 ? 'green' : diff < 0 ? 'red' : 'gray';
      }

      return {
        question: eItem.question,
        answerP,
        answerE: eItem.answer || '-',
        delta,
        deltaColor,
      };
    });

    const studentName = sanitizeText(`${studentInfo.first_name} ${studentInfo.last_name}`);
    const dateStr = sanitizeText(new Date(eResponse.created_at).toLocaleDateString('pl-PL'));

    const stream = await renderToStream(
      React.createElement(AnalysisTemplate, {
        studentName,
        studentCode: sanitizeText(eResponse.student_code),
        taskId: eResponse.task_id,
        className: sanitizeText(studentInfo.class),
        dateStr,
        scoreP: pResponse.score,
        maxScoreP: pResponse.max_score,
        scoreE: eResponse.score,
        maxScoreE: eResponse.max_score,
        comparisonRows,
      }) as any
    );

    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Analiza_${asciiFilename(studentName)}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (e: any) {
    console.error("Generowanie Analizy PDF nie powiodło się: ", e);
    return new Response(JSON.stringify({ error: "Błąd podczas generowania analizy PDF: " + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
