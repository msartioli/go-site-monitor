# Preço Radar — MVP

Monitor de preços em Go para acompanhar produtos por URL, registrar histórico no Supabase e executar verificações automaticamente na Vercel.

## MVP

- `POST /api/check-price`: testa a extração de preço de uma URL (metadados/JSON-LD ou `price_regex`).
- `GET|POST /api/check-prices`: verifica todos os produtos ativos, grava histórico e identifica preços abaixo do alvo.
- Supabase/Postgres: tabelas `products` e `price_history`.
- Vercel Cron: execução diária.

## Variáveis de ambiente

Copie `.env.example` e configure no projeto Vercel:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` — somente no backend; nunca expor no navegador.
- `CRON_SECRET`

## Próximas etapas

1. Criar um projeto Supabase dedicado.
2. Aplicar a migration `supabase/migrations/001_price_monitor.sql`.
3. Criar o projeto na Vercel e adicionar as variáveis de ambiente.
4. Fazer deploy e validar `/api/health` e `/api/check-price`.
5. Adicionar dashboard e alertas por e-mail/Telegram.
