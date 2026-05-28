import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixMaxScore() {
  console.log("Fetching questions...");
  const { data: questions } = await supabase.from('questions').select('survey_id, options');
  
  if (!questions) return;

  const maxScores: Record<string, number> = {};
  
  for (const q of questions) {
    if (q.options && Array.isArray(q.options)) {
      const hasCorrect = q.options.some((o: any) => o.correct === true);
      if (hasCorrect) {
        maxScores[q.survey_id] = (maxScores[q.survey_id] || 0) + 1;
      }
    }
  }

  console.log('Max scores by survey:', maxScores);

  console.log("Updating responses...");
  let count = 0;
  for (const [surveyId, maxScore] of Object.entries(maxScores)) {
    const { error } = await supabase
      .from('responses')
      .update({ max_score: maxScore })
      .eq('survey_id', surveyId);
      
    if (error) {
      console.error(`Error updating survey ${surveyId}:`, error);
    } else {
      console.log(`Updated max_score = ${maxScore} for survey ${surveyId}`);
      count++;
    }
  }

  console.log("Done updating max scores.");
}

fixMaxScore();
