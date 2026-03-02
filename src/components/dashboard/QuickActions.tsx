import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Clock, FilePlus2, ListPlus } from "lucide-react";

export default function QuickActions() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Your most common tasks, just a click away.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button variant="outline" size="lg" className="flex-col h-auto py-4">
                    <Clock className="h-6 w-6 mb-2 text-primary"/>
                    <span className="font-semibold">Clock In/Out</span>
                </Button>
                <Button variant="outline" size="lg" className="flex-col h-auto py-4">
                    <FilePlus2 className="h-6 w-6 mb-2 text-primary"/>
                    <span className="font-semibold">New Requisition</span>
                </Button>
                <Button variant="outline" size="lg" className="flex-col h-auto py-4">
                    <ListPlus className="h-6 w-6 mb-2 text-primary"/>
                    <span className="font-semibold">Add a Task</span>
                </Button>
            </CardContent>
        </Card>
    );
}
