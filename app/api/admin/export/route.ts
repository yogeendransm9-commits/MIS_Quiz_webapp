import { NextRequest, NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCSV(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return (headers || []).join(',') + '\n';
  const cols = headers || Object.keys(rows[0]);
  const head = cols.join(',');
  const body = rows.map((r) => cols.map((c) => csvCell(r[c])).join(',')).join('\n');
  return head + '\n' + body + '\n';
}

// Excel-compatible single-sheet XML (SpreadsheetML 2003) — opens in Excel/Sheets without deps.
function toExcelXML(rows: Record<string, unknown>[], title: string, headers?: string[]): string {
  const cols = headers || (rows.length ? Object.keys(rows[0]) : []);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const headerRow = `<Row>${cols.map((c) => `<Cell ss:StyleID="head"><Data ss:Type="String">${esc(c)}</Data></Cell>`).join('')}</Row>`;
  const dataRows = rows.map((r) =>
    `<Row>${cols.map((c) => {
      const v = r[c];
      if (typeof v === 'number') return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
      return `<Cell><Data ss:Type="String">${esc(String(v ?? ''))}</Data></Cell>`;
    }).join('')}</Row>`,
  ).join('');
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="head"><Font ss:Bold="1"/></Style></Styles>
<Worksheet ss:Name="${esc(title)}"><Table>${headerRow}${dataRows}</Table></Worksheet>
</Workbook>`;
}

export async function GET(req: NextRequest) {
  if (!isAuthed()) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const type = sp.get('type') as 'participants' | 'answers' | 'individual' | 'team';
  const fmt = (sp.get('format') as 'csv' | 'excel') || 'csv';

  const supabase = createServerClient();
  let rows: Record<string, unknown>[] = [];
  let title = 'export';

  if (type === 'participants') {
    const { data } = await supabase.from('participants').select('name, team, roll_number, created_at').order('team', { ascending: true }).order('roll_number', { ascending: true });
    rows = (data || []).map((r) => ({ Name: r.name, Team: r.team, 'Roll Number': r.roll_number, 'Registered At': r.created_at }));
    title = 'Participants';
  } else if (type === 'answers') {
    const { data } = await supabase
      .from('answers')
      .select('participant_id, question_id, selected, is_correct, created_at, participants(name, team, roll_number), questions(position, question)')
      .order('created_at', { ascending: true });
    rows = (data || []).map((r: any) => ({
      Name: r.participants?.name,
      Team: r.participants?.team,
      'Roll Number': r.participants?.roll_number,
      'Question #': r.questions?.position,
      Question: r.questions?.question,
      Selected: r.selected,
      Correct: r.is_correct ? 'Yes' : 'No',
      'Answered At': r.created_at,
    }));
    title = 'Answers';
  } else if (type === 'individual') {
    const { data } = await supabase
      .from('individual_scores')
      .select('score, participants(name, team, roll_number)')
      .order('score', { ascending: false });
    rows = (data || []).map((r: any, i: number) => ({
      Rank: i + 1,
      Name: r.participants?.name,
      Team: r.participants?.team,
      'Roll Number': r.participants?.roll_number,
      Score: r.score,
    }));
    title = 'Individual Leaderboard';
  } else if (type === 'team') {
    const { data } = await supabase.from('team_scores').select('team, score').order('score', { ascending: false });
    rows = (data || []).map((r: any, i: number) => ({ Rank: i + 1, Team: `Team ${r.team}`, Score: r.score }));
    title = 'Team Leaderboard';
  } else {
    return NextResponse.json({ ok: false, error: 'Invalid type' }, { status: 400 });
  }

  if (fmt === 'excel') {
    const xml = toExcelXML(rows, title);
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="${title}.xls"`,
      },
    });
  }

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${title}.csv"`,
    },
  });
}
