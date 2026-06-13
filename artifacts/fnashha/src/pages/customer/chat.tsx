import { useState, useRef, useEffect } from "react";
import {
  useListMessages, getListMessagesQueryKey,
  useSendMessage,
  useGetRequest, getGetRequestQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerChat({ requestId }: { requestId: string }) {
  const reqId = parseInt(requestId);
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendMutation = useSendMessage();

  const { data: request } = useGetRequest(reqId, {
    query: { enabled: !!reqId, queryKey: getGetRequestQueryKey(reqId) },
  });

  // FIX: pass requestId as number, NOT as an object
  const { data: messages = [], isLoading } = useListMessages(
    reqId,
    { query: { enabled: !!reqId, queryKey: getListMessagesQueryKey(reqId), refetchInterval: 4000 } }
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMsg = () => {
    if (!text.trim()) return;
    sendMutation.mutate(
      { requestId: reqId, data: { content: text, type: "text" } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(reqId) });
          setText("");
        },
      }
    );
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  const req = request as any;
  const techName = req?.selectedTechnician?.fullName || "الفني";

  return (
    <div className="h-screen flex flex-col p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold">المحادثة</h1>
        <p className="text-sm text-muted-foreground">طلب #{reqId} مع {techName}</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (messages as any[]).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
              <p>ابدأ المحادثة مع الفني</p>
            </div>
          ) : (
            (messages as any[]).map((msg: any) => {
              const isMe = msg.senderId === currentUser?.id;
              return (
                <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")} data-testid={`message-${msg.id}`}>
                  {!isMe && msg.sender?.profileImage && (
                    <img src={msg.sender.profileImage} className="w-7 h-7 rounded-full object-cover me-2 flex-shrink-0 mt-1" alt="" />
                  )}
                  <div className={cn(
                    "max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}>
                    {!isMe && msg.sender?.fullName && (
                      <p className="text-xs font-semibold mb-1 text-primary/80">{msg.sender.fullName}</p>
                    )}
                    <p>{msg.content}</p>
                    <p className={cn("text-xs mt-1 opacity-70", isMe ? "text-left" : "text-right")}>
                      {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </CardContent>

        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="اكتب رسالتك..."
              className="flex-1"
              data-testid="input-message"
            />
            <Button onClick={sendMsg} disabled={!text.trim() || sendMutation.isPending} data-testid="button-send">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
