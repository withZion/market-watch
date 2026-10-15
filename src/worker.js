// Cloudflare layer. Swap this file to run elsewhere; scan.js does not change.
import { DurableObject } from "cloudflare:workers";
import { REGION } from "./config.js";
import { runScan } from "./scan.js";

export default {
  // GET / : JSON status. Last run, recent results, last errors.
  async fetch(request, env) {
    const [state, log] = await Promise.all([env.LOG.get("state", "json"), env.LOG.get("log", "json")]);
    const body = {
      lastRun: state?.lastRun || null,
      lastErrors: state?.lastErrors || [],
      recent: (log || []).slice(-20).reverse(),
    };
    return new Response(JSON.stringify(body, null, 2), { headers: { "content-type": "application/json" } });
  },

  // Cron. Cloudflare may fire this from any data centre, so the actual work
  // is handed to a Durable Object pinned to REGION. All outbound requests
  // then leave from there.
  async scheduled(event, env) {
    const id = env.RUNNER.idFromName(`runner-${REGION}`);
    const runner = env.RUNNER.get(id, { locationHint: REGION });
    const res = await runner.fetch(`https://runner/scan?now=${event.scheduledTime}`);
    console.log(await res.text());
  },
};

export class Runner extends DurableObject {
  async fetch(request) {
    const now = Number(new URL(request.url).searchParams.get("now")) || Date.now();

    // Cloudflare occasionally fires the same cron twice. The check and the
    // write happen before any await, so a second copy can never slip through.
    if ((this.ctx.storage.kv.get("lastRun") || 0) >= now) {
      return new Response(JSON.stringify({ skipped: "duplicate run", now }));
    }
    this.ctx.storage.kv.put("lastRun", now);

    // Where did we actually run? Useful when an exchange starts refusing you.
    const trace = await fetch("https://www.cloudflare.com/cdn-cgi/trace").then((r) => r.text()).catch(() => "");
    const colo = (trace.match(/^colo=(.+)$/m) || [])[1] || "?";

    const report = await runScan({
      store: this.env.LOG,
      secrets: { botToken: this.env.TELEGRAM_BOT_TOKEN, chatId: this.env.TELEGRAM_CHAT_ID },
      now,
    });
    return new Response(JSON.stringify({ colo, checked: report.checked, errors: report.errors, results: report.results.length }));
  }
}
