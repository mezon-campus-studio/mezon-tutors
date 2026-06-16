'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  ChevronLeft, 
  Share2, 
  Plus, 
  Search,
  MoreVertical,
  Loader2,
  Pencil
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  Button, 
  Card, 
  Avatar, 
  AvatarImage, 
  AvatarFallback,
  Badge,
  Input
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { studyGroupApi, StudyGroup } from '@/services/study-group/study-group.api';
import { ROUTES } from '@mezon-tutors/shared';
import { toast } from 'sonner';

interface GroupDetailViewProps {
  groupId: string;
}

export const GroupDetailView = ({ groupId }: GroupDetailViewProps) => {
  const t = useTranslations('Groups.detail');
  const router = useRouter();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  const fetchGroup = async () => {
    try {
      const data = await studyGroupApi.getDetail(groupId);
      setGroup(data);
      setTempName(data.name);
    } catch (error) {
      console.error('Failed to fetch group:', error);
      toast.error(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!group || tempName === group.name || !tempName.trim()) {
      setIsEditingName(false);
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await studyGroupApi.updateName(groupId, tempName.trim());
      setGroup(updated);
      toast.success(t('updateNameSuccess'));
    } catch (error) {
      console.error('Failed to update name:', error);
      toast.error(t('updateNameError'));
      setTempName(group.name);
    } finally {
      setIsUpdating(false);
      setIsEditingName(false);
    }
  };

  const copyInviteLink = () => {
    if (!group) return;
    const link = `${window.location.origin}/invite/${group.inviteId}`;
    navigator.clipboard.writeText(link);
    toast.success(t('inviteSuccess'));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900">{t('notFound')}</h2>
        <Button 
          variant="link" 
          onClick={() => router.push(ROUTES.DASHBOARD.GROUPS)}
          className="mt-4"
        >
          {t('backToList')}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-8">
      {/* Header Section */}
      <div className="space-y-6">
        <button 
          onClick={() => router.push(ROUTES.DASHBOARD.GROUPS)}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('backToList')}
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="relative group/name inline-flex items-center gap-3">
              {isEditingName ? (
                <div className="relative flex items-center w-full max-w-xl">
                  <Input
                    ref={inputRef}
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={handleUpdateName}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                    className="text-3xl md:text-4xl font-extrabold h-auto py-1 px-2 border-b-2 border-primary rounded-none bg-transparent"
                    autoFocus
                  />
                  {isUpdating && <Loader2 className="absolute right-2 w-5 h-5 animate-spin text-primary" />}
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 lg:text-5xl">
                    {group.name}
                  </h1>
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 group-hover/name:text-primary transition-all opacity-0 group-hover/name:opacity-100"
                  >
                    <Pencil className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>
          </div>

          <Button 
            onClick={copyInviteLink}
            className="group h-12 rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-8 text-sm font-bold text-white shadow-md shadow-violet-300/40 transition-all hover:shadow-lg hover:shadow-violet-400/50 gap-2"
          >
            <Share2 className="w-5 h-5" />
            {t('shareInvite')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Members */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 rounded-[32px] border-none shadow-sm bg-white">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 rounded-xl">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900">{t('members')}</h2>
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none rounded-full ml-1 px-3">
                  {group.members?.length || 0}
                </Badge>
              </div>
            </div>

            <div className="space-y-6">
              {group.members?.map((member, i) => (
                <div key={member.userId} className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover/item:ring-indigo-100 transition-all">
                      <AvatarImage src={member.user.avatar} />
                      <AvatarFallback>{member.user.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-gray-900">{member.user.username}</p>
                      <p className="text-sm text-gray-500">{member.user.email || t('noEmail')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-wider px-3 py-1 border-none">
                      {member.userId === group.leaderId ? t('card.leader') : t('card.member')}
                    </Badge>
                    <button className="p-1 text-gray-300 hover:text-gray-900 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        
      </div>
    </div>
  );
};
