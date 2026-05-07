"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, X, ArrowLeft } from "lucide-react";

export default function NewPollPage() {
  const router = useRouter();
  const supabase = createClient();

  const [submitting, setSubmitting] = useState(false);
  const [question, setQuestion] = useState("");
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [closesAt, setClosesAt] = useState("");
  const [options, setOptions] = useState(["", ""]);

  function addOption() {
    if (options.length >= 10) return;
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  const validOptions = options.filter((o) => o.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || validOptions.length < 2) return;

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be signed in to create a poll.");
      setSubmitting(false);
      return;
    }

    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        question: question.trim(),
        is_multiple_choice: isMultipleChoice,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        created_by: user.id,
        status: "active",
      })
      .select()
      .single();

    if (pollError || !poll) {
      toast.error("Failed to create poll. Please try again.");
      setSubmitting(false);
      return;
    }

    const optionInserts = validOptions.map((text, i) => ({
      poll_id: poll.id,
      text: text.trim(),
      sort_order: i,
    }));

    const { error: optionsError } = await supabase
      .from("poll_options")
      .insert(optionInserts);

    if (optionsError) {
      toast.error("Poll created but failed to save options.");
      setSubmitting(false);
      return;
    }

    toast.success("Poll created!");
    router.push(`/polls/${poll.id}`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/polls" className="hover:underline">Polls</Link>
        <span>/</span>
        <span>Create Poll</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a Poll</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Question */}
            <div className="space-y-1.5">
              <Label htmlFor="question">
                Question <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="question"
                placeholder="What would you like to ask the community?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                required
                disabled={submitting}
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label>
                Options <span className="text-destructive">*</span>
              </Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    disabled={submitting}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      disabled={submitting}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove option"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={submitting}
                >
                  <Plus className="size-4" />
                  Add Option
                </Button>
              )}
            </div>

            {/* Multiple choice toggle */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMultipleChoice}
                  onChange={(e) => setIsMultipleChoice(e.target.checked)}
                  disabled={submitting}
                  className="size-4 rounded"
                />
                <span className="text-sm font-medium">Allow multiple choices</span>
              </label>
              <p className="text-xs text-muted-foreground pl-6">
                If enabled, members can select more than one option.
              </p>
            </div>

            {/* Closes at */}
            <div className="space-y-1.5">
              <Label htmlFor="closesAt">Close poll at (optional)</Label>
              <Input
                id="closesAt"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                <ArrowLeft className="size-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !question.trim() || validOptions.length < 2}
              >
                {submitting ? "Creating..." : "Create Poll"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
