CREATE TABLE IF NOT EXISTS `client_states` (
    `id`      CHAR(32) PRIMARY KEY,
    `state`   JSON NOT NULL DEFAULT '{}',
    `created` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;
