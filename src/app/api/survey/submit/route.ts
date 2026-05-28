// route.ts (api/survey/submit)
import React from 'react';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { renderToBuffer } from '@react-pdf/renderer';
import { CertificateTemplate } from '@/components/CertificateTemplate';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { surveyId, answers, code, consent } = payload;

    if (!code || code.length < 3) {
      return NextResponse.json({ error: "Nieprawidłowy kod autoryzacyjny." }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ error: "Wymagana akceptacja zgody RODO." }, { status: 400 });
    }

    // 1. Walidacja kodu ucznia w bazie (z pominięciem RLS za pomocą supabaseAdmin)
    const { data: student, error: studentErr } = await supabaseAdmin
      .from('codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (studentErr || !student) {
      return NextResponse.json({ error: "Nieprawidłowy kod. Upewnij się, że wpisałeś go poprawnie." }, { status: 404 });
    }

    // 2. Pobranie danych ankiety i pytań
    const { data: survey, error: surveyErr } = await supabaseAdmin
      .from('surveys')
      .select('*')
      .eq('id', surveyId)
      .single();

    if (surveyErr || !survey) {
      return NextResponse.json({ error: "Nie odnaleziono ankiety w systemie." }, { status: 404 });
    }

    const { data: questions, error: questionsErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('order_index', { ascending: true });

    if (questionsErr || !questions) {
      return NextResponse.json({ error: "Błąd podczas wczytywania pytań." }, { status: 500 });
    }

    // 3. Weryfikacja unikalności (czy ten kod już wypełnił tę wersję dla tego zadania)
    const { data: existingResponse } = await supabaseAdmin
      .from('responses')
      .select('id')
      .eq('student_code', student.code)
      .eq('task_id', survey.task_id)
      .eq('version', survey.version)
      .maybeSingle();

    if (existingResponse) {
      return NextResponse.json({
        error: `Ten kod już wypełnił ankietę ${survey.version === 'P' ? 'Początkową' : 'Ewaluacyjną'} dla Zadania ${survey.task_id}.`
      }, { status: 400 });
    }

    // 4. Automatyczna ocena ankiety
    let score = 0;
    let maxScore = 0;

    questions.forEach(q => {
      if (['SINGLE', 'DROPDOWN'].includes(q.type) && Array.isArray(q.options)) {
        // Sprawdzamy czy pytanie posiada zdefiniowaną poprawną odpowiedź
        const correctOpt = q.options.find((o: any) => o.correct === true);
        if (correctOpt) {
          maxScore++;
          const userAnswer = answers[q.id];
          if (userAnswer === correctOpt.text) {
            score++;
          }
        }
      }
    });

    // 5. Pobranie wyniku początkowego (P) dla certyfikatu ewaluacyjnego (E)
    let wynikP_str = '---';
    let wynikE_str = maxScore > 0 ? `${score} / ${maxScore} pkt` : '---';
    let przyrost_str = '---';

    if (survey.version === 'E') {
      const { data: initResponse } = await supabaseAdmin
        .from('responses')
        .select('score, max_score')
        .eq('student_code', student.code)
        .eq('task_id', survey.task_id)
        .eq('version', 'P')
        .maybeSingle();

      if (initResponse) {
        wynikP_str = initResponse.max_score > 0 ? `${initResponse.score} / ${initResponse.max_score} pkt` : `${initResponse.score} pkt`;
        const diff = score - initResponse.score;
        przyrost_str = diff > 0 ? `+${diff} pkt` : `${diff} pkt`;
      } else {
        wynikP_str = 'brak ankiety P';
      }
    } else {
      wynikP_str = maxScore > 0 ? `${score} / ${maxScore} pkt` : '---';
    }

    // 6. Generowanie certyfikatu w tle i wrzucenie do Supabase Storage
    const dateStr = new Date().toLocaleDateString('pl-PL');
    let certUrl = null;

    try {
      // Renderowanie certyfikatu do bufora binarnego na serwerze
      const pdfBuffer = await renderToBuffer(
        React.createElement(CertificateTemplate, {
          studentName: `${student.first_name} ${student.last_name}`,
          surveyTitle: survey.title,
          version: survey.version,
          taskId: survey.task_id,
          dateStr,
          wynikP: wynikP_str,
          wynikE: wynikE_str,
          przyrost: przyrost_str,
        }) as any
      );

      // Ścieżka pliku w Storage: certificates/Zadanie_[X]/[Code]_[Version].pdf
      const fileName = `Zadanie_${survey.task_id}/${student.code}_${survey.version}.pdf`;
      
      // Zapisujemy na Supabase Storage w kubełku 'certificates'
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('certificates')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (!uploadErr) {
        // Pobieramy publiczny link do pobrania pliku
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('certificates')
          .getPublicUrl(fileName);
        
        certUrl = publicUrlData.publicUrl;
      } else {
        console.error("Storage upload error: ", uploadErr);
      }
    } catch (pdfErr) {
      console.error("Generowanie PDF nie powiodło się: ", pdfErr);
    }

    // 7. Zapisanie odpowiedzi w bazie danych
    const { data: response, error: responseErr } = await supabaseAdmin
      .from('responses')
      .insert({
        survey_id: survey.id,
        task_id: survey.task_id,
        version: survey.version,
        student_code: student.code,
        answers,
        score,
        max_score: maxScore,
        consent,
        cert_pdf_url: certUrl
      })
      .select()
      .single();

    if (responseErr) {
      console.error("Response save error: ", responseErr);
      return NextResponse.json({ error: "Błąd podczas zapisu odpowiedzi w bazie." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      score,
      maxScore,
      certUrl,
      studentName: `${student.first_name} ${student.last_name}`,
      surveyTitle: survey.title,
      version: survey.version,
      taskId: survey.task_id,
      dateStr,
      wynikP: wynikP_str,
      wynikE: wynikE_str,
      przyrost: przyrost_str
    });

  } catch (e: any) {
    console.error("Endpoint submit error: ", e);
    return NextResponse.json({ error: "Błąd wewnętrzny serwera: " + e.message }, { status: 500 });
  }
}
