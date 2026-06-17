'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  ChevronRight, 
  Loader2
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { userAtom } from '@/store/auth.atom';
import { studyGroupApi } from '@/services/study-group/study-group.api';
import { ROUTES } from '@mezon-tutors/shared';
import { 
  Button, 
  Card, 
  Avatar, 
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  Badge,
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface GroupCardProps {
  id: string;
  title: string;
  membersCount: number;
  members: any[];
  role: string;
  tutorId?: string | null;
}

const GroupCard = ({ 
  id,
  title, 
  membersCount, 
  members,
  role,
  tutorId
}: GroupCardProps) => {
  const t = useTranslations('Groups.card');
  const router = useRouter();
  const isLeader = role === 'Leader';
  const canBook = isLeader && !!tutorId && membersCount >= 2;
  const showBookingButton = isLeader && !!tutorId;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canBook) {
      router.push(`${ROUTES.CHECKOUT.SUBSCRIPTION_PLAN}?tutorId=${tutorId}&groupId=${id}`);
    }
  };

  return (
    <Card 
      onClick={() => router.push(`${ROUTES.DASHBOARD.GROUPS}/${id}`)}
      className="relative p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group border-border/50 overflow-hidden rounded-3xl cursor-pointer"
    >
      <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/10 group-hover:bg-primary transition-colors duration-300" />
      
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900 truncate flex-1">{title}</h3>
          <Badge variant="secondary" className="bg-gray-50 text-gray-500 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border-none shrink-0">
            {role === 'Leader' ? t('leader') : t('member')}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
          <Users className="w-4 h-4" />
          <span>{t('membersCount', { count: membersCount })}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
        <AvatarGroup>
          {members.slice(0, 3).map((member, i) => {
            const name = member.user?.username || '?';
            const initials = name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part: string) => part[0]?.toUpperCase())
              .join("") || "?";
            
            return (
              <Avatar key={i} className="border-2 border-white">
                <AvatarImage src={member.user?.avatar} alt={name} />
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-[10px] font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            );
          })}
          {membersCount > 3 && (
            <AvatarGroupCount className="text-[10px]">
              +{membersCount - 3}
            </AvatarGroupCount>
          )}
        </AvatarGroup>
        
        {showBookingButton ? (
          <button 
            onClick={handleSelect}
            disabled={!canBook}
            className={cn(
              "font-bold text-sm flex items-center gap-1.5 transition-all",
              canBook
                ? "text-primary hover:gap-2.5 group-hover:translate-x-1"
                : "text-gray-400 cursor-not-allowed"
            )}
          >
            {t('selectForBooking')}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); router.push(`${ROUTES.DASHBOARD.GROUPS}/${id}`); }}
            className="text-gray-500 font-bold text-sm flex items-center gap-1.5 transition-all hover:gap-2.5 hover:text-primary"
          >
            {t('viewDetails')}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {showBookingButton && membersCount < 2 && (
        <p className="mt-3 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          {t('minMembersWarning')}
        </p>
      )}
    </Card>
  );
};

export const StudyGroupsView = () => {
  const t = useTranslations('Groups');
  const router = useRouter();
  const searchParams = useSearchParams();
  const tutorId = searchParams.get('tutorId');
  const user = useAtomValue(userAtom);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const data = await studyGroupApi.list();
      setGroups(data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const newGroup = await studyGroupApi.create(t('newGroupPlaceholder'));
      router.push(`${ROUTES.DASHBOARD.GROUPS}/${newGroup.id}`);
    } catch (error) {
      console.error('Failed to create group:', error);
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-12">
      {/* Breadcrumb & Header */}
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-500">
          <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => router.push(ROUTES.DASHBOARD.INDEX)}>{t('breadcrumb.dashboard')}</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">{t('breadcrumb.groups')}</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 lg:text-5xl">
              {t('title')}
            </h1>
            <p className="text-lg text-gray-500 font-medium">
              {t('description')}
            </p>
          </div>
          
          <Button 
            onClick={handleCreateGroup}
            disabled={isCreating}
            className="group h-12 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-8 text-sm font-bold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50 gap-2"
          >
            {isCreating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {isCreating ? t('creating') : t('createNew')}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-[200px] bg-gray-50 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard 
              key={group.id}
              id={group.id}
              title={group.name}
              membersCount={group.members?.length || 0}
              members={group.members || []}
              role={group.leaderId === user?.id ? 'Leader' : 'Member'}
              tutorId={tutorId}
            />
          ))}

          <Card 
            onClick={handleCreateGroup}
            className="border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 rounded-3xl min-h-[180px]"
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-primary" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('createNew')}</h3>
            <p className="text-gray-500 text-xs font-medium">{t('description')}</p>
          </Card>
        </div>
      )}
    </div>
  );
};
