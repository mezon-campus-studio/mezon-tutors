'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  ChevronRight, 
  ShieldCheck,
  Loader2,
  X,
  Info
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { 
  Button, 
  Card, 
  Avatar, 
  AvatarImage,
  AvatarFallback,
  Badge,
  AvatarGroupCount
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { studyGroupApi, StudyGroup } from '@/services/study-group/study-group.api';
import { ROUTES } from '@mezon-tutors/shared';
import { isAuthenticatedAtom } from '@/store/auth.atom';
import { BASE_URL } from '@/services/api-client';
import { toast } from 'sonner';

interface InviteLandingViewProps {
  inviteId: string;
}

export const InviteLandingView = ({ inviteId }: InviteLandingViewProps) => {
  const t = useTranslations('Groups.invite');
  const tGroups = useTranslations('Groups');
  const router = useRouter();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchGroupPreview();
  }, [inviteId]);

  const fetchGroupPreview = async () => {
    try {
      const data = await studyGroupApi.findByInvite(inviteId);
      setGroup(data);
      
      // Auto-join logic if redirected back from login
      const pendingJoin = localStorage.getItem('pending_group_join');
      if (pendingJoin === inviteId && isAuthenticated) {
        localStorage.removeItem('pending_group_join');
        handleJoin();
      }
    } catch (error) {
      console.error('Failed to fetch invite details:', error);
      toast.error(t('invalid.title'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (isJoining) return;
    
    if (!isAuthenticated) {
      // Remember intent and redirect to Mezon login
      localStorage.setItem('pending_group_join', inviteId);
      const returnTo = window.location.pathname;
      window.location.href = `${BASE_URL}/auth/mezon-oauth/start?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }

    setIsJoining(true);
    try {
      await studyGroupApi.join(inviteId);
      toast.success(t('joinSuccess'));
      router.push(ROUTES.DASHBOARD.MY_LESSONS);
    } catch (error) {
      console.error('Failed to join group:', error);
      toast.error(t('joinError'));
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="w-16 h-16 relative">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-full" />
          </div>
        </div>
        <p className="mt-4 text-gray-500 font-bold animate-pulse">{t('confirming')}</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] px-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">{t('invalid.title')}</h2>
        <p className="text-gray-500 text-center max-w-sm mb-8">
          {t('invalid.desc')}
        </p>
        <Button 
          onClick={() => router.push('/')}
          className="rounded-full bg-indigo-600 px-8"
        >
          {t('invalid.backHome')}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-12 px-4">
      {/* Brand Logo Header */}
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-black text-gray-900 tracking-tight">Mezon Tutors</span>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-[600px] p-8 md:p-12 rounded-[48px] border-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] bg-white relative overflow-hidden">
        <div className="space-y-8 text-center relative z-10">
          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge className="bg-indigo-50 text-indigo-600 border-none px-4 py-1.5 rounded-full flex gap-2 items-center text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('active')}
            </Badge>
          </div>

          {/* Group Title */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
              {group.name}
            </h1>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 bg-[#F8FAFC] rounded-[24px] border border-gray-100/50">
              <p className="text-2xl font-black text-gray-900">{group.members?.length || 0}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{t('members')}</p>
            </div>
          </div>

          {/* Who's Already In Section */}
          <div className="bg-[#F8FAFC] rounded-[32px] p-6 text-left space-y-4 border border-gray-100/50">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('membersInGroup')}</span>
            </div>
            
            <div className="space-y-4">
              {group.members?.slice(0, 2).map((member) => (
                <div key={member.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12 ring-4 ring-white shadow-sm">
                        <AvatarImage src={member.user.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-bold text-white">
                          {(member.user.username || "?")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part: string) => part[0]?.toUpperCase())
                            .join("") || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{member.user.username}</p>
                      <p className="text-xs text-gray-500 font-medium">
                        {member.userId === group.leaderId ? tGroups('card.leader') : tGroups('card.member')}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn(
                    "border-none font-black text-[9px] uppercase tracking-wider px-3",
                    member.userId === group.leaderId ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {member.userId === group.leaderId ? tGroups('card.leader') : tGroups('card.member')}
                  </Badge>
                </div>
              ))}

              {(group.members?.length ?? 0) > 2 && (
                <div className="flex justify-end pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400">{t('andMore', { count: (group.members?.length ?? 0) - 2 })}</span>
                    <AvatarGroupCount className="bg-gray-100 text-gray-500 text-[10px] h-8 w-8 ring-4 ring-white">
                      +{(group.members?.length ?? 0) - 2}
                    </AvatarGroupCount>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button 
              onClick={handleJoin}
              disabled={isJoining}
              className="group h-16 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-8 text-lg font-bold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50 gap-3"
            >
              {isJoining ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  {t('joinGroup')}
                  <ChevronRight className="w-6 h-6" />
                </>
              )}
            </Button>

            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={() => router.push(`${ROUTES.DASHBOARD.GROUPS}/${group.id}`)}
                className="flex-1 h-16 rounded-3xl border border-gray-100 bg-white hover:bg-gray-50 text-gray-600 font-bold"
              >
                {t('viewDetails')}
              </Button>
              <button 
                onClick={() => setGroup(null)}
                className="w-16 h-16 rounded-3xl border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex gap-3 text-left">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
              {t('privacyNote')}
            </p>
          </div>
        </div>

        {/* Backdrop Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl -z-10" />
      </Card>

      <p className="mt-8 text-sm text-gray-500 font-medium">
        {t('wrongGroup')} <span className="text-indigo-600 font-bold cursor-pointer hover:underline" onClick={() => router.push(ROUTES.DASHBOARD.GROUPS)}>{t('searchOthers')}</span>
      </p>
    </div>
  );
};
