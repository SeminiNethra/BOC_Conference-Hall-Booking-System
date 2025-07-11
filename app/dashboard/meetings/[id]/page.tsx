'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast'
import { MeetingForm } from '@/components/meeting-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate, formatTime } from '@/lib/utils';
import { MeetingDocument } from '@/models/Meeting';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Mail,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function MeetingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  
  const router = useRouter();
  const { data: session, status } = useSession();
  const { successt, errort, warningt, infot, dismissAll } = useToast()
  
  const [meeting, setMeeting] = useState<MeetingDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  useEffect(() => {
    // Check authentication
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchMeeting();
    }
  }, [status, router, id]);
  
  const fetchMeeting = async () => {
    try {
      const response = await fetch(`/api/meetings/${id}`);
      
      if (!response.ok) {
        throw new Error('Meeting not found');
      }
      
      const data = await response.json();
      setMeeting(data);
    } catch (error) {
      errort({
        title: 'Error',
        description: 'Failed to fetch meeting details',
      });
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateMeeting = async (formData: any) => {
    try {
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        if (error.participants) {
          throw { ...error, message: 'Participant scheduling conflict' };
        }
        throw new Error(error.error || 'Failed to update meeting');
      }
      
      const updatedMeeting = await response.json();
      setMeeting(updatedMeeting);
      setIsEditFormOpen(false);
      
      successt({
        title: 'Success',
        description: 'Meeting updated successfully',
      });
    } catch (error: any) {
      if (error.participants) {
        throw error;
      }
      
      errort({
        title: 'Error',
        description: error.message || 'Something went wrong',
      });
    }
  };
  
  const handleDeleteMeeting = async () => {
    try {
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel meeting');
      }
      
      successt({
        title: 'Success',
        description: 'Meeting cancelled successfully',
      });
      
      router.push('/dashboard');
    } catch (error) {
      errort({
        title: 'Error',
        description: 'Failed to cancel meeting',
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!meeting) {
    return (
      <div className="container mx-auto p-4 py-8">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <h3 className="text-lg font-medium">Meeting not found</h3>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">{meeting.title}</CardTitle>
                  <CardDescription>Meeting Details</CardDescription>
                </div>
                <Badge variant={meeting.location === 'Room A' ? 'default' : 'secondary'}>
                  {meeting.location}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p>{formatDate(new Date(meeting.date))}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p>{meeting.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Participants</p>
                    <p>{meeting.participants.length} people</p>
                  </div>
                </div>
              </div>
              
              {meeting.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-medium mb-2">Notes</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{meeting.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditFormOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Cancel Meeting
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Participants</CardTitle>
              <CardDescription>
                {meeting.participants.length} {meeting.participants.length === 1 ? 'person' : 'people'} attending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {meeting.participants.map((email: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>{String(email).substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{email}</p>
                    </div>
                  </div>
                ))}              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => setIsEditFormOpen(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Edit Participants
              </Button>
            </CardFooter>
          </Card>
        </div>
      </motion.div>
      
      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
          </DialogHeader>
          <MeetingForm 
            initialData={meeting}
            onSubmit={handleUpdateMeeting}
            onCancel={() => setIsEditFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Meeting</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this meeting? All participants will be notified via email.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center p-4 bg-destructive/10 rounded-md">
            <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
            <p className="text-sm text-destructive">This will send cancellation emails to all participants.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Keep Meeting
            </Button>
            <Button variant="destructive" onClick={handleDeleteMeeting}>
              Cancel Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}