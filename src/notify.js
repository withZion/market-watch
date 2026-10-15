// Delivery. Telegram by default; console when no token is configured.
// Add Discord, email or a webhook here and the scanner does not change.

export async function notify(secrets, text) {
  if (!secrets.botToken || !secrets.chatId) {
    console.log("[notify]", text);
    return true;
  }
  const res = await fetch(`https://api.telegram.org/bot${secrets.botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: secrets.chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
  return true;
}

export function format(r) {
  const arrow = r.side === "up" ? "▲" : "▼";
  return `${arrow} ${r.symbol} ${r.price}\n${r.note}`;
}
