const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Find an evaluation survey ID
  const { data: surveys } = await supabase.from('surveys').select('id').eq('version', 'E').limit(1);
  if (!surveys || surveys.length === 0) return;
  
  const evalSurveyId = surveys[0].id;
  
  // Find a response
  const { data: responses } = await supabase.from('responses').select('answers, survey_id').eq('survey_id', evalSurveyId).limit(1);
  
  if (responses && responses.length > 0) {
     const answers = responses[0].answers;
     console.log('Answers keys for E survey:', Object.keys(answers));
     
     // Check which ones exist in questions table
     const { data: existingQ } = await supabase.from('questions').select('id, survey_id').in('id', Object.keys(answers));
     console.log('Existing questions in DB:', existingQ.map(q => q.id));
     console.log('Which belong to survey_id:', [...new Set(existingQ.map(q => q.survey_id))]);
  }
}
check();
