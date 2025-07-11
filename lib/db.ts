import mysql from 'mysql2/promise';

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'conference_meeting_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL connection established successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Error connecting to MySQL:', error);
    return false;
  }
}

// Execute SQL query with params
async function query(sql: string, params: any[] = []) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Initialize database tables if they don't exist
async function initDatabase() {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create meetings table
    await query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        start_hour INT NOT NULL,
        start_minute INT NOT NULL,
        start_ampm VARCHAR(2) NOT NULL,
        end_hour INT NOT NULL,
        end_minute INT NOT NULL,
        end_ampm VARCHAR(2) NOT NULL,
        location VARCHAR(255) NOT NULL,
        note TEXT,
        created_by VARCHAR(255) NOT NULL,
        is_cancelled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create meeting_participants table (for many-to-many relationship)
    await query(`
      CREATE TABLE IF NOT EXISTS meeting_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meeting_id INT NOT NULL,
        participant_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
        UNIQUE KEY unique_participant (meeting_id, participant_email)
      )
    `);
    
    // Create email_log table to track sent emails
    await query(`
      CREATE TABLE IF NOT EXISTS email_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        meeting_id INT NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        email_type ENUM('created', 'updated', 'cancelled') NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'success',
        error_message TEXT,
        FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

export { pool, query, testConnection, initDatabase };
