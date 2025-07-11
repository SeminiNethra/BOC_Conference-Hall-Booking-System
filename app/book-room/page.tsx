'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO, addWeeks, isBefore, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Calendar, Clock, MapPin, Users, X, Info, 
  Check, CheckCircle2, AlertCircle, Loader2, Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

export default function BookRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Extract query parameters
  const dateParam = searchParams.get('date');
  const timeParam = searchParams.get('time');
  const roomParam = searchParams.get('room');
  
  // State for form and processing
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Store last booking date for "Schedule Another Meeting"
  const [lastBookingDate, setLastBookingDate] = useState(dateParam || format(new Date(), 'yyyy-MM-dd'));
  
  // Form state - Updated to 24-hour format
  const [meeting, setMeeting] = useState({
    title: '',
    date: dateParam || format(new Date(), 'yyyy-MM-dd'),
    startTime: { hour: 8, minute: 0 },
    endTime: { hour: 9, minute: 0 },
    location: roomParam === 'roomA' ? 'Room A' : roomParam === 'roomB' ? 'Room B' : '',
    note: '',
    participants: [] as string[],
    createdBy: '',
    isRecurring: false
  });
  
  const [participant, setParticipant] = useState('');
  const [participantConflicts, setParticipantConflicts] = useState<Record<string, string[]>>({});
  const [roomAvailability, setRoomAvailability] = useState<Record<string, boolean>>({
    'Room A': true,
    'Room B': true
  });

  // Get user email from localStorage when component mounts
  useEffect(() => {
    try {
      const userString = localStorage.getItem("user");
      if (userString) {
        const user = JSON.parse(userString);
        setMeeting(prev => ({
          ...prev,
          createdBy: user.email || 'admin@boc.com'
        }));
      }
    } catch (error) {
      console.error('Error getting user from localStorage:', error);
    }
  }, []);

  // Parse time parameter - Updated for 24-hour format
  useEffect(() => {
    if (timeParam) {
      const [hours, minutes] = timeParam.split(':').map(Number);
      
      // Validate hours are within business hours
      const validHour = Math.max(8, Math.min(16, hours));
      
      setMeeting(prev => ({
        ...prev,
        startTime: { hour: validHour, minute: minutes || 0 },
        endTime: { hour: Math.min(17, validHour + 1), minute: minutes || 0 }
      }));
    }
  }, [timeParam]);

  // Check availability when meeting details change
  useEffect(() => {
    if (meeting.date && meeting.startTime && meeting.endTime && meeting.participants.length > 0) {
      checkAvailability();
    } else if (meeting.date && meeting.startTime && meeting.endTime) {
      checkRoomAvailability();
    }
  }, [meeting.date, meeting.startTime, meeting.endTime, meeting.participants]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };
  
  const successVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 25 
      }
    }
  };

  // Function to open calendar picker
  const openCalendar = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker();
    }
  };

  // Check if date/time is in the past
  const isDateTimeInPast = (date: string, hour: number, minute: number): boolean => {
    const meetingDateTime = new Date(date);
    meetingDateTime.setHours(hour, minute, 0, 0);
    return isBefore(meetingDateTime, new Date());
  };

  // Check room availability without participants
  const checkRoomAvailability = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/meetings/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: meeting.date,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          participants: [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRoomAvailability(data.roomAvailability);
        
        if (meeting.location && !data.roomAvailability[meeting.location]) {
          toast({
            title: 'Room Conflict',
            description: `${meeting.location} is no longer available for the selected time`,
            status: 'warning'
          });
        }
      }
    } catch (error) {
      console.error('Error checking room availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAvailability = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/meetings/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: meeting.date,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          participants: meeting.participants,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRoomAvailability(data.roomAvailability);
        setParticipantConflicts(data.participantConflicts);
        
        if (meeting.location && !data.roomAvailability[meeting.location]) {
          toast({
            title: 'Room Conflict',
            description: `${meeting.location} is no longer available for the selected time`,
            status: 'warning'
          });
        }
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to check availability',
        status: 'error'
      });
    } finally {
      setIsLoading(false);
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
    setFormErrors(newErrors);
    
    if (!validateEmail(participant)) {
      setFormErrors({...newErrors, participant: 'Please enter a valid email address'});
      return;
    }
    
    if (meeting.participants.includes(participant)) {
      setFormErrors({...newErrors, participant: 'This participant is already added'});
      setParticipant('');
      return;
    }
    
    setMeeting({
      ...meeting,
      participants: [...meeting.participants, participant],
    });
    setParticipant('');
  };

  const handleRemoveParticipant = (email: string) => {
    setMeeting({
      ...meeting,
      participants: meeting.participants.filter(p => p !== email),
    });
    
    const newConflicts = {...participantConflicts};
    delete newConflicts[email];
    setParticipantConflicts(newConflicts);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!meeting.title.trim()) {
      errors.title = 'Meeting title is required';
    }
    
    if (!meeting.location) {
      errors.location = 'Please select a room';
    } else if (!roomAvailability[meeting.location]) {
      errors.location = `${meeting.location} is not available at the selected time`;
    }
    
    // Check if date is in the past
    const selectedDate = new Date(meeting.date);
    const today = startOfDay(new Date());
    if (isBefore(selectedDate, today)) {
      errors.date = 'Cannot book meetings for past dates';
    }
    
    // Check if start time is in the past (for today's bookings)
    if (meeting.date === format(new Date(), 'yyyy-MM-dd')) {
      if (isDateTimeInPast(meeting.date, meeting.startTime.hour, meeting.startTime.minute)) {
        errors.time = 'Cannot book meetings for past times';
      }
    }
    
    // Validate business hours
    if (meeting.startTime.hour < 8 || meeting.startTime.hour > 16) {
      errors.startTime = 'Start time must be between 8:00 and 16:00';
    }
    
    if (meeting.endTime.hour < 8 || meeting.endTime.hour > 17) {
      errors.endTime = 'End time must be between 8:00 and 17:00';
    }
    
    // Check if end time is after start time
    const startMinutes = meeting.startTime.hour * 60 + meeting.startTime.minute;
    const endMinutes = meeting.endTime.hour * 60 + meeting.endTime.minute;
    
    if (endMinutes <= startMinutes) {
      errors.time = 'End time must be after start time';
    }
    
    // Validate minutes are in 15-minute intervals
    if (![0, 15, 30, 45].includes(meeting.startTime.minute)) {
      errors.startTime = 'Start time minutes must be 00, 15, 30, or 45';
    }
    
    if (![0, 15, 30, 45].includes(meeting.endTime.minute)) {
      errors.endTime = 'End time minutes must be 00, 15, 30, or 45';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please correct the errors in the form',
        status: 'error'
      });
      return;
    }
    
    // Check for conflicts
    const participantsWithConflicts = Object.entries(participantConflicts)
      .filter(([email, conflicts]) => conflicts && conflicts.length > 0);
    
    if (participantsWithConflicts.length > 0) {
      const conflictDetails = participantsWithConflicts.map(([email, conflicts]) => 
        `${email} has conflict with: ${conflicts.join(', ')}`
      ).join('\n');
      
      toast({
        title: 'Participant Conflicts Detected',
        description: `Some participants have conflicting meetings. Review before continuing.`,
        status: 'warning',
        action: {
          label: 'View Details',
          onClick: () => {
            alert(`Conflict Details:\n\n${conflictDetails}`);
          }
        },
        duration: 10000
      });
      
      if (!confirm("Some participants have existing meetings during this time period. Continue anyway?")) {
        return;
      }
    }
    
    setLastBookingDate(meeting.date);
    
    try {
      setIsSubmitting(true);
      
      if (meeting.isRecurring) {
        const baseDate = new Date(meeting.date);
        const meetingsToCreate = [];
        
        for (let i = 0; i < 4; i++) {
          const meetingDate = i === 0 ? baseDate : addWeeks(baseDate, i);
          
          meetingsToCreate.push({
            ...meeting,
            date: format(meetingDate, 'yyyy-MM-dd'),
            isRecurring: false
          });
        }
        
        let createdCount = 0;
        for (const meetingToCreate of meetingsToCreate) {
          const { isRecurring, ...meetingData } = meetingToCreate;
          
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
        
        toast({
          title: 'Success',
          description: `Created ${createdCount} recurring meetings`,
          status: 'success'
        });
        
        setFormSubmitted(true);
      } else {
        const { isRecurring, ...meetingData } = meeting;
        
        const response = await fetch('/api/meetings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(meetingData),
                  });
        
        if (response.ok) {
          toast({
            title: 'Success',
            description: 'Meeting created successfully',
            status: 'success'
          });
          setFormSubmitted(true);
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create meeting');
        }
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        status: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time for display - Updated for 24-hour format
  const formatTimeDisplay = (time: { hour: number; minute: number }) => {
    return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  };

  // Function to reset form for "Schedule Another Meeting"
  const resetFormForNewMeeting = () => {
    setFormSubmitted(false);
    setMeeting({
      title: '',
      date: lastBookingDate,
      startTime: { hour: 8, minute: 0 },
      endTime: { hour: 9, minute: 0 },
      location: '',
      note: '',
      participants: [],
      createdBy: meeting.createdBy,
      isRecurring: false
    });
    setParticipant('');
    setFormErrors({});
    setParticipantConflicts({});
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back button */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Button 
          variant="ghost" 
          onClick={() => router.push('/dashboard')}
          className="group flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Dashboard
        </Button>
      </motion.div>
      
      {!formSubmitted ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Card className="border-2 border-primary/10 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-8">
                <CardTitle className="text-3xl font-bold flex items-center text-primary">
                  <Calendar className="mr-3 h-6 w-6" />
                  Book a Meeting Room
                </CardTitle>
                <CardDescription className="text-lg mt-2">
                  Complete the form below to schedule your meeting
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 pb-2">
                <div className="grid gap-6">
                  {/* Selected time information */}
                  <motion.div 
                    variants={itemVariants}
                    className="bg-muted/50 p-4 rounded-lg flex flex-wrap gap-4 items-center"
                  >
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-primary mr-2" />
                      <span className="font-medium">Date:</span>
                      <span className="ml-2">
                        {meeting.date ? format(parseISO(meeting.date), 'EEEE, MMMM d, yyyy') : 'Select a date'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-primary mr-2" />
                      <span className="font-medium">Time:</span>
                      <span className="ml-2">
                        {formatTimeDisplay(meeting.startTime)} - {formatTimeDisplay(meeting.endTime)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Building className="h-5 w-5 text-primary mr-2" />
                      <span className="font-medium">Selected Room:</span>
                      <span className="ml-2">{meeting.location || 'None selected'}</span>
                    </div>
                  </motion.div>
                  
                  {/* Meeting title */}
                  <motion.div variants={itemVariants}>
                    <label htmlFor="title" className="text-sm font-medium block mb-2">
                      Meeting Title*
                    </label>
                    <Input
                      id="title"
                      value={meeting.title}
                      onChange={(e) => {
                        setMeeting({ ...meeting, title: e.target.value });
                        if (formErrors.title) {
                          const newErrors = {...formErrors};
                          delete newErrors.title;
                          setFormErrors(newErrors);
                        }
                      }}
                      placeholder="Enter a descriptive title for your meeting"
                      className={formErrors.title ? "border-destructive" : ""}
                    />
                    {formErrors.title && (
                      <div className="text-destructive text-xs mt-1">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        {formErrors.title}
                      </div>
                    )}
                  </motion.div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Date selection with calendar button */}
                    <motion.div variants={itemVariants}>
                      <label htmlFor="date" className="text-sm font-medium block mb-2">
                        Date*
                      </label>
                      <div className="relative flex">
                        <Input
                          ref={dateInputRef}
                          id="date"
                          type="date"
                          value={meeting.date}
                          onChange={(e) => {
                            setMeeting({ ...meeting, date: e.target.value });
                            if (formErrors.date) {
                              const newErrors = {...formErrors};
                              delete newErrors.date;
                              setFormErrors(newErrors);
                            }
                          }}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className={`w-full pr-12 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden ${formErrors.date ? "border-destructive" : ""}`}
                          style={{
                            colorScheme: 'light'
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={openCalendar}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                        >
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      {formErrors.date && (
                        <div className="text-destructive text-xs mt-1">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {formErrors.date}
                        </div>
                      )}
                    </motion.div>
                    
                    {/* Recurring option */}
                    <motion.div variants={itemVariants} className="flex items-center space-x-2 mt-8">
                      <Checkbox 
                        id="isRecurring" 
                        checked={meeting.isRecurring}
                        onCheckedChange={(checked) => setMeeting({
                          ...meeting,
                          isRecurring: checked as boolean
                        })}
                      />
                      <label
                        htmlFor="isRecurring"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Make this a weekly recurring meeting for one month (4 meetings)
                      </label>
                    </motion.div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Start time - Updated for 24-hour format */}
                    <motion.div variants={itemVariants}>
                      <label className="text-sm font-medium block mb-2">
                        Start Time* 
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={String(meeting.startTime.hour)}
                          onValueChange={(value) => {
                            setMeeting({
                              ...meeting,
                              startTime: { ...meeting.startTime, hour: parseInt(value) }
                            });
                            if (formErrors.startTime || formErrors.time) {
                              const newErrors = {...formErrors};
                              delete newErrors.startTime;
                              delete newErrors.time;
                              setFormErrors(newErrors);
                            }
                          }}
                        >
                          <SelectTrigger className={`flex-1 ${formErrors.startTime ? "border-destructive" : ""}`}>
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 9 }, (_, i) => i + 8).map(hour => (
                              <SelectItem key={hour} value={String(hour)}>
                                {hour.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={String(meeting.startTime.minute)}
                          onValueChange={(value) => {
                            setMeeting({
                              ...meeting,
                              startTime: { ...meeting.startTime, minute: parseInt(value) }
                            });
                            if (formErrors.startTime || formErrors.time) {
                              const newErrors = {...formErrors};
                              delete newErrors.startTime;
                              delete newErrors.time;
                              setFormErrors(newErrors);
                            }
                          }}
                        >
                          <SelectTrigger className={`flex-1 ${formErrors.startTime ? "border-destructive" : ""}`}>
                            <SelectValue placeholder="Minute" />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 15, 30, 45].map(minute => (
                              <SelectItem key={minute} value={String(minute)}>
                                {minute.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {formErrors.startTime && (
                        <div className="text-destructive text-xs mt-1">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {formErrors.startTime}
                        </div>
                      )}
                      {formErrors.time && (
                        <div className="text-destructive text-xs mt-1">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {formErrors.time}
                        </div>
                      )}
                    </motion.div>
                    
                    {/* End time - Updated for 24-hour format */}
                    <motion.div variants={itemVariants}>
                      <label className="text-sm font-medium block mb-2">
                        End Time* 
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={String(meeting.endTime.hour)}
                          onValueChange={(value) => {
                            setMeeting({
                              ...meeting,
                              endTime: { ...meeting.endTime, hour: parseInt(value) }
                            });
                            if (formErrors.endTime || formErrors.time) {
                              const newErrors = {...formErrors};
                              delete newErrors.endTime;
                              delete newErrors.time;
                              setFormErrors(newErrors);
                            }
                          }}
                        >
                          <SelectTrigger className={`flex-1 ${formErrors.endTime ? "border-destructive" : ""}`}>
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => i + 8).map(hour => (
                              <SelectItem key={hour} value={String(hour)}>
                                {hour.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={String(meeting.endTime.minute)}
                          onValueChange={(value) => {
                            setMeeting({
                              ...meeting,
                              endTime: { ...meeting.endTime, minute: parseInt(value) }
                            });
                            if (formErrors.endTime || formErrors.time) {
                              const newErrors = {...formErrors};
                              delete newErrors.endTime;
                              delete newErrors.time;
                              setFormErrors(newErrors);
                            }
                          }}
                        >
                          <SelectTrigger className={`flex-1 ${formErrors.endTime ? "border-destructive" : ""}`}>
                            <SelectValue placeholder="Minute" />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 15, 30, 45].map(minute => (
                              <SelectItem key={minute} value={String(minute)}>
                                {minute.toString().padStart(2, '0')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {formErrors.endTime && (
                        <div className="text-destructive text-xs mt-1">
                          <AlertCircle className="h-3 w-3 inline mr-1" />
                          {formErrors.endTime}
                        </div>
                      )}
                    </motion.div>
                  </div>
                  
                  {/* Room selection */}
                  <motion.div variants={itemVariants}>
                    <label className="text-sm font-medium block mb-2">
                      Room Selection*
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(roomAvailability).map(([room, isAvailable]) => (
                        <div
                          key={room}
                          className={`
                            border-2 rounded-xl p-4 transition-all duration-200
                            ${meeting.location === room 
                              ? 'border-primary bg-primary/10 shadow-md' 
                              : 'border-muted-foreground/20'}
                            ${!isAvailable 
                              ? 'opacity-50 bg-muted cursor-not-allowed' 
                              : 'cursor-pointer'}
                            ${formErrors.location ? 'border-destructive' : ''}

                                    `}
                          onClick={() => {
                            if (isAvailable) {
                              setMeeting({ ...meeting, location: room });
                              
                              // Clear location error
                              if (formErrors.location) {
                                const newErrors = {...formErrors};
                                delete newErrors.location;
                                setFormErrors(newErrors);
                              }
                            }
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <Building className="h-5 w-5 mr-2 text-primary" />
                              <span className="font-medium">{room}</span>
                            </div>
                            <Badge 
                              variant={isAvailable ? "default" : "destructive"}
                              className={`
                                ${isAvailable 
                                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                                  : 'bg-destructive text-destructive-foreground'}
                              `}
                            >
                              {isAvailable ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    {formErrors.location && (
                      <div className="text-destructive text-xs mt-1">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        {formErrors.location}
                      </div>
                    )}
                  </motion.div>                  
                  
                  {/* Meeting note */}
                  <motion.div variants={itemVariants}>
                    <label htmlFor="note" className="text-sm font-medium block mb-2">
                      Meeting Notes (Optional)
                    </label>
                    <Textarea
                      id="note"
                      value={meeting.note}
                      onChange={(e) => setMeeting({ ...meeting, note: e.target.value })}
                      placeholder="Add any additional notes or agenda items"
                      className="w-full"
                      rows={4}
                    />
                  </motion.div>
                  
                  {/* Participants */}
                  <motion.div variants={itemVariants}>
                    <label className="text-sm font-medium block mb-2">
                      Participants ({meeting.participants.length})
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={participant}
                        onChange={(e) => {
                          setParticipant(e.target.value);
                          if (formErrors.participant) {
                            const newErrors = {...formErrors};
                            delete newErrors.participant;
                            setFormErrors(newErrors);
                          }
                        }}
                        placeholder="Enter email address"
                        className={formErrors.participant ? "border-destructive" : ""}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddParticipant();
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        onClick={handleAddParticipant}
                        variant="outline"
                        className="shrink-0"
                      >
                        Add
                      </Button>
                    </div>
                    {formErrors.participant && (
                      <div className="text-destructive text-xs mt-1">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        {formErrors.participant}
                      </div>
                    )}
                    
                    {formErrors.participants && (
                      <div className="text-destructive text-xs mt-1">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        {formErrors.participants}
                      </div>
                    )}
                    
                    {/* Participant list */}
                    {meeting.participants.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {meeting.participants.map((email, idx) => {
                          const hasConflict = participantConflicts[email] && participantConflicts[email].length > 0;
                          return (
                            <Badge 
                              key={idx} 
                              variant={hasConflict ? "destructive" : "secondary"}
                              className="px-3 py-1.5 text-sm flex items-center gap-1"
                            >
                              <Users className="h-3 w-3 mr-1" />
                              {email}
                              <button 
                                className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => handleRemoveParticipant(email)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                              {hasConflict && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="ml-1">
                                        <AlertCircle className="h-3 w-3 text-destructive-foreground" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>This participant has conflicting meetings:</p>
                                      <ul className="list-disc ml-4 mt-1 text-xs">
                                        {participantConflicts[email].map((conflict, idx) => (
                                          <li key={idx}>{conflict}</li>
                                        ))}
                                      </ul>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-4 pt-4 pb-6">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </Button>
                <Button 
                  className="w-full sm:w-auto"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Meeting...
                    </>
                  ) : (
                    <>
                      Schedule Meeting
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      ) : (
        /* Success screen */
        <motion.div
          variants={successVariants}
          initial="hidden"
          animate="visible"
          className="max-w-md mx-auto"
        >
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader className="bg-green-200 pb-8">
              <div className="mx-auto bg-green-500 text-white p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold text-center text-green-700">
                Meeting Scheduled Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-2 text-center">
              <p className="mb-4">
                Your meeting has been created and notifications have been sent to all participants.
              </p>
              
              <div className="bg-muted/40 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="h-5 w-5 text-primary mr-2" />
                  <span className="font-medium">{meeting.title}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {meeting.date ? format(parseISO(meeting.date), 'EEEE, MMMM d, yyyy') : ''} | 
                  {formatTimeDisplay(meeting.startTime)} - {formatTimeDisplay(meeting.endTime)} | 
                  {meeting.location}
                </div>
                
                {meeting.isRecurring && (
                  <Badge className="mt-3 bg-primary/20 text-primary border-primary/20 hover:bg-primary/30">
                    Recurring (4 weeks)
                  </Badge>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-2 pb-6">
              <Button 
                onClick={() => router.push('/dashboard')} 
                className="w-full"
              >
                Return to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={resetFormForNewMeeting}
                className="w-full"
              >
                Schedule Another Meeting
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
