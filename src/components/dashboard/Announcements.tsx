import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockAnnouncements, mockCurrentUser } from "@/lib/placeholder-data";
import { Button } from "../ui/button";
import { Pin, PinOff, PlusCircle } from "lucide-react";
import { Badge } from "../ui/badge";

export function Announcements() {
    const user = mockCurrentUser;
    const canManage = user.role === 'HR' || user.role === 'MD';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Announcements</CardTitle>
                {canManage && (
                    <Button variant="ghost" size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {mockAnnouncements.map((announcement) => (
                        <div key={announcement.id} className="flex items-start gap-4">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  {announcement.isPinned && <Badge variant="secondary" className="border-primary/50 text-primary">Pinned</Badge>}
                                  <p className="text-sm font-medium leading-none">{announcement.title}</p>
                                </div>
                                <p className="text-sm text-muted-foreground">{announcement.content}</p>
                            </div>
                            {canManage && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                    {announcement.isPinned ? <PinOff className="h-4 w-4 text-muted-foreground" /> : <Pin className="h-4 w-4 text-muted-foreground" />}
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
