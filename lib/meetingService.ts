import { query } from './db';
import { format, parseISO } from 'date-fns';
import { sendMeetingEmail } from './email';

interface TimeObject {
  hour: number;
  minute: number;
}

interface MeetingInput {
  title: string;
  date: string;
  startTime: TimeObject;
  endTime: TimeObject;
  location: string;
  note?: string;
  participants: string[];
  createdBy: string;
}

interface Meeting {
  id: number;
  title: string;
  date: string;
  startTime: TimeObject;
  endTime: TimeObject;
  location: string;
  note?: string;
  participants: string[];
  createdBy: string;
  isCancelled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Update the rowToMeeting function
function rowToMeeting(row: any, participants: string[] = []): Meeting {
  return {
    id: row.id,
    title: row.title,
    date: format(new Date(row.date), 'yyyy-MM-dd'),
    startTime: {
      hour: row.start_hour,
      minute: row.start_minute
    },
    endTime: {
      hour: row.end_hour,
      minute: row.end_minute
    },
    location: row.location,
    note: row.note,
    participants,
    createdBy: row.created_by,
    isCancelled: row.is_cancelled === 1,
    createdAt: format(new Date(row.created_at), 'yyyy-MM-dd HH:mm:ss'),
    updatedAt: format(new Date(row.updated_at), 'yyyy-MM-dd HH:mm:ss')
  };
}

// Update createMeeting function
async function createMeeting(meeting: MeetingInput): Promise<number> {
  try {
    // Insert meeting record - remove ampm fields
    const result: any = await query(
      `INSERT INTO meetings 
      (title, date, start_hour, start_minute, end_hour, end_minute, location, note, created_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        meeting.title,
        meeting.date,
        meeting.startTime.hour,
        meeting.startTime.minute,
        meeting.endTime.hour,
        meeting.endTime.minute,
        meeting.location,
        meeting.note || null,
        meeting.createdBy
      ]
    );

    const meetingId = result.insertId;
    
    // Add participants
    if (meeting.participants && meeting.participants.length > 0) {
      const participantValues = meeting.participants.map(email => 
        [meetingId, email]
      );
      
      // Using multiple value syntax for better performance
      const placeholders = participantValues.map(() => '(?, ?)').join(', ');
      const flatParams = participantValues.flat();
      
      await query(
        `INSERT INTO meeting_participants (meeting_id, participant_email) VALUES ${placeholders}`,
        flatParams
      );
      
      // Send email notifications to all participants
      const meetingDetails = {
        ...meeting,
        id: meetingId,
        action: 'created'
      };
      
      // Send emails to all participants
      for (const participantEmail of meeting.participants) {
        try {
          await sendMeetingEmail({
            to: participantEmail,
            subject: `Meeting Invitation: ${meeting.title}`,
            meetingDetails
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${participantEmail}:`, emailError);
          // Continue with other participants even if one email fails
        }
      }
      
      // Also send notification to the meeting creator
      if (!meeting.participants.includes(meeting.createdBy)) {
        try {
          await sendMeetingEmail({
            to: meeting.createdBy,
            subject: `Meeting Created: ${meeting.title}`,
            meetingDetails
          });
        } catch (emailError) {
          console.error(`Failed to send email to creator ${meeting.createdBy}:`, emailError);
        }
      }
    }
    
    return meetingId;
  } catch (error) {
    console.error('Error creating meeting:', error);
    throw error;
  }
}

// Get all meetings
async function getAllMeetings(): Promise<Meeting[]> {
  try {
    const meetingsResult = await query(
      `SELECT * FROM meetings ORDER BY date DESC, start_hour ASC, start_minute ASC`
    ) as any[];
    
    // If no meetings, return empty array
    if (!meetingsResult.length) return [];
    
    // Get participants for all meetings
    const meetingIds = meetingsResult.map(m => m.id);
    const idPlaceholders = meetingIds.map(() => '?').join(',');
    
    const participantsResult: any[] = await query(
      `SELECT meeting_id, participant_email FROM meeting_participants WHERE meeting_id IN (${idPlaceholders})`,
      meetingIds
    ) as any;
    
    // Group participants by meeting
    const participantsByMeeting: { [key: number]: string[] } = {};
    participantsResult.forEach(p => {
      if (!participantsByMeeting[p.meeting_id]) {
        participantsByMeeting[p.meeting_id] = [];
      }
      participantsByMeeting[p.meeting_id].push(p.participant_email);
    });
    
    // Convert rows to Meeting objects with participants
    return meetingsResult.map(row => 
      rowToMeeting(row, participantsByMeeting[row.id] || [])
    );
  } catch (error) {
    console.error('Error getting all meetings:', error);
    throw error;
  }
}

// Get meeting by ID
async function getMeetingById(id: number): Promise<Meeting | null> {
  try {
    const [meetingResult]: any[] = await query(
      `SELECT * FROM meetings WHERE id = ?`,
      [id]
    ) as any;
    
    if (!meetingResult) return null;
    
    // Get participants for this meeting
    const participantsResult: any[] = await query(
      `SELECT participant_email FROM meeting_participants WHERE meeting_id = ?`,
      [id]
    ) as any;
    
    const participants = participantsResult.map(p => p.participant_email);
    
    return rowToMeeting(meetingResult, participants);
  } catch (error) {
    console.error(`Error getting meeting with ID ${id}:`, error);
    throw error;
  }
}

