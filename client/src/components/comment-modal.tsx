import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CommentModalProps {
  open: boolean;
  onClose: () => void;
  cellReference: string;
  cellValue: string;
  tabSection: string;
  propertyCode: string;
  onCommentCreated?: (comment: any) => void;
}

export default function CommentModal({
  open,
  onClose,
  cellReference,
  cellValue,
  tabSection,
  propertyCode,
  onCommentCreated
}: CommentModalProps) {
  const [noteText, setNoteText] = useState("");
  const [commentType, setCommentType] = useState<"ACCOUNTING" | "PROPERTY_MANAGEMENT" | "EXTERNAL">("ACCOUNTING");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [actionRequired, setActionRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!noteText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a comment",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const comment = await apiRequest("/api/cell-comments", {
        method: "POST",
        body: JSON.stringify({
          propertyCode,
          cellReference,
          cellValue,
          tabSection,
          noteText: noteText.trim(),
          commentType,
          priority,
          actionRequired
        })
      });

      toast({
        title: "Success",
        description: `Comment ${comment.commentNumber} created successfully`
      });

      if (onCommentCreated) {
        onCommentCreated(comment);
      }

      // Reset form
      setNoteText("");
      setCommentType("ACCOUNTING");
      setPriority("MEDIUM");
      setActionRequired(false);
      onClose();
    } catch (error) {
      console.error("Failed to create comment:", error);
      toast({
        title: "Error",
        description: "Failed to create comment",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCommentTypeDescription = (type: string) => {
    switch (type) {
      case "ACCOUNTING":
        return "Internal audit trail with highlighting";
      case "PROPERTY_MANAGEMENT":
        return "Operations notes for PM dashboard";
      case "EXTERNAL":
        return "Footnotes for lender packages";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-institutional-black font-bold">Add Cell Comment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cell Reference Info */}
          <div className="p-3 bg-gray-50 border border-institutional-border rounded text-sm">
            <div><strong>Location:</strong> {cellReference}</div>
            <div><strong>Value:</strong> {cellValue}</div>
            <div><strong>Section:</strong> {tabSection}</div>
          </div>

          {/* Comment Type */}
          <div className="space-y-2">
            <Label htmlFor="commentType" className="text-sm font-medium">Comment Type</Label>
            <Select value={commentType} onValueChange={(value: any) => setCommentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACCOUNTING">
                  <div>
                    <div className="font-medium">Accounting</div>
                    <div className="text-xs text-gray-600">Internal audit trail with highlighting</div>
                  </div>
                </SelectItem>
                <SelectItem value="PROPERTY_MANAGEMENT">
                  <div>
                    <div className="font-medium">Property Management</div>
                    <div className="text-xs text-gray-600">Operations notes for PM dashboard</div>
                  </div>
                </SelectItem>
                <SelectItem value="EXTERNAL">
                  <div>
                    <div className="font-medium">External/Lender</div>
                    <div className="text-xs text-gray-600">Footnotes for lender packages</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comment Text */}
          <div className="space-y-2">
            <Label htmlFor="noteText" className="text-sm font-medium">Comment</Label>
            <Textarea
              id="noteText"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your comment..."
              className="min-h-[100px] text-sm"
              required
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Required */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="actionRequired"
              checked={actionRequired}
              onCheckedChange={setActionRequired}
            />
            <Label htmlFor="actionRequired" className="text-sm">
              Requires follow-up action
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-institutional-black text-institutional-white hover:bg-gray-800"
            >
              {isSubmitting ? "Creating..." : "Create Comment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}