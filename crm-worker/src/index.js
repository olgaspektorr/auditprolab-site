const json = (body, status, origin) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin",
    "x-content-type-options": "nosniff"
  }
});

const clean = (value, maxLength = 1000) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const escapeHtml = (value) =>
  clean(value, 4000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

async function telegram(env, method, payload) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("missing_bot_token");
  const response = await fetch(
    "https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/" + method,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    console.error("Telegram API error", response.status, result.description || "unknown");
    throw new Error("telegram_api_error");
  }
  return result.result;
}

function leadText(data) {
  const lines = [
    "<b>Новая заявка с auditprolab.ru</b>",
    "",
    "<b>Имя:</b> " + escapeHtml(data.name),
    "<b>Компания:</b> " + escapeHtml(data.company),
    "<b>Должность:</b> " + escapeHtml(data.position),
    "<b>Контакт:</b> " + escapeHtml(data.contact || data.phone || data.telegram),
    "<b>Сфера:</b> " + escapeHtml(data.industry || "—"),
    "<b>Сайт:</b> " + escapeHtml(data.site || "—"),
    "<b>Размер отдела:</b> " + escapeHtml(data.teamSize || "—"),
    "<b>Формат:</b> " + escapeHtml(data.selectedFormat || "Обсуждение ситуации"),
    "",
    "<b>Ситуация:</b>",
    escapeHtml(data.situation || "—"),
    "",
    "<b>Страница:</b> " + escapeHtml(data.page || "—"),
    "<b>UTM:</b> " + escapeHtml(data.utm || "—")
  ];
  return lines.join("\n");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://auditprolab.ru";
    const origin = requestOrigin === allowedOrigin || requestOrigin === "https://www.auditprolab.ru"
      ? requestOrigin
      : allowedOrigin;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "vary": "Origin"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/status") {
      try {
        const me = await telegram(env, "getMe", {});
        const hook = await telegram(env, "getWebhookInfo", {});
        return json({
          ok: true,
          service: "auditprolab-telegram-leads",
          bot: me.username,
          webhook: hook.url || "",
          chatConfigured: Boolean(env.TELEGRAM_CHAT_ID)
        }, 200, origin);
      } catch {
        return json({ ok: false, error: "telegram_not_configured" }, 503, origin);
      }
    }

    if (request.method === "GET" && url.pathname === "/setup") {
      try {
        const webhookUrl = url.origin + "/";
        await telegram(env, "setWebhook", {
          url: webhookUrl,
          allowed_updates: ["message"]
        });
        return json({ ok: true, webhook: webhookUrl }, 200, origin);
      } catch {
        return json({ ok: false, error: "webhook_setup_failed" }, 502, origin);
      }
    }

    if (request.method === "GET") {
      return json({ ok: true, service: "auditprolab-telegram-leads" }, 200, origin);
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method_not_allowed" }, 405, origin);
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400, origin);
    }

    if (data && data.update_id && data.message && data.message.chat) {
      const chatId = String(data.message.chat.id);
      try {
        await telegram(env, "sendMessage", {
          chat_id: chatId,
          text: "Ваш Telegram CHAT_ID: <code>" + escapeHtml(chatId) + "</code>",
          parse_mode: "HTML"
        });
      } catch {}
      return json({ ok: true }, 200, origin);
    }

    if (clean(data.website, 200)) {
      return json({ ok: true }, 200, origin);
    }

    const required = [
      clean(data.name, 160),
      clean(data.company, 200),
      clean(data.position, 200),
      clean(data.contact || data.phone || data.telegram, 200)
    ];
    if (!data.consent || required.some((value) => !value)) {
      return json({ ok: false, error: "required_fields_missing" }, 422, origin);
    }

    if (!env.TELEGRAM_CHAT_ID) {
      return json({ ok: false, error: "telegram_chat_not_configured" }, 503, origin);
    }

    try {
      await telegram(env, "sendMessage", {
        chat_id: env.TELEGRAM_CHAT_ID,
        text: leadText(data),
        parse_mode: "HTML",
        disable_web_page_preview: true
      });
      return json({ ok: true }, 200, origin);
    } catch {
      return json({ ok: false, error: "telegram_unavailable" }, 502, origin);
    }
  }
};