-- Migration: Carteira de Locais por Motoboy
-- Criado em: 2026-09-20

-- Vincula locais fixos a cada motoboy com ordem personalizada e quantidade padrão
create table if not exists motoboy_locais (
  id           serial primary key,
  motoboy_id   integer not null references motoboys(id) on delete cascade,
  local_id     integer not null references locais(id) on delete cascade,
  ordem        integer not null default 9999,
  qtd_padrao   integer not null default 30,
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now(),
  unique(motoboy_id, local_id)
);

create index if not exists idx_motoboy_locais_motoboy on motoboy_locais(motoboy_id, ordem);
create index if not exists idx_motoboy_locais_local on motoboy_locais(local_id);
