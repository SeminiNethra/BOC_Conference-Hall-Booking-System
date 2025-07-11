import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, comparePassword } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user by email
    const user = await findUserByEmail(email);
    
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Return user data with login timestamp
    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      loginTime: Date.now() // Add login timestamp
    });
    
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
