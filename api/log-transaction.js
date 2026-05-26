const SUPABASE_URL = 'https://gdjodfcjbsrupdiodyyi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkam9kZmNqYnNydXBkaW9keXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjY1NTgsImV4cCI6MjA4ODc0MjU1OH0.og6ifqANZUDybZkmo03T0Iop7SmsvzxFk7CIdRDhWEA';

export default async function handler(req, res) {
  // Allow requests from anywhere (needed for Apple Shortcuts)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-api-key, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Get the user's API key from the header
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }

  // 2. Get the transaction details from the body
  const { amount, description, category, date } = req.body || {};
  if (!amount || !description || !category) {
    return res.status(400).json({ error: 'Missing required fields: amount, description, category' });
  }

  // 3. Call our Supabase RPC function to validate the API key and save the transaction
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
        p_amount: parseFloat(amount),
        p_note: description,
        p_type: 'expense',
        p_category: category,
        p_date: date || new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('Network error calling Supabase:', err);
    return res.status(500).json({ error: 'Failed to reach database' });
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Supabase error:', errorText);
    // If it's an invalid API key, send a clear message
    if (errorText.includes('Invalid API Key')) {
      return res.status(401).json({ error: 'Invalid API Key. Check your BudgetManager app.' });
    }
    return res.status(400).json({ error: 'Request failed', detail: errorText });
  }

  const data = await response.json();
  return res.status(200).json({ success: true, message: 'Transaction logged!', data });
}
