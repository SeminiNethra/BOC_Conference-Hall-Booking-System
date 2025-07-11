import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { MeetingDocument } from '@/models/Meeting';
import { motion } from 'framer-motion';

interface MeetingCardProps {
  meeting: MeetingDocument;
  onClick?: () => void;
}

export function MeetingCard({ meeting, onClick }: MeetingCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{meeting.title}</CardTitle>
            <Badge variant={meeting.location === 'Room A' ? 'default' : 'secondary'}>
              {meeting.location}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="mr-2 h-4 w-4" />
              <span>{formatDate(new Date(meeting.date))}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-2 h-4 w-4" />
              <span>{meeting.startTime} - {meeting.endTime}</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="mr-2 h-4 w-4" />
              <span>{meeting.participants.length} participants</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
