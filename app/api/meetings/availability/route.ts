import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability } from '@/lib/meetingService';

export async function POST(req: NextRequest) {
  try {
    const { date, startTime, endTime, participants, meetingId } = await req.json();
    
    // Validate required fields
    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { message: 'Date, startTime, and endTime are required' },
        { status: 400 }
      );
    }
    
    // Ensure time objects don't have ampm fields
    const cleanStartTime = {
      hour: startTime.hour,
      minute: startTime.minute
    };
    
    const cleanEndTime = {
      hour: endTime.hour,
      minute: endTime.minute
    };
    
    const availabilityData = await checkAvailability(
      date, 
      cleanStartTime, 
      cleanEndTime, 
      participants || [],
      meetingId
    );
    
    return NextResponse.json(availabilityData);
  } catch (error: any) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to check availability' },
      { status: 500 }
    );
  }
}
