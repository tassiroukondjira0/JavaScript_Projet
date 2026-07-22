-- Activity log (audit trail)
-- Table: activity_logs

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NULL,
  action_type VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id INT NULL,
  metadata TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_actor_created (actor_user_id, created_at)
);

