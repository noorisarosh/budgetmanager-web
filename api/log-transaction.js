const SUPABASE_URL = 'https://gdjodfcjbsrupdiodyyi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkam9kZmNqYnNydXBkaW9keXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjY1NTgsImV4cCI6MjA4ODc0MjU1OH0.og6ifqANZUDybZkmo03T0Iop7SmsvzxFk7CIdRDhWEA';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }

  // Parse body — handle both pre-parsed JSON and raw string (from Shortcuts)
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body) body = {};

  const { amount, description, category, date } = body;

  console.log('Received:', { apiKey: apiKey.slice(0, 8) + '...', amount, description, category, date });

  if (!amount || !description || !category) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      received: { amount, description, category, date }
    });
  }

  // Normalize the date — accept any format and convert to ISO 8601
  let isoDate;
  try {
    isoDate = new Date(date).toISOString();
    // If date was missing or invalid, default to now
    if (isNaN(new Date(date).getTime())) {
      isoDate = new Date().toISOString();
    }
  } catch {
    isoDate = new Date().toISOString();
  }

  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/log_pending_transaction`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_api_key: apiKey,
        p_amount: parseFloat(String(amount)),
        p_note: String(description),
        p_type: 'expense',
        p_category: String(category),
        p_date: isoDate,
      }),
    });
  } catch (err) {
    console.error('Network error:', err);
    return res.status(500).json({ error: 'Failed to reach database' });
  }

  const responseText = await response.text();
  console.log('Supabase response:', response.status, responseText);

  if (!response.ok) {
    if (responseText.includes('Invalid API Key')) {
      return res.status(401).json({ error: 'Invalid API Key. Check BudgetManager app.' });
    }
    return res.status(400).json({ error: 'Request failed', detail: responseText });
  }

  let data;
  try { data = JSON.parse(responseText); } catch { data = responseText; }

  return res.status(200).json({ success: true, message: 'Transaction logged!', data });
}
