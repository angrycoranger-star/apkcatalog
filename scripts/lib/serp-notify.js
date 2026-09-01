/**
 * Notification sinks. Telegram is the one that reaches a phone; the workflow
 * summary is always written so a run is auditable even with no bot configured.
 */
import { appendFile } from 'node:fs/promises';

/** Telegram rejects messages over 4096 chars outright. */
const LIMIT = 3900;

export async function notifyTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const body = text.length > LIMIT ? `${text.slice(0, LIMIT)}\n…` : text;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: body, parse_mode: 'Markdown', disable_web_page_preview: true })
  });
  if (!response.ok) throw new Error(`Telegram refused the message: HTTP ${response.status} ${await response.text()}`);
  return true;
}

/** Mirrors the report into the GitHub Actions run summary when there is one. */
export async function notifyJobSummary(text) {
  if (!process.env.GITHUB_STEP_SUMMARY) return false;
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  return true;
}
