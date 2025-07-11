import { NextRequest, NextResponse } from 'next/server';
import { getMeetingById, updateMeeting, cancelMeeting } from '@/lib/meetingService';

// GET - Retrieve a specific meeting
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid meeting ID' },
        { status: 400 }
      );
    }
    
    const meeting = await getMeetingById(id);
    
    if (!meeting) {
      return NextResponse.json(
        { message: 'Meeting not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(meeting);
  } catch (error: any) {
    console.error(`Error fetching meeting:`, error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}

// PUT - Update a meeting
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid meeting ID' },
        { status: 400 }
      );
    }
    
    const updateData = await req.json();
    
    // Make sure we have updatedBy information
    if (!updateData.updatedBy) {
      return NextResponse.json(
        { message: 'Missing updatedBy field' },
        { status: 400 }
      );
    }
    
    // Validate time format - ensure no ampm fields
    if (updateData.startTime && updateData.startTime.ampm) {
      delete updateData.startTime.ampm;
    }
    if (updateData.endTime && updateData.endTime.ampm) {
      delete updateData.endTime.ampm;
    }
    
    const updatedBy = updateData.updatedBy;
    delete updateData.updatedBy; // Remove from actual meeting update data
    
    const success = await updateMeeting(id, updateData, updatedBy);
    
    if (!success) {
      return NextResponse.json(
        { message: 'No changes were made to the meeting' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ message: 'Meeting updated successfully' });
  } catch (error: any) {
    console.error(`Error updating meeting:`, error);
    return NextResponse.json(
      { message: error.message || 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel a meeting
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid meeting ID' },
        { status: 400 }
      );
    }
    
    // Get the person who is cancelling from the request
    const cancellationData = await req.json();
    const cancelledBy = cancellationData?.cancelledBy || 'Administrator';
    
    const success = await cancelMeeting(id, cancelledBy);
    
    if (!success) {
      return NextResponse.json(
        { message: 'Failed to cancel meeting' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ message: 'Meeting cancelled successfully' });
  } catch (error: any) {
    console.error(`Error cancelling meeting:`, error);
    return NextResponse.json(
      { message: error.message || 'Failed to cancel meeting' },
      { status: 500 }
    );
  }
}
