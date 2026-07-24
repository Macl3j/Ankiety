// route.ts (api/pdf/certificate)
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { CertificateTemplate } from '@/components/CertificateTemplate';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { sanitizeText, asciiFilename } from '@/lib/pdfSanitize';
import { fetchCertificateImages } from '@/lib/certificateAssets';

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
    // (nigdy nie ufamy danym certyfikatu przekazanym z URL — wszystko liczymy tu, na serwerze)
    const { data: response, error: responseErr } = await supabaseAdmin
      .from('responses')
      .select(`
        *,
        codes (first_name, last_name, class),
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

    // 2. Wyliczenie wyników P / E / przyrostu identycznie jak przy generowaniu certyfikatu w /api/survey/submit
    let wynikP_str = '---';
    let wynikE_str = response.max_score > 0 ? `${response.score} / ${response.max_score} pkt` : '---';
    let przyrost_str = '---';

    if (response.version === 'E') {
      const { data: initResponse } = await supabaseAdmin
        .from('responses')
        .select('score, max_score')
        .eq('student_code', response.student_code)
        .eq('task_id', response.task_id)
        .eq('version', 'P')
        .maybeSingle();

      if (initResponse) {
        wynikP_str = initResponse.max_score > 0 ? `${initResponse.score} / ${initResponse.max_score} pkt` : `${initResponse.score} pkt`;
        const diff = response.score - initResponse.score;
        przyrost_str = diff > 0 ? `+${diff} pkt` : `${diff} pkt`;
      } else {
        wynikP_str = 'brak ankiety P';
      }
    } else {
      wynikP_str = response.max_score > 0 ? `${response.score} / ${response.max_score} pkt` : '---';
    }

    const studentName = sanitizeText(`${studentInfo.first_name} ${studentInfo.last_name}`);
    const dateStr = sanitizeText(new Date(response.created_at).toLocaleDateString('pl-PL'));

    // 3. Pobranie banera UE i podpisu z Supabase Storage (z fallbackiem na public/ w certificateAssets.ts)
    const { bannerImage, signatureImage } = await fetchCertificateImages();

    // 4. Generujemy strumień PDF z szablonu Reactowego
    const stream = await renderToStream(
      React.createElement(CertificateTemplate, {
        studentName,
        surveyTitle: sanitizeText(surveyInfo.title),
        version: response.version,
        taskId: response.task_id,
        dateStr,
        wynikP: sanitizeText(wynikP_str),
        wynikE: sanitizeText(wynikE_str),
        przyrost: sanitizeText(przyrost_str),
        studentClass: studentInfo.class,
        bannerImage,
        signatureImage,
      }) as any
    );

    // Zwracamy strumień jako odpowiedź PDF do przeglądarki
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Certyfikat_${asciiFilename(studentName)}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (e: any) {
    console.error("Generowanie PDF nie powiodło się: ", e);
    return new Response(JSON.stringify({ error: "Błąd podczas generowania certyfikatu PDF: " + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
