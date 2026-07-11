import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

// Supabase/PostgREST domyślnie ucina każde zapytanie bez .range() do 1000 wierszy.
// Przy tysiącach odpowiedzi (po imporcie archiwum MS Forms) trzeba pobrać wszystko
// partiami, inaczej cała agregacja (analityka) liczy się tylko z ułamka danych.
async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

export async function GET() {
  try {
    const responses = await fetchAllRows<any>((from, to) =>
      supabaseAdmin
        .from('responses')
        .select('score, max_score, created_at, student_code, version')
        .range(from, to)
    );

    const codes = await fetchAllRows<any>((from, to) =>
      supabaseAdmin
        .from('codes')
        .select('code, school, class')
        .range(from, to)
    );

    // Create a code map for fast lookup
    const codeMap = new Map();
    codes.forEach((c: any) => codeMap.set(c.code, c));

    // Data structures for aggregation
    let totalScore = 0;
    let totalMaxScore = 0;
    let totalResponses = 0;

    const schoolStats: Record<string, { 
      totalScore: number, totalMax: number, count: number, 
      totalScoreP: number, totalMaxP: number, 
      totalScoreE: number, totalMaxE: number,
      classes: Record<string, { totalScore: number, totalMax: number, count: number }> 
    }> = {};
    const scoreDistribution = [
      { name: '0-25%', count: 0 },
      { name: '26-50%', count: 0 },
      { name: '51-75%', count: 0 },
      { name: '76-100%', count: 0 }
    ];
    const timelineStats: Record<string, { count: number, totalScore: number, totalMax: number }> = {};

    responses.forEach((r: any) => {
      const student = codeMap.get(r.student_code);
      const schoolName = student?.school || 'Nieznana szkoła';
      const className = student?.class || 'Nieznana klasa';
      
      // Calculate valid percentages
      if (r.max_score > 0) {
        totalScore += r.score;
        totalMaxScore += r.max_score;
        totalResponses++;

        const percent = Math.round((r.score / r.max_score) * 100);

        // Score Distribution
        if (percent <= 25) scoreDistribution[0].count++;
        else if (percent <= 50) scoreDistribution[1].count++;
        else if (percent <= 75) scoreDistribution[2].count++;
        else scoreDistribution[3].count++;

        // School Aggregation
        if (!schoolStats[schoolName]) {
          schoolStats[schoolName] = { 
            totalScore: 0, totalMax: 0, count: 0, 
            totalScoreP: 0, totalMaxP: 0,
            totalScoreE: 0, totalMaxE: 0,
            classes: {} 
          };
        }
        schoolStats[schoolName].totalScore += r.score;
        schoolStats[schoolName].totalMax += r.max_score;
        schoolStats[schoolName].count++;

        if (r.version === 'P') {
          schoolStats[schoolName].totalScoreP += r.score;
          schoolStats[schoolName].totalMaxP += r.max_score;
        } else if (r.version === 'E') {
          schoolStats[schoolName].totalScoreE += r.score;
          schoolStats[schoolName].totalMaxE += r.max_score;
        }

        // Class Aggregation
        if (!schoolStats[schoolName].classes[className]) {
          schoolStats[schoolName].classes[className] = { totalScore: 0, totalMax: 0, count: 0 };
        }
        schoolStats[schoolName].classes[className].totalScore += r.score;
        schoolStats[schoolName].classes[className].totalMax += r.max_score;
        schoolStats[schoolName].classes[className].count++;

        // Timeline Aggregation
        const dateStr = new Date(r.created_at).toISOString().split('T')[0];
        if (!timelineStats[dateStr]) {
          timelineStats[dateStr] = { count: 0, totalScore: 0, totalMax: 0 };
        }
        timelineStats[dateStr].count++;
        timelineStats[dateStr].totalScore += r.score;
        timelineStats[dateStr].totalMax += r.max_score;
      }
    });

    // Format final response
    const overallAvg = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    const schoolsData = Object.entries(schoolStats).map(([name, data]) => ({
      name,
      avg: data.totalMax > 0 ? Math.round((data.totalScore / data.totalMax) * 100) : 0,
      count: data.count
    })).sort((a, b) => b.avg - a.avg);

    const progressData = Object.entries(schoolStats).map(([name, data]) => ({
      name,
      poczatkowa: data.totalMaxP > 0 ? Math.round((data.totalScoreP / data.totalMaxP) * 100) : 0,
      ewaluacyjna: data.totalMaxE > 0 ? Math.round((data.totalScoreE / data.totalMaxE) * 100) : 0,
    })).sort((a, b) => b.ewaluacyjna - a.ewaluacyjna);

    // Flatten classes for leaderboard
    const allClasses: any[] = [];
    Object.entries(schoolStats).forEach(([school, sData]) => {
      Object.entries(sData.classes).forEach(([className, cData]) => {
        allClasses.push({
          school,
          name: className,
          avg: cData.totalMax > 0 ? Math.round((cData.totalScore / cData.totalMax) * 100) : 0,
          count: cData.count
        });
      });
    });
    
    // Sort classes by best performance and limit to Top 10
    const topClasses = allClasses.sort((a, b) => b.avg - a.avg).slice(0, 10);

    const timelineData = Object.entries(timelineStats).map(([date, data]) => ({
      date,
      count: data.count,
      avg: data.totalMax > 0 ? Math.round((data.totalScore / data.totalMax) * 100) : 0
    })).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      overview: {
        totalResponses,
        overallAvg,
        totalSchools: Object.keys(schoolStats).length
      },
      schoolsData,
      topClasses,
      scoreDistribution,
      timelineData,
      progressData
    });

  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
