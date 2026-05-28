const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: responses } = await supabase.from('responses').select('id, answers, survey_id').eq('version', 'E');
  
  for(const r of responses) {
      const { data: questions } = await supabase.from('questions').select('text, id').eq('survey_id', r.survey_id).order('order_index');
      if(!questions) continue;
      
      let answersList = questions.map((q, i) => {
          let ans = r.answers[q.id] || '';
          if(Array.isArray(ans)) ans = ans.join(', ');
          return { question: q.text, answer: ans.toString() };
      });
      
      for(const item of answersList) {
          if (item.question && item.question.length > 44 && item.question.charCodeAt(44) === 261) {
              console.log('Found question with ą at 44:', item.question);
          }
          if (item.answer && item.answer.length > 44 && item.answer.charCodeAt(44) === 261) {
              console.log('Found answer with ą at 44:', item.answer);
          }
      }
  }
  
  // also check survey titles
  const { data: surveys } = await supabase.from('surveys').select('title');
  for(const s of surveys) {
      if(s.title && s.title.length > 44 && s.title.charCodeAt(44) === 261) {
          console.log('Found survey title with ą at 44:', s.title);
      }
  }
}
check();
