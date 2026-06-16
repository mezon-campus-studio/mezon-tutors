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
import { 
  Button, 
  Card, 
  Avatar, 
  AvatarImage,
  AvatarFallback,
  Badge,
  Separator,
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
      toast.error('Could not load group details');
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
      toast.success('Group name updated');
    } catch (error) {
      console.error('Failed to update name:', error);
      toast.error('Failed to update group name');
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
    toast.success('Invite link copied to clipboard!');
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
        <h2 className="text-2xl font-bold text-gray-900">Group not found</h2>
        <Button 
          variant="link" 
          onClick={() => router.push(ROUTES.DASHBOARD.GROUPS)}
          className="mt-4"
        >
          Back to Groups
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="space-y-6">
        <button 
          onClick={() => router.push(ROUTES.DASHBOARD.GROUPS)}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Groups
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
            <p className="text-lg text-gray-500 font-medium max-w-2xl">
              A dedicated workspace for collaborative research, focused study sessions, and peer review.
            </p>
          </div>

          <Button 
            onClick={copyInviteLink}
            className="rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 h-12 shadow-lg shadow-violet-200 gap-2 shrink-0 transition-all hover:scale-105 active:scale-95"
          >
            <Share2 className="w-5 h-5" />
            Share Join Link
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
                <h2 className="text-2xl font-extrabold text-gray-900">Members</h2>
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
                      <p className="text-sm text-gray-500">{member.user.email || 'No email shared'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-wider px-3 py-1 border-none">
                      {member.userId === group.leaderId ? 'Leader' : 'Student'}
                    </Badge>
                    <button className="p-1 text-gray-300 hover:text-gray-900 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="ghost" className="w-full mt-8 text-indigo-600 font-bold hover:bg-indigo-50 rounded-2xl h-12">
              View All Members
            </Button>
          </Card>
        </div>

        {/* Right Column: Add Members & Stats */}
        <div className="space-y-8">
          <Card className="p-8 rounded-[32px] border-none shadow-sm bg-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-violet-50 rounded-xl">
                <Plus className="w-5 h-5 text-violet-600" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900">Add Members</h2>
            </div>
            
            <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
              Search for colleagues or students by name or email address to invite them to this cohort.
            </p>

            <div className="relative mb-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search by name, email, or ID..." 
                className="pl-10 h-11 bg-gray-50 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-200"
              />
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Suggested for you</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src="https://i.pravatar.cc/150?u=emma" />
                  </Avatar>
                  <p className="text-sm font-bold text-gray-900">Emma Wilson</p>
                </div>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-lg px-4">ADD</Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src="https://i.pravatar.cc/150?u=tom" />
                  </Avatar>
                  <p className="text-sm font-bold text-gray-900">Tom Hudson</p>
                </div>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-lg px-4">ADD</Button>
              </div>
            </div>
          </Card>

          <Card className="p-8 rounded-[32px] border-none bg-indigo-600 text-white shadow-xl shadow-indigo-100 overflow-hidden relative group">
            <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-bold">Group Analytics</h3>
                <p className="text-indigo-100 text-xs font-medium">Activity has increased by 15% this week.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Sessions</p>
                  <p className="text-2xl font-black">24</p>
                </div>
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Resources</p>
                  <p className="text-2xl font-black">112</p>
                </div>
              </div>
            </div>
            
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/10 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full -ml-16 -mb-16 blur-2xl" />
          </Card>
        </div>
      </div>
    </div>
  );
};
