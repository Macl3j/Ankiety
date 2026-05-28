const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: qCount } = await supabase.from('questions').select('id', { count: 'exact' });
  console.log('Total questions in DB:', qCount.length);
  
  const { data: questions } = await supabase.from('questions').select('id, survey_id, title, text');
  console.log('Sample questions:', questions.slice(0, 5));
  
  // Group by survey_id
  const bySurvey = {};
  for(const q of questions) {
    if(!bySurvey[q.survey_id]) bySurvey[q.survey_id] = 0;
    bySurvey[q.survey_id]++;
  }
  console.log('Questions per survey:', bySurvey);
}
check();
