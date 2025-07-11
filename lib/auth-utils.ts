import { compare, hash } from 'bcryptjs';
import { query } from './db';

// User type definition
export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: string;
}

// Find user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await query('SELECT * FROM users WHERE email = ?', [email]) as User[];
  return users.length > 0 ? users[0] : null;
}

// Find user by username or email
export async function findUserByUsernameOrEmail(username: string, email: string): Promise<User | null> {
  const users = await query(
    'SELECT * FROM users WHERE username = ? OR email = ?', 
    [username, email]
  ) as User[];
  return users.length > 0 ? users[0] : null;
}

// Create a new user
export async function createUser(username: string, email: string, password: string): Promise<User> {
  // Hash the password
  const hashedPassword = await hash(password, 12);
  
  // Insert the user
  const result = await query(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [username, email, hashedPassword]
  ) as any;
  
  // Get the created user
  const users = await query('SELECT * FROM users WHERE id = ?', [result.insertId]) as User[];
  return users[0];
}

// Compare password
export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return compare(plainPassword, hashedPassword);
}

export function logout() {
  // Clear localStorage
  localStorage.removeItem("user");
  localStorage.setItem("isAuthenticated", "false");
  
  // Clear cookies to share auth state with middleware
  document.cookie = "isAuthenticated=false; path=/; max-age=0";
  
  // Dispatch event to notify components
  window.dispatchEvent(new Event("authChange"));
  
  // Redirect to home
  window.location.href = '/';
}
