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

## Alternativa ao VPS: Railway / Render (sem servidor próprio)

- **Backend:** crie um serviço a partir deste repositório apontando para a pasta `backend/`
  (build por Docker). Defina as variáveis `DB_*`, `JWT_SECRET`, `PORT=4000`.
- **MySQL:** use um banco gerenciado (Railway MySQL, PlanetScale, Aiven…) e preencha os `DB_*`.
- Rode o seed uma vez (`npm run seed`) pelo console do serviço.
- A plataforma já entrega **HTTPS** num domínio `*.up.railway.app` / `*.onrender.com` —
  use essa URL no `EXPO_PUBLIC_API_URL`.

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
