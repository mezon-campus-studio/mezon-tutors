'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  ChevronLeft, 
  Share2, 
  MoreVertical,
  Loader2,
  Pencil,
  MessageCircle,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { 
  Button, 
  Card, 
  Avatar, 
  AvatarImage, 
  AvatarFallback,
  Badge,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { ensureMezonGroupDmChannel } from '@/lib/ensure-mezon-dm-channel';
import { useMezonLight } from '@/providers/MezonLightProvider';
import { studyGroupApi, type StudyGroup } from '@/services/study-group/study-group.api';
import { useGetSupportBotContact } from '@/services/support/support.api';
import { userAtom } from '@/store/auth.atom';
import { MEZON_DIRECT_MESSAGE_URL, ROUTES } from '@mezon-tutors/shared';
import { toast } from 'sonner';

interface GroupDetailViewProps {
  groupId: string;
}

export const GroupDetailView = ({ groupId }: GroupDetailViewProps) => {
  const t = useTranslations('Groups.detail');
  const tGroups = useTranslations('Groups');
  const router = useRouter();
  const searchParams = useSearchParams();
  const tutorId = searchParams.get('tutorId');
  const currentUser = useAtomValue(userAtom);
  const { lightClient, setLightClient } = useMezonLight();
  const { data: botContact } = useGetSupportBotContact();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreateChatDialogOpen, setIsCreateChatDialogOpen] = useState(false);
  const [isOpeningGroupChat, setIsOpeningGroupChat] = useState(false);
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

  const openMezonGroupChat = (channelId: string) => {
    window.open(MEZON_DIRECT_MESSAGE_URL(channelId), '_blank', 'noopener,noreferrer');
  };

  const handleOpenGroupChat = async () => {
    if (!group) return;

    if (group.groupChatChannelId) {
      openMezonGroupChat(group.groupChatChannelId);
      return;
    }

    setIsCreateChatDialogOpen(true);
  };

  const handleCreateGroupChat = async () => {
    if (!group || !currentUser?.id || !currentUser.mezonUserId) {
      toast.error(t('groupChat.missingMezonAccount'));
      return;
    }

    if (!botContact?.mezonUserId) {
      toast.error(t('groupChat.missingBotAccount'));
      return;
    }

    const groupMezonUserIds = Array.from(new Set([
      currentUser.mezonUserId,
      ...(group.members?.map((member) => member.user.mezonUserId) ?? []),
      botContact.mezonUserId,
    ].filter((mezonUserId): mezonUserId is string => Boolean(mezonUserId))));

    if (groupMezonUserIds.length < 3) {
      toast.error(t('groupChat.notEnoughMembers'));
      return;
    }

    setIsOpeningGroupChat(true);
    try {
      const channelId = await ensureMezonGroupDmChannel({
        lightClient,
        setLightClient,
        senderId: currentUser.id,
        senderMezonUserId: currentUser.mezonUserId,
        mezonUserIds: groupMezonUserIds,
      });
      const updated = await studyGroupApi.updateGroupChatChannel(group.id, channelId);
      const savedChannelId = updated.groupChatChannelId ?? channelId;
      setGroup(updated);
      setIsCreateChatDialogOpen(false);
      toast.success(t('groupChat.created'));
      openMezonGroupChat(savedChannelId);
    } catch (error) {
      console.error('Failed to create group chat:', error);
      toast.error(t('groupChat.createError'));
    } finally {
      setIsOpeningGroupChat(false);
    }
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
          onClick={() => router.push(`${ROUTES.DASHBOARD.GROUPS}${tutorId ? `?tutorId=${tutorId}` : ''}`)}
          className="mt-4"
        >
          {t('backToList')}
        </Button>
      </div>
    );
  }

  const isLeader = group.leaderId === currentUser?.id;
  const hasGroupChat = !!group.groupChatChannelId;

  const canShowButton = isLeader || hasGroupChat;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-8">
      {/* Header Section */}
      <div className="space-y-6">
        <button 
          onClick={() => router.push(`${ROUTES.DASHBOARD.GROUPS}${tutorId ? `?tutorId=${tutorId}` : ''}`)}
          className="flex cursor-pointer items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
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
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                    {group.name}
                  </h1>
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="p-2 rounded-full cursor-pointer hover:bg-gray-100 text-gray-400 group-hover/name:text-primary transition-all opacity-0 group-hover/name:opacity-100"
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
            <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 rounded-xl">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900">{t('members')}</h2>
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none rounded-full ml-1 px-3">
                  {group.members?.length || 0}
                </Badge>
              </div>
              {canShowButton && (
                <Button
                  onClick={handleOpenGroupChat}
                  disabled={isOpeningGroupChat}
                  variant='gradient'
                  className='h-11 rounded-full px-5 text-sm font-bold shadow-sm gap-2'>
                  {isOpeningGroupChat ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : hasGroupChat ? (
                    <ExternalLink className="w-4 h-4" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {group.members?.map((member) => (
                <div key={member.userId} className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 ring-2 ring-transparent group-hover/item:ring-indigo-100 transition-all">
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
                    <div>
                      <p className="font-bold text-gray-900">{member.user.username}</p>
                      <p className="text-sm text-gray-500">{member.user.email || t('noEmail')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className={cn("text-xs font-bold px-2 py-1 rounded-full", member.userId === group.leaderId ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700')}>
                      {member.userId === group.leaderId ? tGroups('card.leader') : tGroups('card.member')}
                    </Badge>
                    <button className="p-1 cursor-pointer text-gray-300 hover:text-gray-900 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        
      </div>

      <Dialog open={isCreateChatDialogOpen} onOpenChange={setIsCreateChatDialogOpen}>
        <DialogContent className="overflow-hidden rounded-[28px] border-none bg-white p-0 shadow-2xl shadow-violet-200/50 ring-1 ring-violet-100 sm:max-w-[460px]">
          <div className="relative bg-[linear-gradient(135deg,#7c3aed_0%,#9333ea_48%,#db2777_100%)] px-6 pb-7 pt-6 text-white">
            <div className="absolute inset-x-0 bottom-0 h-px bg-white/25" />
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/18 shadow-inner ring-1 ring-white/25">
                <Sparkles className="size-6" />
              </div>
              <DialogHeader className="gap-2 text-left">
                <DialogTitle className="text-xl font-black tracking-tight text-white">
                  {t('groupChat.confirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium leading-6 text-white/82">
                  {t('groupChat.confirmDescription')}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm font-medium leading-6 text-slate-700">
              {t('groupChat.confirmNote')}
            </div>
            <DialogFooter className="mx-0 mb-0 border-none bg-transparent p-0 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setIsCreateChatDialogOpen(false)}
                disabled={isOpeningGroupChat}
                className="rounded-full border-violet-100 px-5 font-bold text-slate-600 hover:bg-violet-50"
              >
                {t('groupChat.cancel')}
              </Button>
              <Button
                onClick={handleCreateGroupChat}
                disabled={isOpeningGroupChat}
                className="rounded-full bg-[linear-gradient(110deg,#7c3aed_0%,#9333ea_50%,#db2777_100%)] px-5 font-bold text-white shadow-md shadow-violet-300/40 hover:shadow-lg hover:shadow-violet-400/50"
              >
                {isOpeningGroupChat && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('groupChat.createAndOpen')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
