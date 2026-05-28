const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: q } = await supabase.from('questions').select('id, text, survey_id');
  
  const bySurvey = {};
  for(const x of q) {
    if(!bySurvey[x.survey_id]) bySurvey[x.survey_id] = [];
    bySurvey[x.survey_id].push(x.text);
  }
  
  // print survey titles too
  const { data: s } = await supabase.from('surveys').select('id, title, version');
  for(const sv of s) {
    console.log(`\nSurvey: ${sv.title} (v: ${sv.version})`);
    const qs = bySurvey[sv.id] || [];
    console.log(`Questions count: ${qs.length}`);
    qs.slice(0, 5).forEach(t => console.log(' - ' + t));
  }
}
check();
