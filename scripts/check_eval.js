const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: surveys } = await supabase.from('surveys').select('id, version, title');
  const { data: responses } = await supabase.from('responses').select('survey_id, score, max_score, version');
  
  const surveyInfo = surveys.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
  
  const evalResponses = responses.filter(r => r.version === 'E');
  console.log(`Total evaluation responses: ${evalResponses.length}`);
  if (evalResponses.length > 0) {
    console.log(`Sample evaluation response max_score: ${evalResponses[0].max_score}, score: ${evalResponses[0].score}`);
    console.log(`Survey Title: ${surveyInfo[evalResponses[0].survey_id]?.title}`);
  }
}
check();
