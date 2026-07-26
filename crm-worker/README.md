# AuditProLab CRM Worker

Защищённый обработчик формы сайта для создания контакта и сделки в Bitrix24.

## Обязательный секрет

В Cloudflare Worker добавляется зашифрованный секрет:

- `BITRIX_WEBHOOK` — URL отдельного входящего вебхука Bitrix24 с правом CRM.

Секрет нельзя добавлять в Git, `wrangler.toml` или клиентский JavaScript.

## Переменные

- `ALLOWED_ORIGIN=https://auditprolab.ru`
- `DEAL_STAGE_ID=NEW`

