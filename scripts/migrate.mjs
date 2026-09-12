import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_hg7DxXpm9TPz@ep-bitter-wave-aw52t9pu-pooler.c-12.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const sql = neon(databaseUrl);

async function run() {
  console.log("Conectando ao Neon e executando schema.sql...");
  
  const schemaPath = path.resolve("./schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  
  // Limpar comentários e executar comandos DDL individualmente
  const cleanSql = schemaSql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");

  const statements = cleanSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    console.log("Executando:", statement.slice(0, 40).replace(/\n/g, " "), "...");
    await sql(statement);
  }


  console.log("Tabelas e índices criados com sucesso!");

  // Checar se já existem dados
  const locais = await sql`select count(*) from locais`;
  console.log("Total de locais existentes:", locais[0].count);

  if (Number(locais[0].count) === 0) {
    console.log("Inserindo dados de exemplo (seed)...");
    
    // Inserir locais
    await sql`
      insert into locais (nome, endereco, contato, valor_unidade) values
        ('Zona Norte — Mercadão', 'Entrada principal, banca 12', '(86) 99991-1111', 8.00),
        ('Centro — Praça Rio Branco', 'Em frente à banca de jornal', '(86) 99992-2222', 8.50),
        ('Zona Leste — UFPI', 'Prédio CCH, cantina', '(86) 99993-3333', 9.00),
        ('Zona Sul — Distrito Industrial', 'Rua dos Motores, 480', '(86) 99994-4444', 8.50)
    `;

    // Inserir motoboys (senha: 123456)
    // Hash bcrypt para '123456'
    const senhaHash = "$2a$10$y6K9X7B7b0M6Yk9i8E7jZeWlWvA2o4s5m0l2K7q5F5j1W3k0m0z1G"; 
    await sql`
      insert into motoboys (nome, login, senha_hash, valor_rota) values
        ('Junior', 'junior', ${senhaHash}, 6.00),
        ('Carlos', 'carlos', ${senhaHash}, 6.50),
        ('Anderson', 'anderson', ${senhaHash}, 6.00)
    `;

    // Buscar IDs para rotas de teste
    const allLocais = await sql`select id, nome, valor_unidade from locais`;
    const allMotoboys = await sql`select id, nome, valor_rota from motoboys`;

    const hoje = new Date().toISOString().slice(0, 10);

    // Inserir rotas de hoje
    // Rota 1: Zona Norte - Mercadão com Junior (32 un, entregue)
    await sql`
      insert into rotas (local_id, motoboy_id, quantidade, data, status, receita, custo, entregue_em)
      values (
        ${allLocais[0].id},
        ${allMotoboys[0].id},
        32,
        ${hoje},
        'entregue',
        ${32 * Number(allLocais[0].valor_unidade)},
        ${Number(allMotoboys[0].valor_rota)},
        now()
      )
    `;

    // Rota 2: Centro - Rio Branco com Carlos (28 un, entregue)
    await sql`
      insert into rotas (local_id, motoboy_id, quantidade, data, status, receita, custo, entregue_em)
      values (
        ${allLocais[1].id},
        ${allMotoboys[1].id},
        28,
        ${hoje},
        'entregue',
        ${28 * Number(allLocais[1].valor_unidade)},
        ${Number(allMotoboys[1].valor_rota)},
        now()
      )
    `;

    // Rota 3: Zona Leste - UFPI com Anderson (45 un, pendente)
    await sql`
      insert into rotas (local_id, motoboy_id, quantidade, data, status, receita, custo)
      values (
        ${allLocais[2].id},
        ${allMotoboys[2].id},
        45,
        ${hoje},
        'pendente',
        ${45 * Number(allLocais[2].valor_unidade)},
        ${Number(allMotoboys[2].valor_rota)}
      )
    `;

    // Rota 4: Zona Sul - Distrito com Junior (19 un, pendente)
    await sql`
      insert into rotas (local_id, motoboy_id, quantidade, data, status, receita, custo)
      values (
        ${allLocais[3].id},
        ${allMotoboys[0].id},
        19,
        ${hoje},
        'pendente',
        ${19 * Number(allLocais[3].valor_unidade)},
        ${Number(allMotoboys[0].valor_rota)}
      )
    `;

    console.log("Seed de exemplo inserido com sucesso!");
  }

  console.log("Banco de dados pronto para testes!");
}

run().catch((err) => {
  console.error("Erro na migração:", err);
  process.exit(1);
});
