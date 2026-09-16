-- Quentinhas da Rê — schema inicial (Postgres / Neon)

create table if not exists locais (
  id            serial primary key,
  nome          text not null,
  cliente_nome  text,                             -- nome de quem recebe no local
  endereco      text,
  endereco_link text,                             -- link direto do Google Maps / Waze
  contato       text,
  valor_unidade numeric(10,2) not null default 0, -- valor cobrado por quentinha nesse local (receita)
  ativo         boolean not null default true,
  excluido      boolean not null default false,
  criado_em     timestamptz not null default now()
);

create table if not exists motoboys (
  id            serial primary key,
  nome          text not null,
  login         text not null unique,   -- criado na IDE / seed, sem cadastro público
  senha_hash    text not null,
  valor_rota    numeric(10,2) not null default 0, -- quanto ele recebe por rota feita (custo)
  whatsapp      text,                             -- contato de whatsapp para envio direto de rotas
  ativo         boolean not null default true,
  excluido      boolean not null default false,
  criado_em     timestamptz not null default now()
);

create table if not exists rotas (
  id            serial primary key,
  local_id      integer not null references locais(id),
  motoboy_id    integer not null references motoboys(id),
  quantidade    integer not null check (quantidade > 0),
  data          date not null default current_date,
  status        text not null default 'pendente' check (status in ('pendente', 'entregue', 'cancelada')),
  receita       numeric(10,2) not null default 0, -- quantidade * valor_unidade do local (snapshot no momento da criação)
  custo         numeric(10,2) not null default 0, -- valor_rota do motoboy (snapshot no momento da criação)
  criado_em             timestamptz not null default now(),
  entregue_em           timestamptz,
  carga_conferida       boolean not null default false,
  carga_conferida_em    timestamptz,
  ajuste_quantidade     integer,
  ajuste_status         text check (ajuste_status in ('pendente', 'aprovado', 'recusado')),
  ajuste_solicitado_em  timestamptz,
  ajuste_respondido_em  timestamptz
);

create index if not exists idx_rotas_data on rotas(data);
create index if not exists idx_rotas_motoboy on rotas(motoboy_id, data);
create index if not exists idx_rotas_local on rotas(local_id, data);

-- Controle de Licença / Assinatura SaaS (PagBank)
create table if not exists assinaturas (
  id                  serial primary key,
  cliente_nome        text not null default 'Dona Rê',
  valor_mensal        numeric(10,2) not null default 65.00,
  status              text not null default 'ativo', -- 'ativo', 'pendente', 'bloqueado'
  pagbank_id          text,                          -- ID da assinatura ou transação no PagBank
  link_pagamento      text,                          -- Link do PagBank para ela assinar / atualizar cartão
  pago_em             timestamptz default now(),     -- Último pagamento aprovado
  vence_em            timestamptz not null default (now() + interval '30 days'),
  dias_tolerancia     integer not null default 3,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);
