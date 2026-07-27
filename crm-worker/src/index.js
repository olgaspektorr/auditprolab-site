const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      vary: "Origin",
      "x-content-type-options": "nosniff",
    },
  });

const clean = (value, maxLength) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const callBitrix = async (webhook, method, params) => {
  const response = await fetch(`${webhook.replace(/\/+$/, "")}/${method}.json`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error_description || payload.error || `Bitrix HTTP ${response.status}`);
  }
  return payload.result;
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = new Set([env.ALLOWED_ORIGIN, "https://www.auditprolab.ru"]);

    if (!allowedOrigins.has(origin)) {
      return json({ ok: false, error: "origin_not_allowed" }, 403, env.ALLOWED_ORIGIN);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
          vary: "Origin",
        },
      });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method_not_allowed" }, 405, origin);
    }
    if (!env.BITRIX_WEBHOOK) {
      return json({ ok: false, error: "server_not_configured" }, 503, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400, origin);
    }

    if (clean(body.website, 100)) {
      return json({ ok: true }, 200, origin);
    }

    const lead = {
      name: clean(body.name, 120),
      company: clean(body.company, 160),
      position: clean(body.position, 120),
      contact: clean(body.contact, 120),
      phone: clean(body.phone, 40),
      telegram: clean(body.telegram, 100),
      industry: clean(body.industry, 200),
      site: clean(body.site, 300),
      teamSize: clean(body.teamSize, 80),
      situation: clean(body.situation, 1500),
      selectedFormat: clean(body.selectedFormat, 200),
      page: clean(body.page, 300),
      utm: clean(body.utm, 500),
    };

    const contactValue = lead.contact || lead.phone || lead.telegram;
    if (!lead.name || !lead.company || !lead.position || !contactValue || body.consent !== true) {
      return json({ ok: false, error: "required_fields_missing" }, 422, origin);
    }

    const phone = lead.phone || (/^[+\d()\s-]{7,}$/.test(contactValue) ? contactValue : "");
    const telegram = lead.telegram || (!phone ? contactValue : "");

    try {
      let duplicateIds = {};
      if (phone) {
        duplicateIds = await callBitrix(env.BITRIX_WEBHOOK, "crm.duplicate.findbycomm", {
          entity_type: "CONTACT",
          type: "PHONE",
          values: [phone],
        });
      }

      let contactId = duplicateIds?.CONTACT?.[0];
      if (!contactId) {
        const contactFields = {
          NAME: lead.name,
          POST: lead.position,
          COMMENTS: [
            `Компания: ${lead.company}`,
            lead.industry ? `Сфера бизнеса: ${lead.industry}` : "",
            telegram ? `Telegram: ${telegram}` : "",
            lead.site ? `Сайт компании: ${lead.site}` : "",
            lead.teamSize ? `Размер команды: ${lead.teamSize}` : "",
            lead.selectedFormat ? `Выбранный формат: ${lead.selectedFormat}` : "",
            "Источник: форма auditprolab.ru",
          ].filter(Boolean).join("\n"),
          SOURCE_ID: "WEB",
          SOURCE_DESCRIPTION: "Обсуждение ситуации с сайта auditprolab.ru",
        };
        if (phone) contactFields.PHONE = [{ VALUE: phone, VALUE_TYPE: "WORK" }];
        contactId = await callBitrix(env.BITRIX_WEBHOOK, "crm.contact.add", {
          fields: contactFields,
        });
      }

      const dealId = await callBitrix(env.BITRIX_WEBHOOK, "crm.deal.add", {
        fields: {
          TITLE: `Обсуждение ситуации — ${lead.name}, ${lead.company}`,
          STAGE_ID: env.DEAL_STAGE_ID || "NEW",
          CONTACT_ID: contactId,
          SOURCE_ID: "WEB",
          SOURCE_DESCRIPTION: "Форма «Обсудить ситуацию» на auditprolab.ru",
          COMMENTS: [
            `Имя: ${lead.name}`,
            `Компания: ${lead.company}`,
            `Должность: ${lead.position}`,
            lead.industry ? `Сфера бизнеса: ${lead.industry}` : "",
            phone ? `Телефон: ${phone}` : "",
            telegram ? `Telegram: ${telegram}` : "",
            lead.site ? `Сайт компании: ${lead.site}` : "",
            lead.teamSize ? `Размер команды: ${lead.teamSize}` : "",
            lead.selectedFormat ? `Выбранный формат: ${lead.selectedFormat}` : "",
            lead.situation ? `Ситуация: ${lead.situation}` : "",
            `Страница: ${lead.page || "https://auditprolab.ru/"}`,
            lead.utm ? `UTM: ${lead.utm}` : "",
          ].filter(Boolean).join("\n"),
        },
        params: { REGISTER_SONET_EVENT: "Y" },
      });

      return json({ ok: true, dealId }, 201, origin);
    } catch (error) {
      console.error("Bitrix submission failed", error);
      return json({ ok: false, error: "crm_unavailable" }, 502, origin);
    }
  },
};
