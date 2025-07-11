import { NextRequest, NextResponse } from 'next/server';
import { createMeeting, getAllMeetings } from '@/lib/meetingService';

// GET - Retrieve all meetings
export async function GET(req: NextRequest) {
  try {
    const meetings = await getAllMeetings();
    return NextResponse.json(meetings);
  } catch (error: any) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

// POST - Create a new meeting
export async function POST(req: NextRequest) {
  try {
    const meetingData = await req.json();
    
    // Validate required fields
    const requiredFields = ['title', 'date', 'startTime', 'endTime', 'location', 'participants', 'createdBy'];
    for (const field of requiredFields) {
      if (!meetingData[field]) {
        return NextResponse.json(
          { message: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Create the meeting
    const meetingId = await createMeeting(meetingData);
    
    return NextResponse.json(
      { 
        message: 'Meeting created successfully',
        meetingId 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
