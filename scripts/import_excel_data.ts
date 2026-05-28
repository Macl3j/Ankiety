import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import { v5 as uuidv5 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define a stable UUID namespace for our deterministic IDs
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

function toUUID(strId: string): string {
  return uuidv5(strId, NAMESPACE);
}

async function runImport() {
  const filePath = path.resolve(process.cwd(), 'System Ankiet 2025.xlsx');
  console.log(`Loading Excel file from ${filePath}...`);
  const workbook = xlsx.readFile(filePath, { cellDates: true });

  console.log("--- CLEANING DATABASE ---");
  // Delete all existing responses, questions, surveys, and codes.
  // Because of cascading deletes (or to avoid FK issues), delete in order.
  await supabase.from('responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('surveys').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('codes').delete().neq('code', '');
  console.log("Database cleared.");

  // 1. IMPORT CODES
  console.log("--- IMPORTING CODES ---");
  const codesSheet = workbook.Sheets['Codes'];
  if (codesSheet) {
    const codesData = xlsx.utils.sheet_to_json<any>(codesSheet);
    const codesToInsert = codesData.map(row => ({
      code: String(row.Code),
      first_name: String(row.FirstName || ''),
      last_name: String(row.LastName || ''),
      school: String(row.School || ''),
      class: String(row.Class || ''),
      created_at: row.CreatedDate ? new Date(row.CreatedDate).toISOString() : new Date().toISOString()
    }));
    
    // Insert in batches of 500
    for (let i = 0; i < codesToInsert.length; i += 500) {
      const { error } = await supabase.from('codes').upsert(codesToInsert.slice(i, i + 500), { onConflict: 'code' });
      if (error) console.error("Error inserting codes:", error);
    }
    console.log(`Inserted ${codesToInsert.length} codes.`);
  }

  // 2. IMPORT SURVEYS
  console.log("--- IMPORTING SURVEYS ---");
  const surveysSheet = workbook.Sheets['Surveys'];
  const surveyMap = new Map<string, string>(); // OldID -> NewUUID
  
  if (surveysSheet) {
    const surveysData = xlsx.utils.sheet_to_json<any>(surveysSheet);
    const surveysToInsert = surveysData.map(row => {
      const newId = toUUID(row.SurveyID);
      surveyMap.set(row.SurveyID, newId);
      
      return {
        id: newId,
        task_id: Number(row.TaskID) || 1,
        title: String(row.Title || ''),
        group: String(row.TargetGroup || ''),
        version: String(row.Version) === 'E' ? 'E' : 'P',
        status: String(row.Status) === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
        created_at: row.CreatedAt ? new Date(row.CreatedAt).toISOString() : new Date().toISOString(),
        updated_at: row.UpdatedAt ? new Date(row.UpdatedAt).toISOString() : new Date().toISOString()
      };
    });

    for (let i = 0; i < surveysToInsert.length; i += 500) {
      const { error } = await supabase.from('surveys').upsert(surveysToInsert.slice(i, i + 500), { onConflict: 'id' });
      if (error) console.error("Error inserting surveys:", error);
    }
    console.log(`Inserted ${surveysToInsert.length} surveys.`);
  }

  // 3. IMPORT QUESTIONS
  console.log("--- IMPORTING QUESTIONS ---");
  const questionsSheet = workbook.Sheets['Questions'];
  const questionMap = new Map<string, string>(); // OldID -> NewUUID
  
  if (questionsSheet) {
    const questionsData = xlsx.utils.sheet_to_json<any>(questionsSheet);
    // Remove duplicates by ID
    const uniqueQuestions = [];
    const seenQ = new Set();
    
    for(const row of questionsData) {
      const newId = toUUID(row.QuestionID);
      questionMap.set(row.QuestionID, newId);
      
      if(seenQ.has(newId)) continue;
      seenQ.add(newId);
      
      const newSurveyId = surveyMap.get(row.SurveyID) || toUUID(row.SurveyID);
      
      // Parse options JSON
      let optionsJson = [];
      try {
        if (row.OptionsJSON) {
          optionsJson = JSON.parse(row.OptionsJSON);
        }
      } catch (e) {
        console.error(`Failed to parse options for question ${row.QuestionID}`);
      }

      const imageUrl = row['Unnamed: 7'] ? String(row['Unnamed: 7']) : null;
      
      uniqueQuestions.push({
        id: newId,
        survey_id: newSurveyId,
        type: String(row.Type || 'SINGLE'),
        text: String(row.Text || ''),
        options: optionsJson,
        order_index: Number(row.Order) || 1,
        weight: Number(row.Weight) || 1,
        image_url: imageUrl,
        created_at: new Date().toISOString()
      });
    }

    for (let i = 0; i < uniqueQuestions.length; i += 500) {
      const { error } = await supabase.from('questions').upsert(uniqueQuestions.slice(i, i + 500), { onConflict: 'id' });
      if (error) console.error("Error inserting questions:", error);
    }
    console.log(`Inserted ${uniqueQuestions.length} questions.`);
  }

  // 4. IMPORT RESPONSES
  console.log("--- IMPORTING RESPONSES ---");
  const responsesSheet = workbook.Sheets['Responses'];
  if (responsesSheet) {
    const responsesData = xlsx.utils.sheet_to_json<any>(responsesSheet);
    const responsesToInsert = responsesData.map(row => {
      const newSurveyId = surveyMap.get(row.SurveyID) || toUUID(row.SurveyID);
      const studentCode = String(row.RespondentID);
      
      // Parse answers JSON and map QuestionIDs
      let parsedAnswers: any = {};
      try {
        if (row.AnswersJSON) {
          const oldAnswers = JSON.parse(row.AnswersJSON);
          for (const [oldQId, answerVal] of Object.entries(oldAnswers)) {
            const newQId = questionMap.get(oldQId) || toUUID(oldQId);
            parsedAnswers[newQId] = answerVal;
          }
        }
      } catch (e) {
        console.error(`Failed to parse answers for response ${row.ResponseID}`);
      }

      let pdfUrl = row.CertificatePdfId ? String(row.CertificatePdfId) : null;
      if (pdfUrl && !pdfUrl.startsWith('http')) {
        // It's just a Drive ID
        pdfUrl = `https://drive.google.com/file/d/${pdfUrl}/view?usp=sharing`;
      }

      return {
        id: toUUID(row.ResponseID || Math.random().toString()),
        survey_id: newSurveyId,
        task_id: Number(row.TaskID) || 1,
        version: String(row.Version) === 'E' ? 'E' : 'P',
        student_code: studentCode,
        answers: parsedAnswers,
        score: Number(row.Score) || 0,
        max_score: 0, // Zaktualizujemy to na końcu skryptem fix_max_score
        consent: Boolean(row.ConsentRODO),
        cert_pdf_url: pdfUrl,
        created_at: row.Timestamp ? new Date(row.Timestamp).toISOString() : new Date().toISOString()
      };
    });

    for (let i = 0; i < responsesToInsert.length; i += 500) {
      const { error } = await supabase.from('responses').upsert(responsesToInsert.slice(i, i + 500), { onConflict: 'id' });
      if (error) {
        console.error("Error inserting responses batch (checking for missing student_codes).");
        // Sometimes codes are missing from the Codes table, causing FK violation.
        // We will insert them one by one to see which ones fail and ignore the ones with bad FKs.
        for (const res of responsesToInsert.slice(i, i + 500)) {
          const { error: err } = await supabase.from('responses').upsert(res, { onConflict: 'id' });
          if (err) {
            console.error(`Failed to insert response for student ${res.student_code} - skipping.`);
          }
        }
      }
    }
    console.log(`Inserted ${responsesToInsert.length} responses.`);
  }

  console.log("--- IMPORT FINISHED ---");
}

runImport().catch(console.error);
