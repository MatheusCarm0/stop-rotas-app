# Stop Rotas — Gestão de equipe de panfletagem em tempo real

App de campo para a **Stop Panfletos**: o funcionário faz login, inicia o expediente e o
trajeto passa a ser registrado por GPS (distância, tempo, ritmo, paradas e entregas).
O administrador acompanha todos os funcionários ativos em tempo real e gera relatórios
e comprovantes de distribuição para o cliente final.

```
stop-rotas-app/
├─ docker-compose.yml      # MySQL 8 + backend + Adminer
├─ backend/                # API Node.js + Express + TypeScript (mysql2, JWT, Socket.io)
└─ mobile/                 # App React Native (Expo) — funcionário + admin, build APK
```

> **Status:** scaffold funcional. Backend + MySQL sobem e funcionam via Docker.
> O app mobile precisa ser rodado em celular/emulador (GPS não roda em ambiente sem device).

---

## 1) Backend + banco (Docker)

Pré-requisito: **Docker Desktop**.

```bash
cp .env.example .env          # ajuste as senhas se quiser
docker compose up -d --build  # sobe mysql + backend + adminer
docker compose exec backend npm run seed   # cria usuários iniciais
```

- API: <http://localhost:4000>  (teste: <http://localhost:4000/health>)
- Adminer (ver o banco): <http://localhost:8080>  → sistema **MySQL**, servidor `mysql`, usuário/senha do `.env`
- O schema (`backend/db/schema.sql`) é criado automaticamente na primeira subida.

**Usuários do seed:**

| Papel   | Usuário | Senha    |
|---------|---------|----------|
| Admin   | admin   | admin123 |
| Funcion.| bruno   | senha123 |
| Funcion.| camila  | senha123 |

### Rodar o backend sem Docker (opcional)
```bash
cd backend
cp .env.example .env   # aponte DB_HOST para seu MySQL
npm install
npm run seed
npm run dev
```

---

## 2) App mobile (React Native / Expo)

Pré-requisitos: **Node 18+** e o app **Expo Go** no celular (ou um emulador Android).

```bash
cd mobile
cp .env.example .env
```

Edite o `.env` com o endereço do backend **que o celular enxerga**:

- Emulador Android: `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`
- Celular físico (mesma rede Wi-Fi): descubra o IP do PC (`ipconfig`) e use
  `EXPO_PUBLIC_API_URL=http://192.168.x.x:4000`

```bash
npm install
npx expo install --fix   # alinha as libs nativas à versão do SDK
npx expo start           # leia o QR code com o Expo Go
```

> No **Expo Go** o rastreamento em segundo plano é limitado. Para GPS com a tela
> bloqueada de verdade, gere o APK (passo 3) — é um *development/preview build*.

---

## 3) Gerar o APK

### Opção A — EAS Build (nuvem, recomendado)
```bash
cd mobile
npm install -g eas-cli
eas login
eas build -p android --profile preview   # gera um .apk (perfil 'preview' em eas.json)
```
Ao final o EAS devolve um link para baixar o `.apk`.

### Opção B — Build local (precisa de Android Studio + JDK 17)
```bash
cd mobile
npx expo prebuild -p android
cd android
gradlew.bat assembleRelease
# APK em: android/app/build/outputs/apk/release/app-release.apk
```

---

## Arquitetura

- **Autenticação:** JWT (`/api/auth/login`). O token vai no header `Authorization: Bearer ...`.
- **Rastreamento:** o app envia lotes de posições para `POST /api/shifts/:id/locations`.
  A **distância é recalculada no servidor** (Haversine) para não depender do cliente.
- **Tempo real:** o painel admin atualiza por *polling* a cada 3s. O backend já expõe
  **Socket.io** (eventos `shift:start`, `shift:update`, `shift:end`) para evoluir para push.
- **Relatórios:** entregas por mês, desempenho por funcionário e KPIs do dia.

### Principais endpoints
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | login, retorna token |
| POST | `/api/shifts/start` | inicia turno (funcionário) |
| POST | `/api/shifts/:id/locations` | envia lote de pontos GPS |
| POST | `/api/shifts/:id/deliveries` | registra entrega |
| POST | `/api/shifts/:id/end` | encerra turno |
| GET  | `/api/shifts/:id` | detalhe + pontos + entregas (comprovante) |
| GET  | `/api/shifts/active` | turnos ativos (admin) |
| GET  | `/api/reports/today` | KPIs do dia (admin) |
| GET  | `/api/reports/monthly?months=6` | entregas por mês (admin) |
| GET  | `/api/reports/performance` | desempenho por funcionário (admin) |

---

## Próximos passos sugeridos
- Exportar o comprovante como imagem/PDF (`react-native-view-shot`) e enviar ao cliente.
- Mapa com ruas de verdade (Mapbox / Google Maps) sobre o traçado.
- Fila offline no app (reenvia pontos quando a conexão volta).
- Push em tempo real no painel via Socket.io (já disponível no backend).
- Painel web do admin (reaproveitando o mesmo backend).
