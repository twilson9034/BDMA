import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Send, Users, User, ChevronRight, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { format, formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Message as MessageType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Conversation, Message } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface OrgMember {
  id: number;
  orgId: number;
  userId: string;
  role: string;
  user?: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

interface ConversationWithParticipants extends Conversation {
  participantNames?: string[];
  lastMessagePreview?: string;
  lastMessageAt?: Date;
  unreadCount?: number;
}

function ConversationList({ 
  conversations, 
  selectedId, 
  onSelect 
}: { 
  conversations: ConversationWithParticipants[]; 
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground" data-testid="empty-state-conversations">
        <Users className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm" data-testid="text-empty-conversations">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={`p-4 cursor-pointer hover-elevate transition-colors ${
            selectedId === conv.id ? "bg-accent" : ""
          }`}
          onClick={() => onSelect(conv.id)}
          data-testid={`row-conversation-${conv.id}`}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10" data-testid={`avatar-conversation-${conv.id}`}>
              <AvatarFallback>
                {conv.isGroup ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate" data-testid={`text-conversation-name-${conv.id}`}>
                  {conv.name || conv.participantNames?.join(", ") || "Conversation"}
                </span>
                {conv.lastMessageAt ? (
                  <span className="text-xs text-muted-foreground shrink-0" data-testid={`text-conversation-time-${conv.id}`}>
                    {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground truncate" data-testid={`text-conversation-preview-${conv.id}`}>
                {conv.lastMessagePreview || "No messages yet"}
              </p>
            </div>
            {(conv.unreadCount || 0) > 0 && (
              <Badge variant="default" className="shrink-0" data-testid={`badge-unread-${conv.id}`}>{conv.unreadCount}</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageThread({ conversationId }: { conversationId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    enabled: !!conversationId,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, { content });
      return response.json() as Promise<MessageType>;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage.trim());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-messages">
        <div className="animate-pulse text-muted-foreground" data-testid="text-loading-messages">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!messages?.length ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground" data-testid="empty-state-messages">
            <Send className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm" data-testid="text-empty-messages">No messages in this conversation yet</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                data-testid={`row-message-${message.id}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm" data-testid={`text-message-content-${message.id}`}>{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`} data-testid={`text-message-time-${message.id}`}>
                    {message.createdAt ? format(new Date(message.createdAt), "h:mm a") : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t p-4 flex gap-2">
        <Textarea
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="resize-none min-h-[60px]"
          data-testid="input-message"
        />
        <Button
          onClick={handleSend}
          disabled={!newMessage.trim() || sendMutation.isPending}
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [conversationName, setConversationName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const { data: conversations, isLoading } = useQuery<ConversationWithParticipants[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: orgMembers } = useQuery<OrgMember[]>({
    queryKey: ["/api/organizations/current/members"],
  });

  const createConversationMutation = useMutation({
    mutationFn: async (data: { name?: string; isGroup: boolean; participantIds: string[] }) => {
      const response = await apiRequest("POST", "/api/conversations", {
        name: data.name || null,
        isGroup: data.isGroup,
        participantIds: data.participantIds,
      });
      return response.json() as Promise<Conversation>;
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(newConversation.id);
      setShowNewConversationDialog(false);
      setConversationName("");
      setSelectedParticipants([]);
      toast({
        title: "Success",
        description: "Conversation created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    },
  });

  const handleCreateConversation = () => {
    if (selectedParticipants.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one participant",
        variant: "destructive",
      });
      return;
    }
    const isGroup = selectedParticipants.length > 1;
    createConversationMutation.mutate({
      name: isGroup ? conversationName : undefined,
      isGroup,
      participantIds: selectedParticipants,
    });
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredConversations = conversations?.filter((conv) => {
    const matchesSearch =
      conv.name?.toLowerCase().includes(search.toLowerCase()) ||
      conv.participantNames?.some((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      );
    return search ? matchesSearch : true;
  });

  const availableMembers = orgMembers?.filter((m) => m.userId !== user?.id) || [];

  return (
    <div className="h-full flex flex-col fade-in">
      <PageHeader
        title="Messages"
        description="Team communication and collaboration"
        actions={
          <Button onClick={() => setShowNewConversationDialog(true)} data-testid="button-new-conversation">
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        }
      />

      <div className="flex-1 grid lg:grid-cols-3 gap-6 overflow-hidden">
        <Card className="lg:col-span-1 overflow-hidden flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-conversations"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {isLoading ? (
              <div className="animate-pulse space-y-4 p-4" data-testid="loading-conversations">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg" data-testid={`skeleton-conversation-${i}`} />
                ))}
              </div>
            ) : (
              <ConversationList
                conversations={filteredConversations || []}
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          {selectedConversationId ? (
            <MessageThread conversationId={selectedConversationId} />
          ) : (
            <div className="flex-1 flex items-center justify-center" data-testid="empty-state-select-conversation">
              <EmptyState
                icon={Send}
                title="Select a conversation"
                description="Choose a conversation from the list to view messages"
              />
            </div>
          )}
        </Card>
      </div>

      <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>
              Select team members to start a conversation with.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedParticipants.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="conversation-name">Group Name (optional)</Label>
                <Input
                  id="conversation-name"
                  placeholder="Enter group name..."
                  value={conversationName}
                  onChange={(e) => setConversationName(e.target.value)}
                  data-testid="input-conversation-name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Select Participants</Label>
              {availableMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-members">
                  No other team members available
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                  {availableMembers.map((member) => {
                    const displayName = member.user?.firstName && member.user?.lastName
                      ? `${member.user.firstName} ${member.user.lastName}`
                      : member.user?.email || member.userId;
                    const isSelected = selectedParticipants.includes(member.userId);
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover-elevate ${
                          isSelected ? "bg-accent" : ""
                        }`}
                        onClick={() => toggleParticipant(member.userId)}
                        data-testid={`row-member-${member.id}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleParticipant(member.userId)}
                          data-testid={`checkbox-member-${member.id}`}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user?.profileImageUrl || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-member-name-${member.id}`}>
                            {displayName}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize" data-testid={`text-member-role-${member.id}`}>
                            {member.role}
                          </p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedParticipants.length > 0 && (
              <p className="text-sm text-muted-foreground" data-testid="text-selected-count">
                {selectedParticipants.length} participant{selectedParticipants.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowNewConversationDialog(false);
                setConversationName("");
                setSelectedParticipants([]);
              }}
              data-testid="button-cancel-conversation"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateConversation}
              disabled={selectedParticipants.length === 0 || createConversationMutation.isPending}
              data-testid="button-create-conversation"
            >
              {createConversationMutation.isPending ? "Creating..." : "Create Conversation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
