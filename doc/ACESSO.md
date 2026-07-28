# Acesso — queue-test

Stack: **MySQL** + **Redis** + **phpMyAdmin** (roda em Apache) via docker-compose. App Node/Express na host.

## Subir infra

```bash
docker compose up -d
# ou: yarn db:up
```

Sobe 3 containers:

| Serviço      | Container          | Porta host | Uso                          |
|--------------|--------------------|------------|------------------------------|
| MySQL 8      | `queue_mysql`      | `3307`     | banco (3307 evita conflito com MySQL local no 3306) |
| Redis 7      | `queue_redis`      | `6379`     | fila BullMQ                  |
| phpMyAdmin 5 | `queue_phpmyadmin` | `8080`     | UI do banco no browser (Apache) |

## Acessar banco pelo browser

Abre: **http://localhost:8080**

Login:

- **Servidor:** `mysql` (já pré-preenchido via `PMA_HOST`)
- **Usuário:** `queue`
- **Senha:** `queue`

Root (se precisar): usuário `root`, senha `root`.

Banco: `queue`.

## Rodar o app

```bash
yarn install
yarn prisma:generate      # gera Prisma Client
yarn prisma:migrate       # cria tabela Order no MySQL (precisa infra de pé)
yarn dev                  # server em http://localhost:3000
```

## Testar

```bash
# health
curl http://localhost:3000/health

# criar pedido -> entra na fila -> worker processa -> status FINISHED
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"tenantId":1,"customer":"Fulano","total":42.50}'
```

Confere o resultado no phpMyAdmin (tabela `Order`, coluna `status` = `FINISHED`, `processedBy` = hostname).

## Conexões (.env)

```
DATABASE_URL="mysql://queue:queue@localhost:3307/queue"
REDIS_HOST="localhost"
REDIS_PORT=6379
PORT=3000
```
