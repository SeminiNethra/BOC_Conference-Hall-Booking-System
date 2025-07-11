'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, getDay, addDays, addWeeks } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2,
  Clock, MapPin, Users, X, Edit, Trash2, Info, Grid, Calendar, LayoutList,
  Link, AlertCircle, Eye
} from 'lucide-react';
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Textarea} from '@/components/ui/textarea'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Badge} from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';

interface TimeSlot {
  time: string;
  display: string;
}

interface Room {
  id: string;
  name: string;
  status: 'available' | 'booked' | 'maintenance';
}

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
  createdBy: string;
}

interface FormError {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  participant?: string;
  participants?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { successt, errort } = useToast();
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>('Room A');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDayMeetingsDialogOpen, setIsDayMeetingsDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [hoveredMeeting, setHoveredMeeting] = useState<Meeting | null>(null);
  const [timeInterval, setTimeInterval] = useState<15 | 30 | 60>(30);
  const [rooms] = useState<Room[]>([
    { id: 'roomA', name: 'Room A', status: 'available' },
    { id: 'roomB', name: 'Room B', status: 'available' },
  ]);
  
  const [next6Days] = useState(() => 
    Array.from({ length: 6 }, (_, i) => addDays(new Date(), i))
  );

  const [formErrors, setFormErrors] = useState<FormError>({});

