const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: surveys } = await supabase.from('surveys').select('id, version, title, group');
  
  for (const s of surveys) {
    const { data: questions } = await supabase.from('questions').select('id').eq('survey_id', s.id);
    console.log(`Survey: ${s.title} (Version: ${s.version}, Group: ${s.group}) -> ${questions?.length || 0} questions`);
  }
}
check();
