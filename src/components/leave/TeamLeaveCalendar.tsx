'use client';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import type { LeaveRequest, LeaveType, UserProfile } from "@/lib/types";
import { collection, query, where } from "firebase/firestore";
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DayPicker, type DayContentProps } from 'react-day-picker';
import { eachDayOfInterval } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TeamLeaveCalendarProps {
  userProfile: UserProfile;
}

export function TeamLeaveCalendar({ userProfile }: TeamLeaveCalendarProps) {
  const firestore = useFirestore();
  const [month, setMonth] = useState<Date>(new Date());

  const approvedLeaveQuery = useMemoFirebase(() => {
    return query(
      collection(firestore, 'leave_requests'),
      where('orgId', '==', userProfile.orgId),
      where('status', '==', 'APPROVED')
    );
  }, [firestore, userProfile.orgId]);

  const { data: leaveRequests, isLoading } = useCollection<LeaveRequest>(approvedLeaveQuery);

  const leavesByDay = useMemo(() => {
    const days: Record<string, { userName: string; leaveType: LeaveType }[]> = {};
    if (!leaveRequests) return days;

    leaveRequests.forEach(req => {
      try {
        const interval = eachDayOfInterval({
          start: new Date(req.startDate),
          end: new Date(req.endDate)
        });
        
        interval.forEach(day => {
          const dayString = day.toISOString().split('T')[0];
          if (!days[dayString]) {
            days[dayString] = [];
          }
          days[dayString].push({ userName: req.userName, leaveType: req.leaveType });
        });
      } catch (e) {
        console.error("Invalid date range for leave request:", req.id, e);
      }
    });

    return days;
  }, [leaveRequests]);
  
  const onLeaveDays = useMemo(() => Object.keys(leavesByDay).map(dayStr => new Date(dayStr)), [leavesByDay]);

  function DayContent(props: DayContentProps) {
    const dayString = props.date.toISOString().split('T')[0];
    const leaves = leavesByDay[dayString];

    if (!leaves) return <>{props.date.getDate()}</>;

    return (
      <Popover>
        <PopoverTrigger className="w-full h-full flex items-center justify-center rounded-md">
          {props.date.getDate()}
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2 z-10" side="bottom" align="center">
          <div className="space-y-2">
            <p className="font-semibold text-sm">{props.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            {leaves.map((leave, index) => (
              <div key={index} className="text-sm flex justify-between items-center">
                <span className="font-medium">{leave.userName}</span>
                <Badge variant="secondary" className="capitalize text-xs">{leave.leaveType.toLowerCase()}</Badge>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="flex justify-center">
                <Skeleton className="h-80 w-[340px]" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Leave Calendar</CardTitle>
        <CardDescription>An overview of all approved leave requests across the organization.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <DayPicker
          showOutsideDays
          month={month}
          onMonthChange={setMonth}
          className="p-0"
          modifiers={{ onLeave: onLeaveDays }}
          modifiersClassNames={{ onLeave: 'bg-primary/20 rounded-md font-bold' }}
          components={{ 
            DayContent, 
            IconLeft: () => <ChevronLeft className="h-4 w-4" />, 
            IconRight: () => <ChevronRight className="h-4 w-4" /> 
          }}
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
            day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
            day_today: "bg-accent text-accent-foreground",
            day_outside: "day-outside text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-50",
            day_hidden: "invisible",
          }}
        />
      </CardContent>
    </Card>
  )
}
