import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsernameOrEmail, createUser } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json();
    
    // Validate inputs
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await findUserByUsernameOrEmail(username, email);
    
    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          { message: 'Email already in use' },
          { status: 400 }
        );
      }
      if (existingUser.username === username) {
        return NextResponse.json(
          { message: 'Username already taken' },
          { status: 400 }
        );
      }
    }
    
    // Create new user
    const user = await createUser(username, email, password);
    
    // Return success without password
    return NextResponse.json(
      { 
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      },
      { status: 201 }
    );
  
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: error.message || 'Error creating user' },
      { status: 500 }
    );
  }
}
