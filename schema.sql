-- Quentinhas da Rê — schema inicial (Postgres / Neon)

create table if not exists locais (
  id            serial primary key,
  nome          text not null,
  endereco      text,
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
  criado_em     timestamptz not null default now(),
  entregue_em   timestamptz
);

create index if not exists idx_rotas_data on rotas(data);
create index if not exists idx_rotas_motoboy on rotas(motoboy_id, data);
create index if not exists idx_rotas_local on rotas(local_id, data);

-- Seed de exemplo (apagar/ajustar depois)
-- insert into locais (nome, endereco, valor_unidade) values
--   ('Zona Norte — Mercadão', 'Entrada principal, banca 12', 8.00),
--   ('Centro — Praça Rio Branco', 'Em frente à banca de jornal', 8.50);
--
-- insert into motoboys (nome, login, senha_hash, valor_rota) values
--   ('Junior', 'junior', '<hash>', 6.00);
