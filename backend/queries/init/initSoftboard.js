const initSoftboardSQL = `
CREATE TABLE IF NOT EXISTS softboard_columns (
    column_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS softboard_cards (
    card_id SERIAL PRIMARY KEY,
    column_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    link_text VARCHAR(200),
    link_url VARCHAR(500),
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES softboard_columns(column_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_softboard_cards_column ON softboard_cards(column_id);
CREATE INDEX IF NOT EXISTS idx_softboard_columns_position ON softboard_columns(position);
CREATE INDEX IF NOT EXISTS idx_softboard_cards_position ON softboard_cards(column_id, position);
`;

module.exports = initSoftboardSQL;
