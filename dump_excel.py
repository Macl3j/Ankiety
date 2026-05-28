import pandas as pd
import json

xls = pd.ExcelFile('System Ankiet 2025.xlsx')
data = {}
for sheet in xls.sheet_names:
    df = pd.read_excel(xls, sheet_name=sheet)
    # Convert dates to strings
    for col in df.select_dtypes(include=['datetime64', 'datetimetz']):
        df[col] = df[col].astype(str)
    # Take first 3 rows as sample
    data[sheet] = df.head(3).to_dict(orient='records')

with open('excel_sample.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
