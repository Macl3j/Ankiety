import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log("Starting to fix evaluation survey questions...");
  
  // 1. Fetch all surveys
  const { data: surveys } = await supabase.from('surveys').select('*');
  if (!surveys) return;

  const pSurveys = surveys.filter(s => s.version === 'P');
  const eSurveys = surveys.filter(s => s.version === 'E');

  for (const eSurvey of eSurveys) {
    // Check if E survey already has questions
    const { data: eQuestions } = await supabase.from('questions').select('id').eq('survey_id', eSurvey.id);
    if (eQuestions && eQuestions.length > 0) {
      console.log(`Survey ${eSurvey.title} already has ${eQuestions.length} questions. Skipping.`);
      continue;
    }

    // Find corresponding P survey by group
    const pSurvey = pSurveys.find(s => s.group === eSurvey.group);
    if (!pSurvey) {
      console.log(`No corresponding P survey found for ${eSurvey.title}`);
      continue;
    }

    // Fetch questions of P survey
    const { data: pQuestions } = await supabase.from('questions').select('*').eq('survey_id', pSurvey.id);
    if (!pQuestions || pQuestions.length === 0) continue;

    console.log(`Cloning ${pQuestions.length} questions from ${pSurvey.title} to ${eSurvey.title}...`);

    const idMapping: Record<string, string> = {};
    const newQuestions = pQuestions.map(q => {
      const newId = uuidv4();
      idMapping[q.id] = newId;
      return {
        ...q,
        id: newId,
        survey_id: eSurvey.id,
        created_at: new Date().toISOString()
      };
    });

    // Insert cloned questions
    const { error: insertError } = await supabase.from('questions').insert(newQuestions);
    if (insertError) {
      console.error(`Error inserting questions for ${eSurvey.title}:`, insertError);
      continue;
    }

    // Now update the responses for this E survey
    const { data: eResponses } = await supabase.from('responses').select('id, answers').eq('survey_id', eSurvey.id);
    if (eResponses && eResponses.length > 0) {
      console.log(`Updating ${eResponses.length} responses for ${eSurvey.title}...`);
      for (const resp of eResponses) {
        if (!resp.answers) continue;
        
        const newAnswers: Record<string, any> = {};
        for (const [oldQId, answerVal] of Object.entries(resp.answers as Record<string, any>)) {
           const newQId = idMapping[oldQId];
           if (newQId) {
             newAnswers[newQId] = answerVal;
           } else {
             newAnswers[oldQId] = answerVal; // fallback
           }
        }

        await supabase.from('responses').update({ answers: newAnswers }).eq('id', resp.id);
      }
    }
    console.log(`Done processing ${eSurvey.title}`);
  }

  console.log("All evaluation surveys fixed.");
}

run().catch(console.error);
