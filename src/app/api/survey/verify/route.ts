// route.ts (api/survey/verify)
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code || code.length < 3) {
      return NextResponse.json({ error: "Nieprawidłowy kod autoryzacyjny." }, { status: 400 });
    }

    // 1. Walidacja kodu w bazie
    const { data: student, error: studentErr } = await supabaseAdmin
      .from('codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (studentErr || !student) {
      return NextResponse.json({ error: "Nieprawidłowy kod. Spróbuj ponownie." }, { status: 404 });
    }

    // 2. Znalezienie ankiet dla klasy ucznia
    // Pobieramy wszystkie opublikowane ankiety
    const { data: surveys, error: surveysErr } = await supabaseAdmin
      .from('surveys')
      .select('*')
      .eq('status', 'PUBLISHED');

    if (surveysErr || !surveys) {
      return NextResponse.json({ error: "Nie odnaleziono żadnych ankiet w systemie." }, { status: 500 });
    }

    // Filtrujemy ankiety dopasowane do grupy/klasy ucznia
    // Klasy ucznia np: '5a', '5b' -> pasują do ankiet dla grupy 'Klasa 5'
    // Wyciągamy tylko wiodącą sekwencję cyfr (a nie wszystkie cyfry w stringu), żeby
    // uniknąć sklejania np. '5' i '2' z 'Klasa 5 (grupa 2)' w jedno "52"
    const studentClassNum = student.class.match(/^\d+/)?.[0] || '';

    const matchedSurveys = surveys.filter((s: any) => {
      const surveyGroupNum = s.group.match(/\d+/)?.[0] || '';
      return studentClassNum !== '' && studentClassNum === surveyGroupNum;
    });

    // 3. Sprawdzamy statusy wypełnienia (P i E) dla każdej ankiety przez tego konkretnego ucznia
    const { data: responses } = await supabaseAdmin
      .from('responses')
      .select('task_id, version')
      .eq('student_code', student.code);

    const completedMap = new Map();
    responses?.forEach((r: any) => {
      completedMap.set(`${r.task_id}_${r.version}`, true);
    });

    const surveysWithCompletion = matchedSurveys.map((s: any) => {
      const isCompleted = completedMap.has(`${s.task_id}_${s.version}`);
      let locked = false;

      // Jeżeli to ankieta Ewaluacyjna (E), sprawdzamy czy uczeń ma zaliczoną wersję Początkową (P) z tym samym task_id
      if (s.version === 'E' && !completedMap.has(`${s.task_id}_P`)) {
        locked = true;
      }

      return {
        id: s.id,
        taskId: s.task_id,
        title: s.title,
        group: s.group,
        version: s.version,
        completed: isCompleted,
        locked
      };
    });

    return NextResponse.json({
      success: true,
      student: {
        code: student.code,
        firstName: student.first_name,
        lastName: student.last_name,
        school: student.school,
        class: student.class
      },
      surveys: surveysWithCompletion
    });

  } catch (e: any) {
    return NextResponse.json({ error: "Błąd serwera: " + e.message }, { status: 500 });
  }
}
