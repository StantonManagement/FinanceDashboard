import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle, MessageSquare, ExternalLink } from 'lucide-react';

interface CellComment {
  id: string;
  commentNumber: string;
  commentType: "ACCOUNTING" | "PROPERTY_MANAGEMENT" | "EXTERNAL";
  cellReference: string;
  cellValue: string;
  propertyId: string;
  tabSection: string;
  noteText: string;
  actionRequired: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED";
  completionNote?: string;
  author: string;
  createdAt: string;
  completedAt?: string;
}

export default function AccountingNotesDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [selectedComment, setSelectedComment] = useState<CellComment | null>(null);
  const [completionNote, setCompletionNote] = useState('');

  // Fetch all cell comments
  const { data: allComments = [], refetch } = useQuery({
    queryKey: ['/api/cell-comments'],
    queryFn: async () => {
      const response = await fetch('/api/cell-comments');
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    }
  });

  // Fetch properties for reference
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
  });

  // Complete comment mutation
  const completeCommentMutation = useMutation({
    mutationFn: async ({ commentId, completionNote }: { commentId: string; completionNote: string }) => {
      return apiRequest(`/api/cell-comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'COMPLETED',
          completionNote: completionNote.trim()
        })
      });
    },
    onSuccess: () => {
      refetch();
      setSelectedComment(null);
      setCompletionNote('');
      toast({ 
        title: 'Success', 
        description: 'Comment marked as completed'
      });
    }
  });

  // Filter comments based on selected filters
  const filteredComments = allComments.filter((comment: CellComment) => {
    if (filterType !== 'ALL' && comment.commentType !== filterType) return false;
    if (filterStatus !== 'ALL' && comment.status !== filterStatus) return false;
    if (filterPriority !== 'ALL' && comment.priority !== filterPriority) return false;
    return true;
  });

  // Group comments by type
  const accountingComments = filteredComments.filter((c: CellComment) => c.commentType === 'ACCOUNTING');
  const pmComments = filteredComments.filter((c: CellComment) => c.commentType === 'PROPERTY_MANAGEMENT');
  const externalComments = filteredComments.filter((c: CellComment) => c.commentType === 'EXTERNAL');

  const getPropertyName = (propertyId: string) => {
    const property = properties.find((p: any) => p.id === propertyId);
    return property ? `${property.code} - ${property.name}` : 'Unknown Property';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-500';
      case 'MEDIUM': return 'bg-orange-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4 text-orange-600" />;
      case 'OPEN': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const CommentCard = ({ comment }: { comment: CellComment }) => (
    <div className="border border-institutional-border rounded-none bg-white p-4 hover:bg-gray-50">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Badge className={`${getPriorityColor(comment.priority)} text-white text-xs`}>
            {comment.commentNumber}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {comment.commentType.replace('_', ' ')}
          </Badge>
          {getStatusIcon(comment.status)}
        </div>
        <span className="text-xs text-gray-500">
          {new Date(comment.createdAt).toLocaleDateString()}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="text-sm font-medium text-institutional-black">
          {getPropertyName(comment.propertyId)}
        </div>
        <div className="text-sm text-gray-600">
          <strong>Location:</strong> {comment.cellReference}
        </div>
        <div className="text-sm text-gray-600">
          <strong>Value:</strong> <span className="font-mono">{comment.cellValue}</span>
        </div>
        <div className="text-sm text-gray-800 bg-gray-50 p-2 rounded">
          {comment.noteText}
        </div>
        
        {comment.actionRequired && (
          <Badge variant="destructive" className="text-xs">
            ACTION REQUIRED
          </Badge>
        )}
        
        {comment.completionNote && (
          <div className="text-sm text-green-800 bg-green-50 p-2 rounded border-l-2 border-green-500">
            <strong>Completion Note:</strong> {comment.completionNote}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500">{comment.tabSection}</span>
        </div>
        
        {comment.status !== 'COMPLETED' && comment.commentType === 'ACCOUNTING' && (
          <Button
            size="sm"
            className="h-6 text-xs"
            onClick={() => setSelectedComment(comment)}
          >
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-institutional-black text-institutional-white p-6">
        <h1 className="text-2xl font-bold uppercase">Accounting Department Notes & Action Items</h1>
        <p className="text-sm mt-2 opacity-90">
          Comprehensive tracking of all property-level comments, notes, and action items across portfolios
        </p>
      </div>

      {/* Filters */}
      <div className="p-6 bg-gray-50 border-b border-institutional-border">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Type:</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="ACCOUNTING">Accounting</SelectItem>
                <SelectItem value="PROPERTY_MANAGEMENT">Property Management</SelectItem>
                <SelectItem value="EXTERNAL">External/Lender</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Status:</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Priority:</label>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto text-sm text-gray-600">
            {filteredComments.length} of {allComments.length} comments
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-institutional-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Accounting Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-institutional-black">{accountingComments.length}</div>
              <div className="text-xs text-gray-600">Internal audit trail</div>
            </CardContent>
          </Card>

          <Card className="border-institutional-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Property Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-institutional-black">{pmComments.length}</div>
              <div className="text-xs text-gray-600">Operations notes</div>
            </CardContent>
          </Card>

          <Card className="border-institutional-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">External/Lender</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-institutional-black">{externalComments.length}</div>
              <div className="text-xs text-gray-600">Footnotes for packages</div>
            </CardContent>
          </Card>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {filteredComments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No comments found matching your filters.</p>
            </div>
          ) : (
            filteredComments.map((comment: CellComment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))
          )}
        </div>
      </div>

      {/* Complete Comment Dialog */}
      <Dialog open={!!selectedComment} onOpenChange={() => setSelectedComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Comment as Completed</DialogTitle>
          </DialogHeader>
          
          {selectedComment && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 border rounded">
                <div><strong>Comment:</strong> {selectedComment.commentNumber}</div>
                <div><strong>Location:</strong> {selectedComment.cellReference}</div>
                <div><strong>Note:</strong> {selectedComment.noteText}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Completion Note (Required)</label>
                <Textarea
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Describe what was done to resolve this comment..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedComment(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (completionNote.trim()) {
                      completeCommentMutation.mutate({
                        commentId: selectedComment.id,
                        completionNote: completionNote.trim()
                      });
                    } else {
                      toast({
                        title: 'Error',
                        description: 'Please enter a completion note',
                        variant: 'destructive'
                      });
                    }
                  }}
                  disabled={!completionNote.trim() || completeCommentMutation.isPending}
                >
                  {completeCommentMutation.isPending ? 'Completing...' : 'Complete'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}