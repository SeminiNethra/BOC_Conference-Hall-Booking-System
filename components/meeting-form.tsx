import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { X, Plus, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MeetingDocument } from '@/models/Meeting';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  location: z.enum(['Room A', 'Room B']),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Please select a valid date',
  }),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Use format HH:MM'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Use format HH:MM'),
  notes: z.string().optional(),
  participants: z.array(
    z.string().email('Invalid email address')
  ).min(1, 'Add at least one participant'),
});

type FormValues = z.infer<typeof formSchema>;

interface MeetingFormProps {
  initialData?: MeetingDocument;
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel: () => void;
}

export function MeetingForm({ initialData, onSubmit, onCancel }: MeetingFormProps) {
    const { successt, errort, warningt, infot, dismissAll } = useToast()
    const [newParticipant, setNewParticipant] = useState('');
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    message: string;
    participants?: string[];
  }>({ open: false, message: '' });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      date: new Date(initialData.date).toISOString().split('T')[0],
    } : {
      title: '',
      location: 'Room A',
      date: '',
      startTime: '',
      endTime: '',
      notes: '',
      participants: [],
    },
  });
  
  const participants = form.watch('participants');
  
  const addParticipant = () => {
    if (!newParticipant) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newParticipant)) {
      errort({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
      });
      return;
    }
    
    if (participants.includes(newParticipant)) {
      errort({
        title: 'Duplicate email',
        description: 'This participant is already added',
      });
      return;
    }
    
    form.setValue('participants', [...participants, newParticipant]);
    setNewParticipant('');
  };
  
  const removeParticipant = (email: string) => {
    form.setValue('participants', participants.filter(p => p !== email));
  };
  
  const handleFormSubmit = async (values: FormValues) => {
    try {
      await onSubmit(values);
    } catch (error: any) {
      if (error.participants) {
        setErrorDialog({
          open: true,
          message: 'Some participants have scheduling conflicts:',
          participants: error.participants,
        });
      } else {
        errort({
          title: 'Error',
          description: error.message || 'Something went wrong',
        });
      }
    }
  };
  
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meeting Title</FormLabel>
                <FormControl>
                  <Input placeholder="Quarterly Review" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a room" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Room A">Room A</SelectItem>
                      <SelectItem value="Room B">Room B</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-white" />
                      <Input
                        type="date"
                        className="pl-10 text-slate-200"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time (24h format)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="09:00"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time (24h format)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="10:00"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Meeting agenda, requirements, etc."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="participants"
            render={() => (
              <FormItem>
                <FormLabel>Participants</FormLabel>
                <div className="flex flex-col space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="email@example.com"
                      value={newParticipant}
                      onChange={(e) => setNewParticipant(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      onClick={addParticipant}
                      size="icon"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {participants.map((email) => (
                        <motion.div
                          key={email}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center bg-secondary text-secondary-foreground rounded-full px-3 py-1">
                            <span className="text-sm mr-1">{email}</span>
                            <button
                              type="button"
                              onClick={() => removeParticipant(email)}
                              className="text-secondary-foreground/70 hover:text-secondary-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  {participants.length === 0 && (
                    <p className="text-sm text-muted-foreground">No participants added yet</p>
                  )}
                  
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          
          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? 'Update Meeting' : 'Create Meeting'}
            </Button>
          </div>
        </form>
      </Form>
      
      <Dialog open={errorDialog.open} onOpenChange={() => setErrorDialog({ open: false, message: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scheduling Conflict</DialogTitle>
            <DialogDescription>{errorDialog.message}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {errorDialog.participants?.map((email) => (
              <div key={email} className="flex items-center p-2 rounded-md bg-destructive/10">
                <span>{email}</span>
              </div>
            ))}
            <p className="text-sm text-muted-foreground pt-2">
              These participants have conflicting meetings during the selected time.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