  const [newMeeting, setNewMeeting] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: { hour: 8, minute: 0 },
    endTime: { hour: 9, minute: 0 },
    location: '',
    note: '',
    participants: [] as string[],
    createdBy: '',
    isRecurring: false
  });

  const [showCalendarView, setShowCalendarView] = useState(false);
  const [showRoomAvailabilityView, setShowRoomAvailabilityView] = useState(true);

  const [participant, setParticipant] = useState('');
  type RoomAvailability = { [key: string]: boolean };
  const [roomAvailability, setRoomAvailability] = useState<RoomAvailability>({
    'Room A': true,
    'Room B': true
  });
  const [participantConflicts, setParticipantConflicts] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Get user email from localStorage when component mounts
  useEffect(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const user = JSON.parse(userString);
        setNewMeeting(prev => ({
          ...prev,
          createdBy: user.email || 'admin@boc.com'
        }));
      }
    } catch (error) {
      console.error('Error getting user from localStorage:', error);
    }
  }, []);

  // Add this state variable with other useState declarations
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);

  // Add near the top of the component
  useEffect(() => {
    const checkAuth = () => {
      const isAuth = localStorage.getItem("isAuthenticated") === "true";
      if (!isAuth) {
        router.push('/');
      }
    };
    
    checkAuth();
  }, [router]);

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/meetings');
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      } else {
        errort({
          title: 'Error',
          description: 'Failed to fetch meetings'
        });
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      errort({
        title: 'Error',
        description: 'Failed to fetch meetings'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate time slots based on selected interval
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    let currentTime = new Date();
    currentTime.setHours(8, 0, 0);
    
    while (currentTime.getHours() < 17 || (currentTime.getHours() === 17 && currentTime.getMinutes() === 0)) {
      slots.push({
        time: format(currentTime, 'HH:mm'),
        display: format(currentTime, 'HH:mm')
      });
      currentTime = addMinutes(currentTime, timeInterval);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  function addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60000);
  }

  // Check availability when meeting details change
  useEffect(() => {
    if (newMeeting.date && newMeeting.startTime && newMeeting.endTime && newMeeting.participants.length > 0) {
      checkAvailability();
    } else if (newMeeting.date && newMeeting.startTime && newMeeting.endTime) {
      checkRoomAvailability();
    }
  }, [newMeeting.date, newMeeting.startTime, newMeeting.endTime, newMeeting.participants]);

  const validateForm = (): boolean => {
    const errors: FormError = {};
    
    // Title validation
    if (!newMeeting.title.trim()) {
      errors.title = "Meeting title is required";
    } else if (newMeeting.title.length < 3) {
      errors.title = "Title must be at least 3 characters";
    }
    
    // Date validation
    if (!newMeeting.date) {
      errors.date = "Date is required";
    } else {
      const selectedDate = new Date(newMeeting.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.date = "Meeting cannot be scheduled in the past";
      }
    }
    
    // Time validation
    const startMinutes = convertTimeToMinutes(newMeeting.startTime);
    const endMinutes = convertTimeToMinutes(newMeeting.endTime);
    
    if (endMinutes <= startMinutes) {
      errors.endTime = "End time must be after start time";
    }
    
    // Check if meeting is in the past (same day but past time)
    const selectedDate = new Date(newMeeting.date);
    const today = new Date();
    
    if (isSameDay(selectedDate, today)) {
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      if (startMinutes <= currentTimeInMinutes) {
        errors.startTime = "Cannot schedule meetings for past times";
      }
    }
    
    // Location validation
    if (!newMeeting.location) {
      errors.location = "Location is required";
    }
    
    // Participants validation
    // if (newMeeting.participants.length === 0) {
    //   errors.participants = "At least one participant is required";
    // }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check only room availability without participants
  const checkRoomAvailability = async () => {
    try {
      const response = await fetch('/api/meetings/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newMeeting.date,
          startTime: newMeeting.startTime,
          endTime: newMeeting.endTime,
          participants: [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRoomAvailability(data.roomAvailability);
      }
    } catch (error) {
      console.error('Error checking room availability:', error);
    }
  };

  const checkAvailability = async () => {
    try {
      if (!newMeeting.date || !newMeeting.startTime || !newMeeting.endTime) {
        return;
      }
      
      if (newMeeting.participants.length === 0) {
        setRoomAvailability({
          'Room A': true,
          'Room B': true
        });
        setParticipantConflicts({});
        return;
      }
      
      const response = await fetch('/api/meetings/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: newMeeting.date,
          startTime: newMeeting.startTime,
          endTime: newMeeting.endTime,
          participants: newMeeting.participants,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRoomAvailability(data.roomAvailability);
        setParticipantConflicts(data.participantConflicts);
        
        if (newMeeting.location && !data.roomAvailability[newMeeting.location]) {
          errort({
            title: 'Room Conflict',
            description: `${newMeeting.location} is no longer available for the selected time`
          });
          setNewMeeting({
            ...newMeeting,
            location: ''
          });
        }
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      errort({
        title: 'Error',
        description: 'Failed to check availability'
      });
    }
  };

  // Fixed time comparison method to correctly determine room status
  const getRoomStatus = (room: Room, date: Date, timeSlot: string) => {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const timeSlotMinutes = hours * 60 + minutes;
    
    const meetingsForRoom = meetings.filter(m => 
      m.location === room.name && 
      isSameDay(parseISO(m.date), date) &&
      !m.isCancelled
    );
    
    const isBooked = meetingsForRoom.some(meeting => {
      const startMinutes = convertTimeToMinutes(meeting.startTime);
      const endMinutes = convertTimeToMinutes(meeting.endTime);
      
      return timeSlotMinutes >= startMinutes && timeSlotMinutes < endMinutes;
    });
    
    if (room.status === 'maintenance') return 'maintenance';
    return isBooked ? 'booked' : 'available';
  };

  const isTimeInMeetingRange = (meeting: Meeting, timeSlot: string) => {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    
    const startMinutes = convertTimeToMinutes(meeting.startTime);
    const endMinutes = convertTimeToMinutes(meeting.endTime);
    
    return timeInMinutes >= startMinutes && timeInMinutes < endMinutes;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'booked': return 'bg-destructive text-destructive-foreground';
      case 'available': return 'bg-green-500 text-white hover:bg-green-600';
      case 'maintenance': return 'bg-yellow-500 text-black';
      default: return '';
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
  };

  const handleAddParticipant = () => {
    if (!participant.trim()) return;
    
    const newErrors = {...formErrors};
    delete newErrors.participant;
    delete newErrors.participants;
    setFormErrors(newErrors);
    
    if (!validateEmail(participant)) {
      setFormErrors({...newErrors, participant: "Please enter a valid email address"});
      return;
    }
    
    if (newMeeting.participants.includes(participant)) {
      setFormErrors({...newErrors, participant: "This participant is already added"});
      setParticipant('');
      return;
    }
    
    setNewMeeting({
      ...newMeeting,
      participants: [...newMeeting.participants, participant],
    });
    setParticipant('');
    
    setTimeout(() => checkAvailability(), 0);
  };

    const handleRemoveParticipant = (email: string) => {
    setNewMeeting({
      ...newMeeting,
      participants: newMeeting.participants.filter(p => p !== email),
    });
    
    // Remove this participant from conflicts
    const newConflicts = {...participantConflicts};
    delete newConflicts[email];
    setParticipantConflicts(newConflicts);
  };

  // Complete handleCreateMeeting function with proper loading state
  const handleCreateMeeting = async () => {
    // Prevent multiple clicks - return early if already creating
    if (isCreatingMeeting) {
      console.log('Already creating meeting, ignoring click');
      return;
    }

    console.log('Starting meeting creation process');

    // Validate the form
    if (!validateForm()) {
      errort({
        title: 'Validation Error',
        description: 'Please correct the errors in the form'
      });
      return;
    }
    
    // Check room availability
    if (newMeeting.location && !roomAvailability[newMeeting.location]) {
      errort({
        title: 'Room Unavailable',
        description: `${newMeeting.location} is already booked for this time period`
      });
      return;
    }
    
    // Check for participant conflicts if there are participants
    if (newMeeting.participants.length > 0) {
      const participantsWithConflicts = Object.entries(participantConflicts)
        .filter(([email, conflicts]) => conflicts && conflicts.length > 0);
      
      if (participantsWithConflicts.length > 0) {
        errort({
          title: 'Participant Conflicts Detected',
          description: `Some participants have conflicting meetings. Do you want to continue anyway?`
        });
        
        if (!confirm("Some participants have existing meetings during this time period. Continue anyway?")) {
          return;
        }
      }
    }
    
    // Set loading state to true
    setIsCreatingMeeting(true);
    console.log('Set isCreatingMeeting to true');
    
    try {
      if (newMeeting.isRecurring) {
        // Create 4 weekly meetings
        const baseDate = new Date(newMeeting.date);
        
        const meetingsToCreate = [];
        for (let i = 0; i < 4; i++) {
          const meetingDate = i === 0 ? baseDate : addWeeks(baseDate, i);
          
          meetingsToCreate.push({
            ...newMeeting,
            date: format(meetingDate, 'yyyy-MM-dd'),
            isRecurring: false
          });
        }
        
        // Create all meetings sequentially
        let createdCount = 0;
        for (const meeting of meetingsToCreate) {
          const { isRecurring, ...meetingData } = meeting;
          
          const response = await fetch('/api/meetings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(meetingData),
          });
          
          if (response.ok) {
            createdCount++;
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create meeting');
          }
        }
        
        successt({
          title: 'Success',
          description: `Created ${createdCount} recurring meetings`
        });
        
        setIsAddDialogOpen(false);
        resetNewMeeting();
        await fetchMeetings();
        
      } else {
        // Create single meeting
        const { isRecurring, ...meetingData } = newMeeting;
        
        console.log('Sending API request...');
        const response = await fetch('/api/meetings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(meetingData),
        });
        
        if (response.ok) {
          console.log('Meeting created successfully');
          successt({
            title: 'Success',
            description: 'Meeting created successfully'
          });
          setIsAddDialogOpen(false);
          resetNewMeeting();
          await fetchMeetings();
          
        } else {
          const error = await response.json();
          console.error('API Error:', error);
          errort({
            title: 'Error',
            description: error.message || 'Failed to create meeting'
          });
        }
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      errort({
        title: 'Error',
        description: 'An unexpected error occurred'
      });
    } finally {
      // Always reset loading state
      setIsCreatingMeeting(false);
      console.log('Set isCreatingMeeting to false');
    }
  };

  const resetNewMeeting = () => {
    let userEmail = 'admin@boc.com';
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
    setNewMeeting({
      title: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: { hour: 8, minute: 0 },
      endTime: { hour: 9, minute: 0 },
      location: '',
      note: '',
      participants: [],
      createdBy: userEmail,
      isRecurring: false
    });
    setParticipant('');
    setFormErrors({});
  };

  // Modified handleDateSelect to open dialog instead of navigation
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsDayMeetingsDialogOpen(true);
  };

  const handleBackToCalendar = () => {
    setSelectedDate(null);
    setShowCalendarView(true);
    setShowRoomAvailabilityView(false);
  };

  const handleSwitchView = () => {
    setShowCalendarView(!showCalendarView);
    setShowRoomAvailabilityView(!showRoomAvailabilityView);
  };

  const getMonthDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  };

  const hasMeetingOnDate = (date: Date) => {
    return meetings.some(meeting => 
      isSameDay(parseISO(meeting.date), date) && !meeting.isCancelled
    );
  };

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter(meeting => 
      isSameDay(parseISO(meeting.date), date) && !meeting.isCancelled
    );
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Helper function to convert time object to minutes for comparison (updated for 24-hour format)
  const convertTimeToMinutes = (time: any) => {
    return time.hour * 60 + time.minute;
  };

  const handleOpenMeetingDetails = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsDetailsDialogOpen(true);
  };

  const navigateToMeetingDetails = (meetingId: number) => {
    router.push(`/dashboard/${meetingId}`);
  };

  // Format time for display (updated for 24-hour format)
  const formatTimeDisplay = (time: { hour: number; minute: number }) => {
    return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  };

  // Generate hour options for start time (8-16)
  const getStartTimeHours = () => {
    return Array.from({ length: 9 }, (_, i) => i + 8); // 8 to 16
  };

  // Generate hour options for end time (8-17)
  const getEndTimeHours = () => {
    return Array.from({ length: 10 }, (_, i) => i + 8); // 8 to 17
  };

  // Generate minute options
  const getMinuteOptions = () => {
    return [0, 15, 30, 45];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-stone-400">Conference Room Booking Dashboard</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={handleSwitchView}
            variant="outline"
            className="mr-2"
          >
            {showCalendarView ? (
              <><LayoutList className=" mr-2 h-4 w-4" /> Switch to Room Availability</>
            ) : (
              <><Calendar className="mr-2 h-4 w-4" /> Switch to Calendar View</>
            )}
          </Button>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-primary hover:bg-primary"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Meeting
          </Button>
        </div>
      </div>

      {/* Time Interval Selection */}
      {showRoomAvailabilityView && (
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Time Interval:</span>
            <div className="flex space-x-2">
              <Button 
                variant={timeInterval === 15 ? "default" : "outline"} 
                size="sm"
                onClick={() => setTimeInterval(15)}
              >
                15 min
              </Button>
              <Button 
                variant={timeInterval === 30 ? "default" : "outline"} 
                size="sm"
                onClick={() => setTimeInterval(30)}
              >
                30 min
              </Button>
              <Button 
                variant={timeInterval === 60 ? "default" : "outline"} 
                size="sm"
                onClick={() => setTimeInterval(60)}
              >
                1 hour
              </Button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Room Availability View - Default View */}
        {showRoomAvailabilityView && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-card border rounded-lg shadow-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-yellow-400 text-black">
                    <th className="p-4 border text-left">Time</th>
                    {next6Days.map((date, index) => (
                      <React.Fragment key={`day-${index}`}>
                        <th colSpan={2} className="p-4 border text-center">
                          {format(date, 'dd MMMM')}
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                  <tr className="bg-muted/50">
                    <th className="p-2 border"></th>
                    {next6Days.map((_, index) => (
                      <React.Fragment key={`rooms-${index}`}>
                        <th className="p-2 border text-center">Room A</th>
                        <th className="p-2 border text-center">Room B</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((timeSlot, timeIndex) => (
                    <tr key={`timeslot-${timeIndex}`} className={timeIndex % 4 === 0 ? 'bg-muted/10' : ''}>
                      <td className="p-2 border font-medium">{timeSlot.display}</td>
                      {next6Days.map((date, dateIndex) => (
                        <React.Fragment key={`date-${dateIndex}-time-${timeIndex}`}>
                          {rooms.map((room) => {
                            const status = getRoomStatus(room, date, timeSlot.time);
                            const meetingsForCell = meetings.filter(m => 
                              m.location === room.name && 
                              isSameDay(parseISO(m.date), date) &&
                              isTimeInMeetingRange(m, timeSlot.time) &&
                              !m.isCancelled
                            );
                            
                            return (
                              <td 
                                key={`${room.id}-date-${dateIndex}-time-${timeIndex}`} 
                                className="p-1 text-center border-r border-yellow-900"
                              >
                                {status === 'available' ? (
                                  <Badge 
                                    className={`${getStatusClass(status)} px-2 py-1 cursor-pointer`}
                                    onClick={() => router.push(`/book-room?date=${format(date, 'yyyy-MM-dd')}&time=${timeSlot.time}&room=${room.id}`)}
                                  >
                                    Available
                                  </Badge>
                                ) : (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge 
                                          className={`${getStatusClass(status)} px-2 py-1 cursor-pointer`}
                                          onClick={() => {
                                            if (meetingsForCell.length > 0) {
                                              navigateToMeetingDetails(meetingsForCell[0].id);
                                            }
                                          }}
                                        >
                                          {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </Badge>
                                      </TooltipTrigger>
                                      {meetingsForCell.length > 0 && (
                                        <TooltipContent>
                                          <div className="p-2">
                                            <h3 className="font-bold">{meetingsForCell[0].title}</h3>
                                            <p className="text-xs mt-1">
                                              {formatTimeDisplay(meetingsForCell[0].startTime)} - {formatTimeDisplay(meetingsForCell[0].endTime)}
                                            </p>
                                            <p className="text-xs mt-1">
                                              {meetingsForCell[0].participants.length} participant(s)
                                            </p>
                                            <p className="text-xs mt-1 text-blue-500">
                                              Click to view details
                                            </p>
                                          </div>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </td>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Calendar View */}
        {showCalendarView && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-primary rounded-lg shadow-md p-6 mb-6"
          >
                        <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={`day-header-${day}`} className="text-center py-2 font-medium text-sm">
                  {day}
                </div>
              ))}
            
              {/* Empty cells for days of week before the first day of month */}
              {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 p-1 border bg-background"></div>
              ))}
            
              {/* Calendar days */}
              {getMonthDays().map((day, idx) => {
                const hasEvents = hasMeetingOnDate(day);
                const meetingsForDay = getMeetingsForDate(day);
                return (
                  <motion.div
                    key={`calendar-day-${idx}`}
                    whileHover={{ scale: 1.03 }}
                    className={`h-24 p-1 bg-background rounded-md overflow-hidden cursor-pointer transition-colors
                      ${hasEvents ? 'border-primary/50 border hover:border-primary' : 'border'}`}
                    onClick={() => handleDateSelect(day)}
                  >
                    <div className="text-right mb-1">
                      <span className={`text-sm inline-block rounded-full w-6 h-6 text-center leading-6
                        ${format(day, 'dd') === format(new Date(), 'dd') && 
                          format(day, 'MM yyyy') === format(new Date(), 'MM yyyy') 
                          ? 'bg-primary text-white' : ''}`}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                    {hasEvents && (
                      <div className="mt-1">
                        {meetingsForDay.slice(0, 2).map((meeting, meetingIdx) => (
                          <div 
                            key={`meeting-preview-${meeting.id}-${meetingIdx}`} 
                            className="text-xs truncate px-2 py-1 mb-1 bg-primary text-primary-foreground rounded hover:bg-primary/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToMeetingDetails(meeting.id);
                            }}
                          >
                            {meeting.title}
                          </div>
                        ))}
                        {meetingsForDay.length > 2 && (
                          <div 
                            className="text-xs mt-1 text-center text-muted-foreground hover:text-primary"
                          >
                            +{meetingsForDay.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Meetings Dialog */}
      <Dialog open={isDayMeetingsDialogOpen} onOpenChange={setIsDayMeetingsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
              {selectedDate && `Meetings on ${format(selectedDate, 'EEEE, MMMM d, yyyy')}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {selectedDate && getMeetingsForDate(selectedDate).length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No meetings scheduled
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  There are no meetings scheduled for this day.
                </p>
                <Button 
                  onClick={() => {
                    setIsDayMeetingsDialogOpen(false);
                    setNewMeeting({
                      ...newMeeting,
                      date: format(selectedDate, 'yyyy-MM-dd')
                    });
                    setIsAddDialogOpen(true);
                  }}
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule a Meeting
                  
                </Button>
              </div>
            ) : (
              selectedDate && (
                <div className="space-y-4">
                  {/* Meeting count and quick actions */}
                  <div className="flex justify-between items-center pb-4 border-b">
                    <div className="text-sm text-muted-foreground">
                      {getMeetingsForDate(selectedDate).length} meeting(s) scheduled
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setIsDayMeetingsDialogOpen(false);
                        setNewMeeting({
                          ...newMeeting,
                          date: format(selectedDate, 'yyyy-MM-dd')
                        });
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Add Meeting
                    </Button>
                  </div>

                  {/* Meetings list */}
                  <div className="space-y-3">
                    {getMeetingsForDate(selectedDate)
                      .sort((a, b) => {
                        // Sort by start time
                        const aMinutes = convertTimeToMinutes(a.startTime);
                        const bMinutes = convertTimeToMinutes(b.startTime);
                        return aMinutes - bMinutes;
                      })
                      .map((meeting, idx) => (
                        <motion.div 
                          key={`day-meeting-${meeting.id}-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="border rounded-lg p-4 hover:border-primary hover:bg-muted/30 cursor-pointer transition-all duration-200 group"
                          onClick={() => {
                            setIsDayMeetingsDialogOpen(false);
                            navigateToMeetingDetails(meeting.id);
                          }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                {meeting.title}
                              </h3>
                              <div className="flex items-center mt-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                <Badge variant="outline" className="mr-2">
                                  {formatTimeDisplay(meeting.startTime)} - {formatTimeDisplay(meeting.endTime)}
                                </Badge>
                                <span className="text-xs">
                                  ({Math.round((convertTimeToMinutes(meeting.endTime) - convertTimeToMinutes(meeting.startTime)) / 60 * 10) / 10}h duration)
                                </span>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsDayMeetingsDialogOpen(false);
                                navigateToMeetingDetails(meeting.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-2 flex-shrink-0" />
                              <span className="truncate">{meeting.location}</span>
                            </div>
                            
                            <div className="flex items-center text-muted-foreground">
                              <Users className="h-3 w-3 mr-2 flex-shrink-0" />
                              <span>{meeting.participants.length} participant(s)</span>
                            </div>
                          </div>
                          
                          {meeting.note && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-start text-sm">
                                <Info className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0 text-muted-foreground" />
                                <p className="text-muted-foreground line-clamp-2">
                                  {meeting.note}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Participants preview */}
                          {meeting.participants.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs text-muted-foreground mb-2">Participants:</div>
                              <div className="flex flex-wrap gap-1">
                                {meeting.participants.slice(0, 3).map((participant, pIdx) => (
                                  <Badge 
                                    key={`participant-preview-${pIdx}`} 
                                    variant="secondary" 
                                    className="text-xs"
                                  >
                                    {participant.split('@')[0]}
                                  </Badge>
                                ))}
                                {meeting.participants.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{meeting.participants.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                  </div>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedMeeting?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedMeeting && (
            <div className="space-y-4 py-4">
              <div className="flex items-center text-sm">
                <CalendarIcon className="h-4 w-4 mr-2 text-white" />
                <span className="font-medium">Date:</span>
                <span className="ml-2">{format(parseISO(selectedMeeting.date), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              
              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">Time:</span>
                <span className="ml-2">
                  {formatTimeDisplay(selectedMeeting.startTime)} - {formatTimeDisplay(selectedMeeting.endTime)}
                </span>
              </div>
              
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">Location:</span>
                <span className="ml-2">{selectedMeeting.location}</span>
              </div>
              
              {selectedMeeting.note && (
                <div className="text-sm">
                  <div className="font-medium mb-1 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-primary" />
                    Note:
                  </div>
                  <div className="pl-6 text-muted-foreground whitespace-pre-wrap">
                    {selectedMeeting.note}
                  </div>
                </div>
              )}
              
              {selectedMeeting.participants.length > 0 && (
                <div className="text-sm">
                  <div className="font-medium mb-1 flex items-center">
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    Participants ({selectedMeeting.participants.length}):
                  </div>
                  <div className="pl-6 grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
                    {selectedMeeting.participants.map((email, idx) => (
                      <div key={`participant-${idx}`} className="text-xs px-2 py-1 bg-muted rounded-sm">
                        {email}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsDetailsDialogOpen(false);
              if (selectedMeeting) {
                navigateToMeetingDetails(selectedMeeting.id);
              }
            }}>
              View Full Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Meeting Dialog - Updated for 24-hour format */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetNewMeeting();
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Meeting</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title*
              </label>
              <div className="relative">
                <Input
                  id="title"
                  value={newMeeting.title}
                  onChange={(e) => {
                    setNewMeeting({ ...newMeeting, title: e.target.value });
                    // Clear error when user types
                    if (formErrors.title && e.target.value.trim().length >= 3) {
                      const { title, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  placeholder="Meeting title"
                  className={formErrors.title ? "border-destructive focus:border-destructive" : ""}
                />
                {formErrors.title && (
                  <div className="text-destructive text-xs mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {formErrors.title}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="date" className="text-sm font-medium">
                Date*
              </label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={newMeeting.date}
                  onChange={(e) => {
                    setNewMeeting({ ...newMeeting, date: e.target.value });
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Time*</label>
                <div className="flex gap-2 mt-1">
                  <Select
                    value={String(newMeeting.startTime.hour)}
                    onValueChange={(value) => {
                      const newHour = parseInt(value);
                      setNewMeeting({
                        ...newMeeting,
                        startTime: { ...newMeeting.startTime, hour: newHour }
                      });
                      
                      // Clear time errors if valid
                      if (formErrors.startTime || formErrors.endTime) {
                        const selectedDate = new Date(newMeeting.date);
                        const today = new Date();
                        
                        if (!isSameDay(selectedDate, today) || 
                            (newHour * 60 + newMeeting.startTime.minute) > (today.getHours() * 60 + today.getMinutes())) {
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
                      {getStartTimeHours().map(hour => (
                        <SelectItem key={`start-hour-${hour}`} value={String(hour)}>
                          {hour.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={String(newMeeting.startTime.minute)}
                    onValueChange={(value) => {
                      const newMinute = parseInt(value);
                      setNewMeeting({
                        ...newMeeting,
                        startTime: { ...newMeeting.startTime, minute: newMinute }
                      });
                      
                      // Clear time errors if valid
                      if (formErrors.startTime || formErrors.endTime) {
                        const selectedDate = new Date(newMeeting.date);
                        const today = new Date();
                        
                        if (!isSameDay(selectedDate, today) || 
                            (newMeeting.startTime.hour * 60 + newMinute) > (today.getHours() * 60 + today.getMinutes())) {
                          const { startTime, ...rest } = formErrors;
                          setFormErrors(rest);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className={formErrors.startTime ? "border-destructive" : ""}>
                      <SelectValue placeholder="Minute" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMinuteOptions().map(minute => (
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
                    value={String(newMeeting.endTime.hour)}
                    onValueChange={(value) => {
                      const newHour = parseInt(value);
                      setNewMeeting({
                        ...newMeeting,
                        endTime: { ...newMeeting.endTime, hour: newHour }
                      });
                      
                      // Clear time error if end time is now after start time
                      if (formErrors.endTime) {
                        const startMinutes = convertTimeToMinutes(newMeeting.startTime);
                        const newEndMinutes = convertTimeToMinutes({
                          ...newMeeting.endTime,
                          hour: newHour
                        });
                        
                        if (newEndMinutes > startMinutes) {
                          const { endTime, ...rest } = formErrors;
                          setFormErrors(rest);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className={formErrors.endTime ? "border-destructive" : ""}>
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEndTimeHours().map(hour => (
                        <SelectItem key={`end-hour-${hour}`} value={String(hour)}>
                          {hour.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={String(newMeeting.endTime.minute)}
                    onValueChange={(value) => {
                      const newMinute = parseInt(value);
                      setNewMeeting({
                        ...newMeeting,
                        endTime: { ...newMeeting.endTime, minute: newMinute }
                      });
                      
                      // Clear time error if end time is now after start time
                      if (formErrors.endTime) {
                        const startMinutes = convertTimeToMinutes(newMeeting.startTime);
                        const newEndMinutes = convertTimeToMinutes({
                          ...newMeeting.endTime,
                          minute: newMinute
                        });
                        
                        if (newEndMinutes > startMinutes) {
                          const { endTime, ...rest } = formErrors;
                          setFormErrors(rest);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className={formErrors.endTime ? "border-destructive" : ""}>
                      <SelectValue placeholder="Minute" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMinuteOptions().map(minute => (
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
            
            {/* Recurring Meeting Option */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isRecurring" 
                checked={newMeeting.isRecurring}
                onCheckedChange={(checked) => setNewMeeting({
                  ...newMeeting,
                  isRecurring: checked as boolean
                })}
              />
              <label
                htmlFor="isRecurring"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Make this a weekly recurring meeting for one month (creates 4 meetings)
              </label>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium">Location*</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(roomAvailability).map(room => (
                  <div
                    key={`room-option-${room}`}
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      newMeeting.location === room 
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
                      if (roomAvailability[room]) {
                        setNewMeeting({ ...newMeeting, location: room });
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
            
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="note" className="text-sm font-medium">
                Note (Optional)
              </label>
              <Textarea
                id="note"
                value={newMeeting.note}
                onChange={(e) => setNewMeeting({ ...newMeeting, note: e.target.value })}
                placeholder="Add a note for this meeting"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium">
                Participants ({newMeeting.participants.length})
              </label>
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
              {newMeeting.participants.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                    {newMeeting.participants.map((email, idx) => {
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
              ) : (
                <div className="text-xs text-muted-foreground mt-1">
                  {/* No participants added. Adding at least one participant is required. */}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              if (!isCreatingMeeting) { // Only allow cancel if not creating
                setIsAddDialogOpen(false);
                resetNewMeeting();
              }
            }}
            disabled={isCreatingMeeting} // Disable cancel button during creation
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            className="w-full sm:w-auto"
            onClick={handleCreateMeeting}
            disabled={isCreatingMeeting} // Disable button during creation
          >
            {isCreatingMeeting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Meeting...
              </>
            ) : (
              <>
                Create Meeting
              </>
            )}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
