# Quentinhas da Rê — backend

## Setup
1. `npm install`
2. Crie um banco no Neon, copie a connection string pra `.env` (usar `.env.example` de base)
3. Rode o `schema.sql` no banco (console do Neon ou `psql "$DATABASE_URL" -f schema.sql`)
4. Crie os primeiros motoboys/locais direto no banco ou via `POST /api/motoboys` e `POST /api/locais` (senha entra em texto puro no body e já sai com hash salvo)
5. `npm run dev`

## Rotas de API já prontas
- `GET/POST /api/locais` — listar e criar locais
- `PUT/DELETE /api/locais/:id` — editar / desativar (soft delete, mantém histórico)
- `GET/POST /api/motoboys` — listar e criar motoboys
- `PUT/DELETE /api/motoboys/:id` — editar / desativar
- `GET/POST /api/rotas` — listar (filtros `?de=&ate=&motoboy_id=`) e criar rota
  - ao criar, `receita` e `custo` são calculados e "congelados" no momento (não mudam se o valor do local/motoboy for reajustado depois)
- `PUT /api/rotas/:id` — mudar status (`pendente` / `entregue` / `cancelada`)
- `GET /api/relatorios?de=&ate=` — totais por motoboy, por local e financeiro (receita, custo, saldo) no período — só conta rotas com status `entregue`

## Ainda falta (próximo passo)
- Login do motoboy (autenticação simples com `jose`/JWT já está nas dependências, falta implementar `/api/auth`)
- Telas (React) seguindo o mockup aprovado — dashboard da dona, CRUDs, relatórios, tela do motoboy
- Middleware de proteção de rota (admin vs motoboy)