// Check availability for rooms and participants
async function checkAvailability(date: string, startTime: TimeObject, endTime: TimeObject, participants: string[] = []) {
  try {
    // Convert start and end times to minutes for easy comparison
    function timeToMinutes(time: TimeObject): number {
      let hours = time.hour;
      return hours * 60 + time.minute;
    }
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    // Get all meetings for the given date that aren't cancelled
    const meetingsResult: any[] = await query(
      `SELECT * FROM meetings WHERE date = ? AND is_cancelled = 0`,
      [date]
    ) as any;
    
    // Room availability
    const roomAvailability: { [key: string]: boolean } = {
      'Room A': true,
      'Room B': true
    };
    
    // Participant conflicts (participant email -> array of conflicting meeting titles)
    const participantConflicts: { [key: string]: string[] } = {};
    
    // Initialize participant conflicts map
    participants.forEach(p => {
      participantConflicts[p] = [];
    });
    
    // Check for conflicts
    for (const meeting of meetingsResult) {
      // Convert meeting times to minutes
      const meetingStart = timeToMinutes({
        hour: meeting.start_hour,
        minute: meeting.start_minute,
      });
      
      const meetingEnd = timeToMinutes({
        hour: meeting.end_hour,
        minute: meeting.end_minute,
      });
      
      // Check for time overlap
      const isOverlapping = (
        (startMinutes >= meetingStart && startMinutes < meetingEnd) ||
        (endMinutes > meetingStart && endMinutes <= meetingEnd) ||
        (startMinutes <= meetingStart && endMinutes >= meetingEnd)
      );
      
      if (isOverlapping) {
        // Check room availability
        if (roomAvailability[meeting.location]) {
          roomAvailability[meeting.location] = false;
        }
        
        // If participants were provided, check for conflicts
        if (participants.length > 0) {
          // Get participants for this meeting
          const meetingParticipants: any[] = await query(
            `SELECT participant_email FROM meeting_participants WHERE meeting_id = ?`,
            [meeting.id]
          ) as any;
          
          const meetingParticipantEmails = meetingParticipants.map(p => p.participant_email);
          
          // Check for participant conflicts
          participants.forEach(email => {
            if (meetingParticipantEmails.includes(email)) {
              participantConflicts[email].push(meeting.title);
            }
          });
        }
      }
    }
    
    return {
      roomAvailability,
      participantConflicts
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    throw error;
  }
}

// Update updateMeeting function
async function updateMeeting(id: number, updateData: Partial<MeetingInput>, updatedBy: string): Promise<boolean> {
  try {
    // Build the update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    if (updateData.title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(updateData.title);
    }
    
    if (updateData.date !== undefined) {
      updateFields.push('date = ?');
      updateValues.push(updateData.date);
    }
    
    if (updateData.startTime !== undefined) {
      updateFields.push('start_hour = ?', 'start_minute = ?');
      updateValues.push(updateData.startTime.hour, updateData.startTime.minute);
    }
    
    if (updateData.endTime !== undefined) {
      updateFields.push('end_hour = ?', 'end_minute = ?');
      updateValues.push(updateData.endTime.hour, updateData.endTime.minute);
    }
    
    if (updateData.location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(updateData.location);
    }
    
    if (updateData.note !== undefined) {
      updateFields.push('note = ?');
      updateValues.push(updateData.note);
    }
    
    if (updateFields.length === 0) {
      return false; // No fields to update
    }
    
    // Add updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id); // for WHERE clause
    
    const updateQuery = `
      UPDATE meetings 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `;
    
    const result: any = await query(updateQuery, updateValues);
    
    if (result.affectedRows === 0) {
      return false;
    }
    
    // Update participants if provided
    if (updateData.participants !== undefined) {
      // Delete existing participants
      await query('DELETE FROM meeting_participants WHERE meeting_id = ?', [id]);
      
      // Insert new participants
      if (updateData.participants.length > 0) {
        const participantValues = updateData.participants.map(email => [id, email]);
        const placeholders = updateData.participants.map(() => '(?, ?)').join(', ');
        
        await query(
          `INSERT INTO meeting_participants (meeting_id, participant_email) VALUES ${placeholders}`,
          participantValues.flat()
        );
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating meeting:', error);
    throw error;
  }
}

// Cancel meeting
async function cancelMeeting(id: number, cancelledBy: string): Promise<boolean> {
  try {
    // Get the meeting data before cancelling
    const meeting = await getMeetingById(id);
    if (!meeting) {
      throw new Error(`Meeting with ID ${id} not found`);
    }
    
    await query(
      `UPDATE meetings SET is_cancelled = 1 WHERE id = ?`,
      [id]
    );
    
    // Prepare meeting details for email notification
    const meetingDetails = {
      ...meeting,
      action: 'cancelled',
      updatedBy: cancelledBy
    };
    
    // Send cancellation email to all participants
    for (const participantEmail of meeting.participants) {
      try {
        await sendMeetingEmail({
          to: participantEmail,
          subject: `Meeting Cancelled: ${meeting.title}`,
          meetingDetails
        });
      } catch (emailError) {
        console.error(`Failed to send cancellation email to ${participantEmail}:`, emailError);
        // Continue with other participants even if one email fails
      }
    }
    
    // Also send notification to the meeting creator if not already a participant
    if (meeting.createdBy && !meeting.participants.includes(meeting.createdBy)) {
      try {
        await sendMeetingEmail({
          to: meeting.createdBy,
          subject: `Meeting Cancelled: ${meeting.title}`,
          meetingDetails
        });
      } catch (emailError) {
        console.error(`Failed to send cancellation email to creator ${meeting.createdBy}:`, emailError);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error cancelling meeting with ID ${id}:`, error);
    throw error;
  }
}

export {
  createMeeting,
  getAllMeetings,
  getMeetingById,
  checkAvailability,
  updateMeeting,
  cancelMeeting,
  type Meeting,
  type MeetingInput
};
