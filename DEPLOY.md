# Deploy e build de teste (APK)

## O que falta para uma build de testes usável

Hoje tudo roda no **seu PC** (backend no Docker + app via Expo Go na sua rede).
Para outras pessoas testarem o APK no celular delas, em qualquer lugar, faltam **3 coisas**:

1. **Hospedar o backend + MySQL na internet** (os testers não estão na sua rede local). — **Sim, precisa hospedar.**
2. **HTTPS** — o Android bloqueia HTTP puro por padrão. O jeito limpo é um domínio com HTTPS (já resolvido pelo Caddy aqui).
3. **Gerar o APK** apontando para a URL pública do backend.

Abaixo, o passo a passo.

---

## Passo 1 — Hospedar o backend (VPS com Docker) — recomendado

Serve qualquer VPS Linux barata (Hostinger, Contabo, DigitalOcean, AWS Lightsail, Oracle Free…).

### 1.1 Criar o servidor
- Suba uma VM **Ubuntu 22.04+**, anote o **IP público**.

### 1.2 Apontar um domínio
- No seu provedor de domínio, crie um registro **A**: `api.seudominio.com.br → IP_DO_SERVIDOR`.
- (Sem domínio? Veja o "Plano B" no fim.)

### 1.3 Instalar Docker no servidor
```bash
curl -fsSL https://get.docker.com | sh
```

### 1.4 Subir o projeto
```bash
git clone https://github.com/MatheusCarm0/stop-rotas-app.git
cd stop-rotas-app
cp .env.example .env
nano .env    # troque as senhas, o JWT_SECRET e defina DOMAIN=api.seudominio.com.br
```
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend npm run seed
```
- O **Caddy** já pega o certificado HTTPS sozinho.
- Libere as portas **80** e **443** no firewall do provedor.
- Teste: abra `https://api.seudominio.com.br/health` → deve responder `{"ok":true}`.

> Segurança mínima antes de convidar testers: troque as senhas do `.env`, crie os
> colaboradores reais na aba **Equipe** e remova/!troque os usuários do seed.

---

## Passo 2 — Apontar o app para o backend hospedado

Edite `mobile/eas.json` (perfil `preview`) e coloque sua URL:
```json
"env": { "EXPO_PUBLIC_API_URL": "https://api.seudominio.com.br" }
```

---

## Passo 3 — Gerar o APK (EAS Build)

```bash
cd mobile
npm install -g eas-cli
eas login                         # crie uma conta Expo grátis, se não tiver
eas build -p android --profile preview
```
- Ao final, o EAS devolve um **link para baixar o `.apk`**.
- Mande esse link para os testers instalarem no Android (precisa permitir "instalar de fontes desconhecidas").
- O rastreamento em **segundo plano** (tela bloqueada) já funciona no APK — diferente do Expo Go.

> A primeira build pede para gerar um **keystore** — deixe o EAS criar automaticamente.

---

## ⭐ Caminho recomendado para testes: Railway (sem servidor próprio, sem domínio)

O Railway hospeda o **backend + MySQL** na nuvem, com **HTTPS** de graça num domínio
`*.up.railway.app`. O backend **cria as tabelas e o usuário admin sozinho** no primeiro
deploy — não precisa rodar nada manualmente.

### 1) Criar o projeto
1. Acesse **https://railway.com** e faça login com o **GitHub**.
2. **New Project → Deploy from GitHub repo →** selecione `MatheusCarm0/stop-rotas-app`.
3. No serviço criado: **Settings → Root Directory =** `backend`
   (o Railway lê o `backend/railway.json` e builda pelo `Dockerfile`).

### 2) Adicionar o banco MySQL
1. Dentro do projeto: **New → Database → Add MySQL**.
2. Isso cria um serviço **MySQL** com as variáveis de conexão prontas.

### 3) Ligar o backend ao banco (variáveis)
No serviço do **backend → Variables**, adicione só **duas** variáveis
(troque `MySQL` pelo nome real do serviço de banco, se for diferente):

```
DB_URL=${{MySQL.MYSQL_URL}}
JWT_SECRET=coloque-uma-frase-longa-e-aleatoria-aqui
```
> `MYSQL_URL` é a string de conexão que o próprio serviço MySQL do Railway expõe.
> Não defina `PORT` — o Railway injeta sozinho e o backend já usa essa porta.
>
> (Alternativa às 2 acima: `DB_HOST=${{MySQL.MYSQLHOST}}`, `DB_PORT=${{MySQL.MYSQLPORT}}`,
> `DB_USER=${{MySQL.MYSQLUSER}}`, `DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}`,
> `DB_NAME=${{MySQL.MYSQLDATABASE}}` + `JWT_SECRET`.)

### 4) Publicar e pegar a URL
1. O deploy roda automático. Nos **Logs** você deve ver:
   `schema garantido` e `usuários padrão criados (admin/admin123)`.
2. No backend: **Settings → Networking → Generate Domain**
   (se pedir a porta, informe **4000**). Vai gerar algo como
   `https://stop-rotas-app-production.up.railway.app`.
3. Teste no navegador: `SUA_URL/health` → `{"ok":true}`.

### 5) Apontar o app e gerar o APK
Em `mobile/eas.json` (perfil `preview`):
```json
"env": { "EXPO_PUBLIC_API_URL": "https://SUA_URL.up.railway.app" }
```
```bash
cd mobile
npm install -g eas-cli
eas login
eas build -p android --profile preview   # gera o APK (link no final)
```

### Observações
- **Login inicial:** `admin / admin123`. Entre na aba **Equipe** e cadastre os colaboradores
  reais. (Troca de senha do admin é uma melhoria futura — por ora, mantenha o `JWT_SECRET`
  secreto e não divulgue o admin.)
- **Custo:** o Railway tem um crédito de teste; para uso contínuo pode exigir plano pago.
- **Alternativa:** o **Render** funciona igual (backend por Docker apontando para `backend/`,
  + um MySQL gerenciado externo, ex.: Aiven/PlanetScale, preenchendo os mesmos `DB_*`).

---

## Plano B — Testar o APK sem domínio (rápido, temporário)

Use um túnel HTTPS para o backend do seu PC:
```bash
# com o backend rodando local (docker compose up -d)
npx cloudflared tunnel --url http://localhost:4000
```
Isso gera uma URL `https://algo.trycloudflare.com`. Use-a no `EXPO_PUBLIC_API_URL`
do `eas.json` e gere o APK. Serve para um teste pontual (a URL muda a cada execução).

---

## Resumo

| Item | Necessário para testers? |
|---|---|
| Backend hospedado na internet | **Sim** |
| Banco MySQL (no mesmo servidor ou gerenciado) | **Sim** |
| HTTPS (domínio + Caddy, ou plataforma) | **Sim** (Android exige) |
| APK via EAS apontando para a URL pública | **Sim** |
| Conta Expo (grátis) para o EAS Build | **Sim** |
