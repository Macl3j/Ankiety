// route.ts (api/admin/import-sheet)
// GET  -> podglad: co nowego jest w rownoleglym arkuszu Google, a czego jeszcze nie ma
//         w naszej bazie (nic nie zapisuje).
// POST -> zapisuje wylacznie te pozycje, ktorych klucze (kod / "kod|zadanie|wersja")
//         admin jawnie wybral w podgladzie.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { buildImportPlan } from '@/lib/sheetImport';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plan = await buildImportPlan();
    // Nie wysylamy do przegladarki wewnetrznych pol zaczynajacych sie od "_" (surowe
    // odpowiedzi/answers) - podglad pokazuje tylko to, co potrzebne do decyzji admina.
    const newResponses = plan.newResponses.map(({ _surveyId, _answers, _consent, ...rest }) => rest);
    return NextResponse.json({ ...plan, newResponses });
  } catch (error: any) {
    console.error('Import-sheet preview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const selectedCodes: string[] = Array.isArray(body?.codes) ? body.codes : [];
    const selectedResponseKeys: string[] = Array.isArray(body?.responseKeys) ? body.responseKeys : [];

    // Przeliczamy plan od nowa po stronie serwera - nigdy nie ufamy danym z przegladarki
    // poza tym, KTORE klucze zostaly zaznaczone. Chroni to przed nieaktualnym/spreparowanym
    // podgladem i przed zapisaniem czegokolwiek, co miedzyczasie przestalo byc "nowe".
    const plan = await buildImportPlan();

    const codesToInsert = plan.newCodes.filter((c) => selectedCodes.includes(c.code));
    const responsesToInsert = plan.newResponses.filter((r) => selectedResponseKeys.includes(r.key));

    let insertedCodes = 0;
    if (codesToInsert.length > 0) {
      const rows = codesToInsert.map((c) => ({
        code: c.code,
        first_name: c.firstName,
        last_name: c.lastName,
        school: c.school,
        class: c.class,
        created_at: c.createdAt ? `${c.createdAt}+00` : new Date().toISOString(),
        source: 'sheet_import',
      }));
      const { error } = await supabaseAdmin.from('codes').upsert(rows, { onConflict: 'code', ignoreDuplicates: true });
      if (error) throw error;
      insertedCodes = codesToInsert.length;
    }

    let insertedResponses = 0;
    if (responsesToInsert.length > 0) {
      const rows = responsesToInsert.map((r) => ({
        survey_id: r._surveyId,
        task_id: r.taskId,
        version: r.version,
        student_code: r.studentCode,
        answers: r._answers,
        score: r.score,
        max_score: r.maxScore,
        consent: r._consent,
        created_at: r.timestamp ? `${r.timestamp}+00` : new Date().toISOString(),
        source: 'sheet_import',
      }));
      // Baza ma unique constraint na (student_code, task_id, version) - ignoreDuplicates
      // to dodatkowe zabezpieczenie na wypadek podwojnego kliknietia/rownoleglego uruchomienia.
      const { error } = await supabaseAdmin
        .from('responses')
        .upsert(rows, { onConflict: 'student_code,task_id,version', ignoreDuplicates: true });
      if (error) throw error;
      insertedResponses = responsesToInsert.length;
    }

    return NextResponse.json({ insertedCodes, insertedResponses });
  } catch (error: any) {
    console.error('Import-sheet commit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
