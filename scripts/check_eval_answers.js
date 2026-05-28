const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: surveys } = await supabase.from('surveys').select('id, version');
  const evalSurveyIds = surveys.filter(s => s.version === 'E').map(s => s.id);
  
  const { data: responses } = await supabase.from('responses').select('id, survey_id, answers_json').in('survey_id', evalSurveyIds).limit(1);
  if (responses && responses.length > 0) {
     console.log('Sample Eval Response Answers:');
     console.log(JSON.stringify(responses[0].answers_json, null, 2));
     
     if (responses[0].answers_json) {
       const questionIds = Object.keys(responses[0].answers_json);
       console.log('Question IDs:', questionIds);
       if (questionIds.length > 0) {
           const { data: questions } = await supabase.from('questions').select('id, survey_id, title').in('id', questionIds);
           console.log('Questions found for these IDs:', questions?.length);
           if (questions && questions.length > 0) {
               const { data: survey } = await supabase.from('surveys').select('title, version').eq('id', questions[0].survey_id).single();
               console.log('These questions belong to survey:', survey.title, 'version:', survey.version);
           }
       }
     } else {
       console.log('answers_json is null or undefined');
     }
  } else {
    console.log('No evaluation responses found');
  }
}
check();
