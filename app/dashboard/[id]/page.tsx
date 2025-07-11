'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';

import {
  ArrowLeft, Clock, MapPin, Users, Edit, Trash2,
  Mail, CalendarIcon, Save, X, Info, AlertCircle,
  Check, XCircle, Loader2, Eye, EyeOff, Share, ExternalLink,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Meeting {
  id: number;
  title: string;
  date: string;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
  location: string;
  note?: string;
  participants: string[];
  isCancelled?: boolean;
  createdAt: string;
  createdBy: string;
  updatedBy?: string;
}

interface FormError {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  participant?: string;
  participants?: string;
  note?: string;
}

interface Room {
  id: string;
  name: string;
  status: 'available' | 'booked' | 'maintenance';
}

export default function MeetingDetails() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { successt, errort } = useToast();
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedMeeting, setEditedMeeting] = useState<Meeting | null>(null);
  const [participant, setParticipant] = useState('');
  const [formErrors, setFormErrors] = useState<FormError>({});
  const [showConfirmExitDialog, setShowConfirmExitDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Store participantConflicts during editing
  const [participantConflicts, setParticipantConflicts] = useState<Record<string, string[]>>({});
  const [roomAvailability, setRoomAvailability] = useState<Record<string, boolean>>({
    'Room A': true,
    'Room B': true
  });

  const [rooms] = useState<Room[]>([
    { id: 'roomA', name: 'Room A', status: 'available' },
    { id: 'roomB', name: 'Room B', status: 'available' },
  ]);

  useEffect(() => {
    if (id) {
      fetchMeeting();
    }
  }, [id]);

  // Monitor for unsaved changes
  useEffect(() => {
    if (isEditing && editedMeeting && meeting) {
      const hasChanges = 
        editedMeeting.title !== meeting.title ||
        editedMeeting.date !== meeting.date ||
        JSON.stringify(editedMeeting.startTime) !== JSON.stringify(meeting.startTime) ||
        JSON.stringify(editedMeeting.endTime) !== JSON.stringify(meeting.endTime) ||
        editedMeeting.location !== meeting.location ||
        (editedMeeting.note || '') !== (meeting.note || '') ||
        JSON.stringify(editedMeeting.participants) !== JSON.stringify(meeting.participants);
      
      setHasUnsavedChanges(hasChanges);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [isEditing, editedMeeting, meeting]);

  // Check availability when meeting details change during editing
  useEffect(() => {
    if (isEditing && editedMeeting?.date && editedMeeting?.startTime && editedMeeting?.endTime) {
      checkAvailability();
    }
  }, [isEditing, editedMeeting?.date, editedMeeting?.startTime, editedMeeting?.endTime, editedMeeting?.participants]);

  const fetchMeeting = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/meetings/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMeeting(data);
        setEditedMeeting(data);
      } else {
        errort({
          title: 'Error',
          description: 'Failed to fetch meeting details',
        });
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching meeting:', error);
      errort({
        title: 'Error',
        description: 'An unexpected error occurred',
      });
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAvailability = async () => {
    if (!editedMeeting) return;
    
    try {
      const response = await fetch('/api/meetings/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: editedMeeting.date,
          startTime: editedMeeting.startTime,
          endTime: editedMeeting.endTime,
          participants: editedMeeting.participants,
          meetingId: id, // Exclude current meeting from availability check
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRoomAvailability(data.roomAvailability);
        setParticipantConflicts(data.participantConflicts);
        
        // If current location becomes unavailable, reset it
        if (editedMeeting.location && !data.roomAvailability[editedMeeting.location]) {
          errort({
            title: 'Room Conflict',
            description: `${editedMeeting.location} is no longer available for the selected time`
          });
          setEditedMeeting({
            ...editedMeeting,
            location: ''
          });
        }
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const errors: FormError = {};
    
    if (!editedMeeting) return false;
    
    // Title validation
    if (!editedMeeting.title.trim()) {
      errors.title = "Meeting title is required";
    } else if (editedMeeting.title.length < 3) {
      errors.title = "Title must be at least 3 characters";
    }
    
    // Date validation
    if (!editedMeeting.date) {
      errors.date = "Date is required";
    } else {
      const selectedDate = new Date(editedMeeting.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.date = "Meeting cannot be scheduled in the past";
      }
    }
    
    // Time validation
    const startHour = editedMeeting.startTime.hour;
    const startMinute = editedMeeting.startTime.minute;
    const endHour = editedMeeting.endTime.hour;
    const endMinute = editedMeeting.endTime.minute;
    
    // Validate start time range (8-16)
    if (startHour < 8 || startHour > 16) {
      errors.startTime = "Start time must be between 8:00 and 16:00";
    }
    
    // Validate end time range (8-17)
    if (endHour < 8 || endHour > 17) {
      errors.endTime = "End time must be between 8:00 and 17:00";
    }
    
    // Validate that end time is after start time
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    if (endTotalMinutes <= startTotalMinutes) {
      errors.endTime = "End time must be after start time";
    }
    
    // Additional validation for same day meetings - check if time has passed
    if (editedMeeting.date) {
      const selectedDate = new Date(editedMeeting.date);
      const today = new Date();
      
      // If it's today, check if the start time has already passed
      if (selectedDate.toDateString() === today.toDateString()) {
        const currentHour = today.getHours();
        const currentMinute = today.getMinutes();
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        
        if (startTotalMinutes <= currentTotalMinutes) {
          errors.startTime = "Cannot schedule meetings for past times";
        }
      }
    }
    
    // Location validation
    if (!editedMeeting.location) {
      errors.location = "Location is required";
    }
    
    // Note validation - optional, but validate if present
    if (editedMeeting.note && editedMeeting.note.length > 2000) {
      errors.note = "Note must be less than 2000 characters";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to convert time object to minutes for comparison
  const convertTimeToMinutes = (time: any) => {
    return time.hour * 60 + time.minute;
  };

  const handleAddParticipant = () => {
    if (!participant.trim() || !editedMeeting) return;
    
    // Clear previous errors
    const newErrors = {...formErrors};
    delete newErrors.participant;
    delete newErrors.participants;
    setFormErrors(newErrors);
    
    // Email validation
    if (!validateEmail(participant)) {
      setFormErrors({...newErrors, participant: "Please enter a valid email address"});
      return;
    }
    
    if (editedMeeting.participants.includes(participant)) {
      setFormErrors({...newErrors, participant: "This participant is already added"});
      setParticipant('');
      return;
    }
    
    setEditedMeeting({
      ...editedMeeting,
      participants: [...editedMeeting.participants, participant],
    });
    setParticipant('');
  };

  const handleRemoveParticipant = (email: string) => {
    if (!editedMeeting) return;
    
    setEditedMeeting({
      ...editedMeeting,
      participants: editedMeeting.participants.filter(p => p !== email),
    });
    
    // Remove this participant from conflicts
    const newConflicts = {...participantConflicts};
    delete newConflicts[email];
    setParticipantConflicts(newConflicts);
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      setShowConfirmExitDialog(true);
    } else {
      discardChanges();
    }
  };

  const discardChanges = () => {
    setIsEditing(false);
    setEditedMeeting(meeting);
    setFormErrors({});
    setParticipant('');
    setShowConfirmExitDialog(false);
    setParticipantConflicts({});
    setRoomAvailability({
      'Room A': true,
      'Room B': true
    });
  };

  const handleUpdateMeeting = async () => {
    if (!editedMeeting || !meeting) return;
    
    // Validate the form
    if (!validateForm()) {
      errort({
        title: 'Validation Error',
        description: 'Please correct the errors in the form',
      });
      return;
    }
    
    // Check if there are any changes
    if (!hasUnsavedChanges) {
      setIsEditing(false);
      return;
    }
    
    // Check room availability
    if (editedMeeting.location && !roomAvailability[editedMeeting.location]) {
      errort({
        title: 'Room Unavailable',
        description: `${editedMeeting.location} is already booked for this time period`
      });
      return;
    }
    
    // Check for participant conflicts if there are participants
    if (editedMeeting.participants.length > 0) {
      const participantsWithConflicts = Object.entries(participantConflicts)
        .filter(([email, conflicts]) => conflicts && conflicts.length > 0);
      
      if (participantsWithConflicts.length > 0) {
        const shouldContinue = confirm(
          "Some participants have conflicting meetings during this time period. Continue anyway?"
        );
        
        if (!shouldContinue) return;
      }
    }
    
    try {
      let userEmail = 'admin@boc.com'; // Default fallback
      try {
        const userString = localStorage.getItem("user");
        if (userString) {
          const user = JSON.parse(userString);
          if (user.email) {
            userEmail = user.email;
          }
        }
      } catch (error) {
        console.error('Error getting user from localStorage:', error);
      }
      
      setIsSaving(true);
      
      const updatedMeeting = {
        ...editedMeeting,
        updatedBy: userEmail,
      };
      
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedMeeting),
      });
      
      if (response.ok) {
        successt({
          title: 'Success',
          description: 'Meeting updated successfully',
        });
        setIsEditing(false);
        setMeeting(updatedMeeting);
        setHasUnsavedChanges(false);
        setFormErrors({});
        setParticipant('');
      } else {
        const error = await response.json();
        errort({
          title: 'Error',
          description: error.message || 'Failed to update meeting',
        });
      }
    } catch (error) {
      console.error('Error updating meeting:', error);
      errort({
        title: 'Error',
        description: 'An unexpected error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelMeeting = async () => {
    try {
            let userEmail = 'admin@boc.com'; // Default fallback
      try {
        const userString = localStorage.getItem("user");
        if (userString) {
          const user = JSON.parse(userString);
          if (user.email) {
            userEmail = user.email;
          }
        }
      } catch (error) {
        console.error('Error getting user from localStorage:', error);
      }

      setIsDeleting(true);
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updatedBy: userEmail,
        }),
      });
      
      if (response.ok) {
        successt({
          title: 'Success',
          description: 'Meeting cancelled successfully',
        });
        router.push('/dashboard');
      } else {
        const error = await response.json();
        errort({
          title: 'Error',
          description: error.message || 'Failed to cancel meeting',
        });
      }
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      errort({
        title: 'Error',
        description: 'An unexpected error occurred',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Format time for display (24-hour format)
  const formatTime = (time: { hour: number; minute: number }) => {
    return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  };

  // Helper to copy meeting details to clipboard
  const copyMeetingDetails = () => {
    if (!meeting) return;
    
    const details = `
      Meeting: ${meeting.title}
      Date: ${format(parseISO(meeting.date), 'EEEE, MMMM d, yyyy')}
      Time: ${formatTime(meeting.startTime)} - ${formatTime(meeting.endTime)}
      Location: ${meeting.location}
      ${meeting.note ? `\nNote: ${meeting.note}\n` : ''}
      Participants: ${meeting.participants.join(', ')}
    `.trim();
    
    navigator.clipboard.writeText(details);
    
    successt({
      title: 'Copied to clipboard',
      description: 'Meeting details have been copied',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <p className="mt-4 text-xl font-medium text-muted-foreground">Loading meeting details...</p>
        </motion.div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto text-center border rounded-lg p-10 bg-card">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Meeting Not Found</h2>
          <p className="text-lg text-muted-foreground mb-6">The meeting you're looking for doesn't exist or has been removed.</p>
          <Button
            size="lg"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="group"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center space-x-2">
            {/* <Button 
              variant="outline" 
              size="sm"
              onClick={copyMeetingDetails}
            >
              <Share className="h-4 w-4 mr-2" />
              Copy Details
            </Button> */}
            
            {!isEditing && !meeting.isCancelled && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsEditing(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" /> 
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> 
                  Cancel Meeting
                </Button>
              </>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden border-2 mb-8">
            {/* Meeting Status Banner */}
            {meeting.isCancelled && (
              <div className="bg-destructive text-destructive-foreground py-2 px-4">
                <p className="text-center font-semibold">This meeting has been cancelled</p>
              </div>
            )}
            
            <CardHeader className={meeting.isCancelled ? 'opacity-60' : ''}>
              <div className="flex justify-between items-start gap-4 flex-wrap md:flex-nowrap">
                <div className="w-full md:w-3/4">
                  {isEditing ? (
                    <div className="space-y-4">
                      {/* Title Field */}
                      <div className="grid grid-cols-1 gap-2">
                        <label htmlFor="title" className="text-sm font-medium">
                          Meeting Title*
                        </label>
                        <div className="relative">
                          <Input
                            id="title"
                            value={editedMeeting?.title || ''}
                            onChange={(e) => {
                              if (editedMeeting) {
                                setEditedMeeting({ ...editedMeeting, title: e.target.value });
                                // Clear error when user types
                                if (formErrors.title && e.target.value.trim().length >= 3) {
                                  const { title, ...rest } = formErrors;
                                  setFormErrors(rest);
                                }
                              }
                            }}
                            placeholder="Meeting title"
                            className={`text-lg font-semibold ${formErrors.title ? "border-destructive focus:border-destructive" : ""}`}
                          />
                          {formErrors.title && (
                            <div className="text-destructive text-xs mt-1 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {formErrors.title}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Date Field */}
                      <div className="grid grid-cols-1 gap-2">
                        <label htmlFor="date" className="text-sm font-medium">
                          Date*
                        </label>
                        <div className="relative">
                          <Input
                            id="date"
                            type="date"
                            value={editedMeeting?.date || ''}
                            onChange={(e) => {
                              if (editedMeeting) {
                                setEditedMeeting({ ...editedMeeting, date: e.target.value });
                                // Clear error when user selects a valid date
                                if (formErrors.date) {
                                  const selectedDate = new Date(e.target.value);
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  
                                  if (selectedDate >= today) {
                                    const { date, ...rest } = formErrors;
                                    setFormErrors(rest);
                                  }
                                }
                              }
                            }}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            className={`pl-10 pr-4 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none ${formErrors.date ? "border-destructive" : ""}`}
                          />
                          <CalendarIcon 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" 
                            onClick={() => {
                              const dateInput = document.getElementById('date') as HTMLInputElement;
                              if (dateInput) {
                                dateInput.showPicker();
                              }
                            }}
                          />
                          {formErrors.date && (
                            <div className="text-destructive text-xs mt-1 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {formErrors.date}
                            </div>
                          )}
                        </div>
                      </div>

                                            {/* Time Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Start Time*</label>
                          <div className="flex gap-2 mt-1">
                            <Select
                              value={String(editedMeeting?.startTime.hour || 8)}
                              onValueChange={(value) => {
                                if (editedMeeting) {
                                  const newHour = parseInt(value);
                                  setEditedMeeting({
                                    ...editedMeeting,
                                    startTime: { ...editedMeeting.startTime, hour: newHour }
                                  });
                                  
                                  // Clear start time error if valid
                                  if (formErrors.startTime && newHour >= 8 && newHour <= 16) {
                                    const { startTime, ...rest } = formErrors;
                                    setFormErrors(rest);
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className={formErrors.startTime ? "border-destructive" : ""}>
                                <SelectValue placeholder="Hour" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 9 }, (_, i) => i + 8).map(hour => (
                                  <SelectItem key={`start-hour-${hour}`} value={String(hour)}>
                                    {hour.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Select
                              value={String(editedMeeting?.startTime.minute || 0)}
                              onValueChange={(value) => {
                                if (editedMeeting) {
                                  setEditedMeeting({
                                    ...editedMeeting,
                                    startTime: { ...editedMeeting.startTime, minute: parseInt(value) }
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className={formErrors.startTime ? "border-destructive" : ""}>
                                <SelectValue placeholder="Minute" />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 15, 30, 45].map(minute => (
                                  <SelectItem key={`start-minute-${minute}`} value={String(minute)}>
                                    {minute.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {formErrors.startTime && (
                            <div className="text-destructive text-xs mt-1 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {formErrors.startTime}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">End Time*</label>
                          <div className="flex gap-2 mt-1">
                            <Select
                              value={String(editedMeeting?.endTime.hour || 9)}
                              onValueChange={(value) => {
                                if (editedMeeting) {
                                  const newHour = parseInt(value);
                                  setEditedMeeting({
                                    ...editedMeeting,
                                    endTime: { ...editedMeeting.endTime, hour: newHour }
                                  });
                                  
                                  // Clear end time error if valid and after start time
                                  if (formErrors.endTime) {
                                    const startMinutes = convertTimeToMinutes(editedMeeting.startTime);
                                    const newEndMinutes = convertTimeToMinutes({
                                      ...editedMeeting.endTime,
                                      hour: newHour
                                    });
                                    
                                    if (newHour >= 8 && newHour <= 17 && newEndMinutes > startMinutes) {
                                      const { endTime, ...rest } = formErrors;
                                      setFormErrors(rest);
                                    }
                                  }
                                }
                              }}
                            >
                              <SelectTrigger className={formErrors.endTime ? "border-destructive" : ""}>
                                <SelectValue placeholder="Hour" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 10 }, (_, i) => i + 8).map(hour => (
                                  <SelectItem key={`end-hour-${hour}`} value={String(hour)}>
                                    {hour.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Select
                              value={String(editedMeeting?.endTime.minute || 0)}
                              onValueChange={(value) => {
                                if (editedMeeting) {
                                  setEditedMeeting({
                                    ...editedMeeting,
                                    endTime: { ...editedMeeting.endTime, minute: parseInt(value) }
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className={formErrors.endTime ? "border-destructive" : ""}>
                                <SelectValue placeholder="Minute" />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 15, 30, 45].map(minute => (
                                  <SelectItem key={`end-minute-${minute}`} value={String(minute)}>
                                    {minute.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {formErrors.endTime && (
                            <div className="text-destructive text-xs mt-1 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {formErrors.endTime}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location Selection */}
                      <div className="grid grid-cols-1 gap-2">
                        <label className="text-sm font-medium">Location*</label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.keys(roomAvailability).map(room => (
                            <div
                              key={`room-option-${room}`}
                              className={`border rounded-md p-3 cursor-pointer transition-colors ${
                                editedMeeting?.location === room 
                                  ? 'border-primary bg-primary/10 hover:bg-primary/20' 
                                  : 'border-input hover:border-primary'
                              } ${
                                !roomAvailability[room] 
                                  ? 'opacity-50 cursor-not-allowed bg-muted' 
                                  : ''
                              } ${
                                formErrors.location ? 'border-destructive' : ''
                              }`}
                              onClick={() => {
                                if (roomAvailability[room] && editedMeeting) {
                                  setEditedMeeting({ ...editedMeeting, location: room });
                                  // Clear location error
                                  if (formErrors.location) {
                                    const { location, ...rest } = formErrors;
                                    setFormErrors(rest);
                                  }
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span>{room}</span>
                                {!roomAvailability[room] && (
                                  <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">Unavailable</Badge>
                                )}
                                {roomAvailability[room] && (
                                  <Badge variant="outline" className="text-xs bg-green-100 text-green-600 border-green-200">Available</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {formErrors.location && (
                          <div className="text-destructive text-xs mt-1 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {formErrors.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <CardTitle className="text-2xl md:text-3xl break-words">
                      {meeting.title}
                      {meeting.isCancelled && (
                        <Badge variant="destructive" className="ml-2 align-middle">Cancelled</Badge>
                      )}
                    </CardTitle>
                  )}
                  
                  {!isEditing && (
                    <CardDescription className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        {format(parseISO(meeting.date), 'EEEE, MMMM d, yyyy')}
                      </span>
                      <span className="inline-flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                      </span>
                    </CardDescription>
                  )}
                </div>
                
                {!isEditing && (
                  <div className="w-full md:w-1/4 flex flex-col items-start md:items-end">
                    <Badge 
                      className="px-3 py-1.5 text-sm md:ml-auto" 
                      variant={meeting.isCancelled ? "outline" : "default"}
                    >
                      <MapPin className="h-3.5 w-3.5 mr-1.5 inline" />
                      {meeting.location}
                    </Badge>
                    
                    <span className="text-xs text-muted-foreground mt-2">
                      Created on {format(parseISO(meeting.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className={`space-y-6 ${meeting.isCancelled ? 'opacity-60' : ''}`}>
              <Separator />
              
              {/* Participants Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  Participants {editedMeeting && `(${editedMeeting.participants.length})`}
                </h3>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={participant}
                        onChange={(e) => {
                          setParticipant(e.target.value);
                          // Clear participant error as user types
                          if (formErrors.participant && (e.target.value === '' || validateEmail(e.target.value))) {
                            const { participant, ...rest } = formErrors;
                            setFormErrors(rest);
                          }
                          
                          // Clear participants error (required error)
                          // if (formErrors.participants) {
                          //   const { participants, ...rest } = formErrors;
                          //   setFormErrors(rest);
                          // }
                        }}
                        placeholder="Enter email address"
                        className={formErrors.participant ? "border-destructive focus:border-destructive" : ""}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && participant.trim()) {
                            e.preventDefault();
                            handleAddParticipant();
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        onClick={handleAddParticipant}
                        disabled={!participant.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    
                    {formErrors.participant && (
                      <div className="text-destructive text-xs mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {formErrors.participant}
                      </div>
                    )}
                    
                    {formErrors.participants && (
                      <div className="text-destructive text-xs mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {formErrors.participants}
                      </div>
                    )}
                    
                    {/* Participant list with conflict visualization */}
                    {editedMeeting && editedMeeting.participants.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {editedMeeting.participants.map((email, idx) => {
                          const hasConflict = participantConflicts[email] && participantConflicts[email].length > 0;
                          return (
                            <Badge 
                              key={`participant-badge-${idx}`} 
                              variant="secondary"
                              className={
                                hasConflict
                                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                  : ""
                              }
                            >
                              {email}
                              <button 
                                className="ml-1 text-muted-foreground hover:text-foreground"
                                onClick={() => handleRemoveParticipant(email)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                              {hasConflict && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-5 px-1 ml-1 text-xs text-destructive"
                                      >
                                        <Info className="h-3 w-3 inline mr-1" /> Conflict
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="p-2 max-w-xs">
                                        <h4 className="font-bold text-sm">Scheduling Conflict</h4>
                                        <p className="text-xs mt-1">
                                          {email} has conflicting meetings:
                                        </p>
                                        <ul className="text-xs mt-1 list-disc pl-4">
                                          {participantConflicts[email].map((conflict, i) => (
                                            <li key={`conflict-${i}`}>{conflict}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : null }
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {meeting.participants.map((email, idx) => (
                      <Badge key={idx} variant="secondary" className="justify-start py-1.5 px-3">
                        <Mail className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <span className="truncate">{email}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Meeting Notes Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium flex items-center">
                  <Info className="h-5 w-5 mr-2 text-primary" />
                  Meeting Notes
                </h3>
                
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedMeeting?.note || ''}
                      onChange={(e) => {
                        if (editedMeeting) {
                          setEditedMeeting({ ...editedMeeting, note: e.target.value });
                          
                          // Clear error as user types
                          if (formErrors.note && e.target.value.length < 2000) {
                            const { note, ...rest } = formErrors;
                            setFormErrors(rest);
                          }
                        }
                      }}
                      placeholder="Add notes about this meeting (optional)"
                      className={`min-h-[120px] ${formErrors.note ? "border-destructive" : ""}`}
                    />
                    {formErrors.note && (
                      <div className="text-destructive text-xs flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {formErrors.note}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground text-right">
                      {editedMeeting?.note?.length || 0}/2000
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-md p-4 min-h-[100px]">
                    {meeting.note ? (
                      <div className="whitespace-pre-wrap">{meeting.note}</div>
                    ) : (
                      <p className="text-muted-foreground italic">No notes for this meeting.</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className={`bg-muted/20 border-t pt-6 pb-6 ${meeting.isCancelled ? 'opacity-60' : ''}`}>
              <div className="w-full">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div className="text-sm text-muted-foreground">
                    {meeting.updatedBy ? (
                      <span>Last updated by {meeting.updatedBy}</span>
                    ) : (
                      <span>Created by {meeting.createdBy}</span>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="flex gap-2 ml-auto">
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      
                      <Button
                        onClick={handleUpdateMeeting}
                        disabled={isSaving || !hasUnsavedChanges}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                                        </div>
                  ) : null}
                </div>                
                {/* Meeting ID Info */}
                <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <span>Meeting ID: {meeting.id}</span>
                    {/* <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 ml-1"
                            onClick={() => navigator.clipboard.writeText(meeting.id.toString())}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy meeting ID</TooltipContent>
                      </Tooltip>
                    </TooltipProvider> */}
                  </div>
                  
                  <span>
                    {meeting.isCancelled 
                      ? "Cancelled on " + format(parseISO(meeting.createdAt), 'MMM d, yyyy')
                      : ""}
                  </span>
                </div>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      {/* Dialog: Confirm Exit with Unsaved Changes */}
      <Dialog open={showConfirmExitDialog} onOpenChange={setShowConfirmExitDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to exit without saving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmExitDialog(false)}>
              Continue Editing
            </Button>
            <Button variant="destructive" onClick={discardChanges}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirm Meeting Cancellation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel Meeting</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this meeting? This action will send a cancellation notification to all participants and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-md p-3 mt-2 text-sm">
            <h4 className="font-semibold">{meeting.title}</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {format(parseISO(meeting.date), 'MMMM d, yyyy')}
              </span>
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
              </span>
              <span className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {meeting.location}
              </span>
              <span className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {meeting.participants.length} participants
              </span>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Keep Meeting
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelMeeting}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
