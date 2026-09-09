-- Schema da Stop Rotas (PostgreSQL)
-- Executado automaticamente pelo backend no start (CREATE ... IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS employees (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  username      VARCHAR(60)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'worker' CHECK (role IN ('admin','worker')),
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id            SERIAL PRIMARY KEY,
  employee_id   INT NOT NULL REFERENCES employees(id),
  status        VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  distance_m    DOUBLE PRECISION NOT NULL DEFAULT 0,
  duration_s    INT NOT NULL DEFAULT 0,
  moving_s      INT NOT NULL DEFAULT 0,
  deliveries_count INT NOT NULL DEFAULT 0,
  last_lat      DOUBLE PRECISION,
  last_lng      DOUBLE PRECISION,
  last_seen_at  TIMESTAMPTZ,
  moving        BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_emp ON shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_started ON shifts(started_at);

CREATE TABLE IF NOT EXISTS location_points (
  id          BIGSERIAL PRIMARY KEY,
  shift_id    INT NOT NULL REFERENCES shifts(id),
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  speed       DOUBLE PRECISION,
  moving      BOOLEAN NOT NULL DEFAULT TRUE,
  recorded_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_points_shift ON location_points(shift_id, recorded_at);

CREATE TABLE IF NOT EXISTS deliveries (
  id         BIGSERIAL PRIMARY KEY,
  shift_id   INT NOT NULL REFERENCES shifts(id),
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  note       VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliv_shift ON deliveries(shift_id);
