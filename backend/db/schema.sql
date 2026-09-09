-- Schema da Stop Rotas (MySQL 8)
-- Executado automaticamente pelo container do MySQL na primeira subida.

CREATE TABLE IF NOT EXISTS employees (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  username      VARCHAR(60)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','worker') NOT NULL DEFAULT 'worker',
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shifts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  employee_id  INT NOT NULL,
  status       ENUM('active','ended') NOT NULL DEFAULT 'active',
  started_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at     TIMESTAMP NULL,
  distance_m   DOUBLE NOT NULL DEFAULT 0,
  duration_s   INT NOT NULL DEFAULT 0,
  deliveries_count INT NOT NULL DEFAULT 0,
  last_lat     DOUBLE NULL,
  last_lng     DOUBLE NULL,
  last_seen_at TIMESTAMP NULL,
  moving       TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_shift_emp FOREIGN KEY (employee_id) REFERENCES employees(id),
  INDEX idx_status (status),
  INDEX idx_emp (employee_id),
  INDEX idx_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS location_points (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  shift_id    INT NOT NULL,
  lat         DOUBLE NOT NULL,
  lng         DOUBLE NOT NULL,
  speed       DOUBLE NULL,
  moving      TINYINT(1) NOT NULL DEFAULT 1,
  recorded_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_point_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
  INDEX idx_point_shift (shift_id),
  INDEX idx_point_time (shift_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deliveries (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  shift_id   INT NOT NULL,
  lat        DOUBLE NULL,
  lng        DOUBLE NULL,
  note       VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deliv_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
  INDEX idx_deliv_shift (shift_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
