"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import EditTopic from "./edit-topic";
import EditReply from "./edit-reply";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

type Author = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type Reply = {
  id: string;
  body: string;
  created_at: string;
  author_id: string | null;
  profiles: Author | null;
};

interface TopicViewProps {
  topicId: string;
  initialTitle: string;
  initialBody: string;
  createdAt: string;
  topicAuthor: Author | null;
  replies: Reply[];
  currentUserId: string;
}

export default function TopicView({
  topicId,
  initialTitle,
  initialBody,
  createdAt,
  topicAuthor,
  replies: initialReplies,
  currentUserId,
}: TopicViewProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [replies, setReplies] = useState(initialReplies);

  const isTopicAuthor = topicAuthor?.id === currentUserId;

  return (
    <>
      {/* Topic body */}
      <div className="flex items-start gap-3">
        <Avatar size="sm">
          {topicAuthor?.avatar_url && (
            <AvatarImage src={topicAuthor.avatar_url} alt={topicAuthor.full_name ?? ""} />
          )}
          <AvatarFallback>{getInitials(topicAuthor?.full_name ?? null)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{topicAuthor?.full_name ?? "Unknown"}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-400 text-xs">
              {format(new Date(createdAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
            {isTopicAuthor && (
              <>
                <span className="text-zinc-300">·</span>
                <EditTopic
                  topicId={topicId}
                  initialTitle={title}
                  initialBody={body}
                  onSaved={(t, b) => { setTitle(t); setBody(b); }}
                />
              </>
            )}
          </div>

          {/* Title reflects edits */}
          <h1 className="text-xl font-semibold mt-1">{title}</h1>

          <div className="mt-2 prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {body}
          </div>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-zinc-400">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </h2>
          {replies.map((reply) => {
            const author = reply.profiles;
            const isReplyAuthor = reply.author_id === currentUserId;
            return (
              <div key={reply.id} className="flex items-start gap-3">
                <Avatar size="sm">
                  {author?.avatar_url && (
                    <AvatarImage src={author.avatar_url} alt={author.full_name ?? ""} />
                  )}
                  <AvatarFallback>{getInitials(author?.full_name ?? null)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="font-medium">{author?.full_name ?? "Unknown"}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-400 text-xs">
                      {format(new Date(reply.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                    {isReplyAuthor && (
                      <>
                        <span className="text-zinc-300">·</span>
                        <EditReply
                          replyId={reply.id}
                          initialBody={reply.body}
                          onSaved={(b) =>
                            setReplies(prev =>
                              prev.map(r => r.id === reply.id ? { ...r, body: b } : r)
                            )
                          }
                        />
                      </>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">
                    {replies.find(r => r.id === reply.id)?.body ?? reply.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
