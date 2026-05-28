import xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function excelToDate(excelSerial: number): Date {
  const utc_days  = Math.floor(excelSerial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  
  const fractional_day = excelSerial - Math.floor(excelSerial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

async function fixDates() {
  console.log("Loading Excel file...");
  const workbook = xlsx.readFile('System Ankiet 2025.xlsx');
  
  const responsesSheet = workbook.Sheets['Responses'];
  if (!responsesSheet) {
    console.log("No Responses sheet found.");
    return;
  }
  
  const responsesData = xlsx.utils.sheet_to_json<any>(responsesSheet);
  
  console.log(`Found ${responsesData.length} responses. Updating dates...`);
  
  let count = 0;
  
  for (const row of responsesData) {
    if (row.Timestamp && typeof row.Timestamp === 'number') {
      const realDate = excelToDate(row.Timestamp);
      
      const { error } = await supabase
        .from('responses')
        .update({ created_at: realDate.toISOString() })
        // Mamy stare ID w Excelu ale ID z bazy jest toUUID(row.ResponseID)
        // W bazie zaktualizujemy po student_code i score aby łatwiej trafic, 
        // ale najlepiej po prostu zaimportowac uuid jeszcze raz
        .eq('student_code', String(row.RespondentID))
        .eq('score', Number(row.Score) || 0)
        .eq('task_id', Number(row.TaskID) || 1)
        .eq('version', String(row.Version) === 'E' ? 'E' : 'P');
        
      if (!error) count++;
    }
  }
  console.log(`Updated ${count} response dates.`);
}

fixDates();
