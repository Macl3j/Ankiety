// route.ts (api/pdf/certificate)
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { CertificateTemplate } from '@/components/CertificateTemplate';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentName = searchParams.get('studentName') || 'Uczeń';
    const surveyTitle = searchParams.get('surveyTitle') || 'Ankieta';
    const version = searchParams.get('version') || 'P';
    const taskId = Number(searchParams.get('taskId')) || 1;
    const dateStr = searchParams.get('dateStr') || new Date().toLocaleDateString('pl-PL');
    const wynikP = searchParams.get('wynikP') || '---';
    const wynikE = searchParams.get('wynikE') || '---';
    const przyrost = searchParams.get('przyrost') || '---';

    // Generujemy strumień PDF z szablonu Reactowego
    const stream = await renderToStream(
      React.createElement(CertificateTemplate, {
        studentName,
        surveyTitle,
        version,
        taskId,
        dateStr,
        wynikP,
        wynikE,
        przyrost,
      }) as any
    );

    // Zwracamy strumień jako odpowiedź PDF do przeglądarki
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Certyfikat_${studentName.replace(/\s+/g, '_')}.pdf"`,
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
