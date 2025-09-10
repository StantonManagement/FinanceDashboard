import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, FileText, AlertCircle, Trash2, CheckCircle, X } from 'lucide-react';

interface NotesTabProps {
  selectedProperty?: any;
}

interface CellComment {
  id: string;
  property_id: number;
  cell_id: string;
  cell_value: string;
  tab_section: string;
  comment_text: string;
  comment_type: string;
  priority: string;
  status: string;
  created_at: string;
  created_by: string;
}

interface PropertyNote {
  id: string;
  property_id: number;
  note_text: string;
  category: string;
  priority: string;
  created_at: string;
  created_by: string;
}

export function NotesTab({ selectedProperty }: NotesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const propertyId = selectedProperty?.PropertyId || selectedProperty?.["Asset ID"];

  // Fetch cell comments for this property
  const { data: cellComments = [] } = useQuery<CellComment[]>({
    queryKey: ['/api/supabase-cell-comments', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const response = await fetch(`/api/supabase-cell-comments?propertyId=${propertyId}`);
      if (!response.ok) throw new Error('Failed to fetch cell comments');
      return response.json();
    },
    enabled: !!propertyId
  });

  // Fetch property notes for this property  
  const { data: propertyNotes = [] } = useQuery<PropertyNote[]>({
    queryKey: ['/api/property-notes', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const response = await fetch(`/api/property-notes?propertyId=${propertyId}`);
      if (!response.ok) throw new Error('Failed to fetch property notes');
      return response.json();
    },
    enabled: !!propertyId
  });

  // Cell comment mutations
  const updateCellCommentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/supabase-cell-comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update cell comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supabase-cell-comments', propertyId] });
      toast({ title: 'Comment updated successfully', variant: 'default' });
    }
  });

  // Property note mutations
  const updatePropertyNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/property-notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update property note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/property-notes', propertyId] });
      toast({ title: 'Note updated successfully', variant: 'default' });
    }
  });

  const deletePropertyNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/property-notes/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete property note: ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/property-notes', propertyId] });
      toast({ title: 'Note deleted successfully', variant: 'default' });
    },
    onError: (error) => {
      console.error('Delete property note error:', error);
      toast({ title: 'Failed to delete note', description: error.message, variant: 'destructive' });
    }
  });

  const handleResolveCellComment = (id: string) => {
    updateCellCommentMutation.mutate({
      id,
      updates: { status: 'completed', is_resolved: true }
    });
  };

  const handleDeletePropertyNote = (id: string) => {
    deletePropertyNoteMutation.mutate(id);
  };

  const handleArchivePropertyNote = (id: string) => {
    updatePropertyNoteMutation.mutate({
      id,
      updates: { is_archived: true }
    });
  };

  const deleteCellCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/supabase-cell-comments/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete cell comment: ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supabase-cell-comments', propertyId] });
      toast({ title: 'Comment deleted successfully', variant: 'default' });
    },
    onError: (error) => {
      console.error('Delete cell comment error:', error);
      toast({ title: 'Failed to delete comment', description: error.message, variant: 'destructive' });
    }
  });

  const handleDeleteCellComment = (id: string) => {
    deleteCellCommentMutation.mutate(id);
  };
  const getPriorityColor = (priority: string) => {
    switch(priority.toLowerCase()) {
      case 'urgent': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (!selectedProperty) {
    return (
      <div className="p-6 text-center text-gray-600">
        Select a property to view its notes and comments.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold uppercase text-institutional-black">
          Notes & Actions - {selectedProperty?.["Asset ID + Name"] || selectedProperty?.["Asset ID"]}
        </h3>
        <Badge variant="outline" className="text-xs">
          Property ID: {propertyId}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cell Comments (Inline Notes from Financial Tables) */}
        <Card className="border-2">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg font-bold uppercase flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Cell Comments ({cellComments.length})
              <div className="flex gap-2 ml-2">
                <Badge variant="outline" className="text-xs bg-blue-50">
                  Active: {cellComments.filter(c => c.status !== 'completed').length}
                </Badge>
                <Badge variant="outline" className="text-xs bg-green-50">
                  Resolved: {cellComments.filter(c => c.status === 'completed').length}
                </Badge>
              </div>
            </CardTitle>
            <p className="text-sm text-gray-600">Notes added directly to financial data cells</p>
          </CardHeader>
          <CardContent className="p-4">
            {cellComments.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No cell comments yet. Add notes directly in the financial performance tables.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2 border border-gray-100 rounded-lg p-2">
                {cellComments.length > 5 && (
                  <div className="text-xs text-gray-500 text-center pb-2 border-b">
                    ↕ Scroll to see all {cellComments.length} comments
                  </div>
                )}
                {cellComments.map((comment) => (
                  <Card key={comment.id} className={`border ${comment.status === 'completed' ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-bold text-sm text-blue-600">
                          {comment.cell_id.toUpperCase()} - {comment.tab_section}
                          {comment.status === 'completed' && (
                            <Badge className="ml-2 bg-green-600 text-white text-xs">
                              RESOLVED
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getPriorityColor(comment.priority)}`}>
                            {comment.priority.toUpperCase()}
                          </Badge>
                          <div className="flex gap-1">
                            {comment.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolveCellComment(comment.id)}
                                className="h-6 px-2 text-xs text-green-600 border-green-300 hover:bg-green-50"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Resolve
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteCellComment(comment.id)}
                              className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm mb-2">{comment.comment_text}</div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Value: {comment.cell_value}</span>
                        <span>{comment.created_by} • {new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Property Management Notes */}
        <Card className="border-2">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-lg font-bold uppercase flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Property Notes ({propertyNotes.length})
            </CardTitle>
            <p className="text-sm text-gray-600">General property management notes and tasks</p>
          </CardHeader>
          <CardContent className="p-4">
            {propertyNotes.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No property notes yet. Create notes from the Property Management Notes page.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2 border border-gray-100 rounded-lg p-2">
                {propertyNotes.length > 5 && (
                  <div className="text-xs text-gray-500 text-center pb-2 border-b">
                    ↕ Scroll to see all {propertyNotes.length} notes
                  </div>
                )}
                {propertyNotes.map((note) => (
                  <Card key={note.id} className="border border-gray-200">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-bold text-sm capitalize text-green-600">
                          {note.category}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getPriorityColor(note.priority)}`}>
                            {note.priority.toUpperCase()}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArchivePropertyNote(note.id)}
                              className="h-6 px-2 text-xs text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Archive
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeletePropertyNote(note.id)}
                              className="h-6 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm mb-2">{note.note_text}</div>
                      <div className="text-xs text-gray-500 text-right">
                        {note.created_by} • {new Date(note.created_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}