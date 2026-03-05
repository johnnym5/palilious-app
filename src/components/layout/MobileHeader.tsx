'use client';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { Settings } from 'lucide-react';
import Link from 'next/link';

interface MobileHeaderProps {
    userProfile: UserProfile | null;
}

export function MobileHeader({ userProfile }: MobileHeaderProps) {
    if (!userProfile) return null;

    return (
        <header className="flex items-center justify-between p-4 sm:p-6">
            <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary">
                    <div className="relative">
                        <AvatarFallback className="text-xl">
                            {userProfile.fullName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                        <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    </div>
                </Avatar>
                <div>
                    <h1 className="text-xl font-bold font-headline text-foreground">
                        Welcome back, {userProfile.fullName.split(' ')[0]}
                    </h1>
                    <p className="text-sm text-muted-foreground">{userProfile.position}</p>
                </div>
            </div>
            <Button asChild variant="ghost" size="icon">
                <Link href="/profile">
                    <Settings className="h-6 w-6" />
                </Link>
            </Button>
        </header>
    )
}