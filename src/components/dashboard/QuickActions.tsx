import Link from "next/link";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { CalendarCheck2, FilePlus2, ListTodo } from "lucide-react";

export default function QuickActions() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Your most common tasks, just a click away.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/attendance" passHref>
                    <Button variant="outline" size="lg" className="flex-col h-auto py-4 w-full">
                        <CalendarCheck2 className="h-6 w-6 mb-2 text-primary"/>
                        <span className="font-semibold">Attendance</span>
                    </Button>
                </Link>
                 <Link href="/requisitions" passHref>
                    <Button variant="outline" size="lg" className="flex-col h-auto py-4 w-full">
                        <FilePlus2 className="h-6 w-6 mb-2 text-primary"/>
                        <span className="font-semibold">New Requisition</span>
                    </Button>
                </Link>
                <Link href="/tasks" passHref>
                    <Button variant="outline" size="lg" className="flex-col h-auto py-4 w-full">
                        <ListPlus className="h-6 w-6 mb-2 text-primary"/>
                        <span className="font-semibold">Add a Task</span>
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
