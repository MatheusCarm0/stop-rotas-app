# Deploy e build de teste (APK)

O backend usa **PostgreSQL** e se **auto-inicializa** (cria as tabelas e o usuário admin
no primeiro start). Isso deixa o deploy no **Render** bem simples, porque o Render tem
**PostgreSQL grátis nativo** — não precisa de banco externo.

## O que falta para uma build de testes usável
1. **Hospedar backend + Postgres na internet** (os testers não estão na sua rede). — precisa.
2. **HTTPS** — o Render já entrega HTTPS de graça.
3. **Gerar o APK** apontando para a URL pública.

---

## ⭐ Render (recomendado) — via Blueprint (quase 1 clique)

1. Acesse **https://render.com** e faça login com o **GitHub**.
2. **New → Blueprint** → selecione o repositório `MatheusCarm0/stop-rotas-app`.
   - O Render lê o `render.yaml` e cria **dois** recursos: o **PostgreSQL** (`stoprotas-db`)
     e o **Web Service** (`stoprotas-backend`, build por Docker na pasta `backend/`).
   - O `DATABASE_URL` é ligado automaticamente e o `JWT_SECRET` é gerado sozinho.
3. Clique em **Apply** e aguarde o build/deploy.
4. Nos **Logs** do backend você deve ver:
   `conectado ao PostgreSQL` → `schema garantido` → `usuários padrão criados (admin/admin123)`.
5. A URL pública aparece no topo do serviço, algo como
   `https://stoprotas-backend.onrender.com`. Teste no navegador: `SUA_URL/health` → `{"ok":true}`.

### Render manual (se preferir sem o Blueprint)
1. **New → PostgreSQL** (plano Free) → copie a **Internal Database URL**.
2. **New → Web Service** → conecte o repo → **Root Directory = `backend`**
   (Runtime **Docker**, detecta o `Dockerfile`), plano **Free**.
3. Em **Environment**, adicione:
   - `DATABASE_URL` = a Internal Database URL do passo 1
   - `JWT_SECRET` = uma frase longa e aleatória
   > Não defina `PORT` (o Render injeta e o backend já usa).
   > Só use `DB_SSL=true` se conectar por uma URL **externa** (a Internal não precisa).

> ⏰ No plano Free, o serviço **hiberna após ~15 min** sem acesso; o primeiro request
> depois disso demora ~1 min pra "acordar". Normal para testes.

---

## Apontar o app e gerar o APK

1. Em `mobile/eas.json` (perfil `preview`), coloque sua URL:
   ```json
   "env": { "EXPO_PUBLIC_API_URL": "https://SUA_URL.onrender.com" }
   ```
2. Gere o APK:
   ```bash
   cd mobile
   npm install -g eas-cli
   eas login                 # conta Expo grátis
   eas build -p android --profile preview
   ```
   No fim, o EAS devolve um **link do `.apk`** para instalar no Android
   (permita "instalar de fontes desconhecidas"). No APK o **GPS em segundo plano**
   (tela bloqueada) funciona — ao contrário do Expo Go.

- **Login inicial:** `admin / admin123`. Entre na aba **Equipe** e cadastre os reais.

---

## Alternativa: VPS com Docker (tudo self-hosted, com domínio)

Com um domínio apontando para a VM (registro A) e `DOMAIN` no `.env`:
```bash
curl -fsSL https://get.docker.com | sh
git clone https://github.com/MatheusCarm0/stop-rotas-app.git && cd stop-rotas-app
cp .env.example .env    # troque senhas, JWT_SECRET e defina DOMAIN
docker compose -f docker-compose.prod.yml up -d --build
```
O **Caddy** cuida do HTTPS automático. Teste `https://SEU_DOMINIO/health`.

---

## Rodar localmente (desenvolvimento)
```bash
cp .env.example .env
docker compose up -d --build      # Postgres + backend + Adminer
# Adminer em http://localhost:8080  (sistema: PostgreSQL, servidor: postgres)
```
O backend cria as tabelas e o admin sozinho. Usuários: `admin/admin123`, `bruno/senha123`.

---

## Resumo
| Item | Render (Blueprint) |
|---|---|
| Backend | Web Service (Docker, pasta `backend/`) |
| Banco | PostgreSQL grátis do próprio Render |
| HTTPS | Automático (`*.onrender.com`) |
| DATABASE_URL / JWT_SECRET | Ligados/gerados pelo `render.yaml` |
| APK | `eas build -p android --profile preview` com a URL pública |
