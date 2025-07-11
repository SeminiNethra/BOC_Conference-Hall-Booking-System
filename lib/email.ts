import nodemailer from 'nodemailer';
import { format } from 'date-fns';

interface EmailParams {
  to: string;
  subject: string;
  meetingDetails: any;
}

export async function sendMeetingEmail({ to, subject, meetingDetails }: EmailParams) {
  try {
    // Create a nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
      },
    });

    // Format time for display
    const formatTime = (time: any) => {
      return `${time.hour}:${time.minute === 0 ? '00' : time.minute} ${time.ampm}`;
    };

    // Format date for display
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return format(date, 'EEEE, MMMM d, yyyy');
      } catch (error) {
        console.error('Date formatting error:', error);
        return dateString;
      }
    };

    let emailContent = '';
    let actionMessage = '';
    
    // Customize email content based on the action
    switch (meetingDetails.action) {
      case 'created':
        actionMessage = 'You have been invited to a new meeting.';
        emailContent = `
          <h2>Meeting Invitation</h2>
          <p>${actionMessage}</p>
        `;
        break;
      
      case 'updated':
        actionMessage = `A meeting you're participating in has been updated by ${meetingDetails.updatedBy || 'the organizer'}.`;
        emailContent = `
          <h2>Meeting Updated</h2>
          <p>${actionMessage}</p>
        `;
        break;
      
      case 'cancelled':
        actionMessage = `A meeting you were scheduled to attend has been cancelled by ${meetingDetails.updatedBy || 'the organizer'}.`;
        emailContent = `
          <h2>Meeting Cancelled</h2>
          <p>${actionMessage}</p>
        `;
        break;
      
      default:
        actionMessage = 'Meeting information update.';
        emailContent = `
          <h2>Meeting Information</h2>
          <p>${actionMessage}</p>
        `;
    }

    // Add meeting details to email
    emailContent += `
      <div style="margin-top: 20px; border: 1px solid #eee; padding: 15px; border-radius: 5px; background-color: #f9f9f9;">
        <p style="margin: 10px 0;"><strong>Title:</strong> ${meetingDetails.title}</p>
        <p style="margin: 10px 0;"><strong>Date:</strong> ${formatDate(meetingDetails.date)}</p>
        <p style="margin: 10px 0;"><strong>Time:</strong> ${formatTime(meetingDetails.startTime)} - ${formatTime(meetingDetails.endTime)}</p>
        <p style="margin: 10px 0;"><strong>Location:</strong> ${meetingDetails.location}</p>
        ${meetingDetails.note ? `<p style="margin: 10px 0;"><strong>Note:</strong> ${meetingDetails.note}</p>` : ''}
        <p style="margin: 10px 0;"><strong>Organizer:</strong> ${meetingDetails.createdBy}</p>
        ${meetingDetails.participants && meetingDetails.participants.length > 0 
          ? `<p style="margin: 10px 0;"><strong>Participants:</strong> ${meetingDetails.participants.join(', ')}</p>` 
          : ''
        }
        ${meetingDetails.action === 'cancelled' 
          ? `<p style="margin-top: 15px; color: #e53e3e; font-weight: bold;">This meeting has been cancelled.</p>` 
          : ''
        }
      </div>
      <div style="margin-top: 20px; color: #666; font-size: 12px;">
        <p>This is an automated email from the BOC Bank Meeting Management System.</p>
      </div>
    `;

    // Configure the email
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"BOC Meeting System" <meetings@boc.com>',
      to,
      subject,
      html: emailContent,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
