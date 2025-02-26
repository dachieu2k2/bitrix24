export interface Token {
  access_token: string
  refresh_token: string
}

/**
CREATE TABLE tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

 */
