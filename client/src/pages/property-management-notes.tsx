import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MessageSquare, ExternalLink, Clock, CheckCircle, AlertTriangle, Wrench } from 'lucide-react';
import { Link } from 'wouter';

interface CellComment {
  id: string;
  commentNumber: string;
  propertyCode: string;
  propertyName: string;
  cellId: string;
  text: string;
  commentType: 'ACCOUNTING' | 'PROPERTY_MANAGEMENT' | 'EXTERNAL_LENDER';
  createdAt: string;
  isCompleted: boolean;
  completedAt?: string;
  completionNotes?: string;
}

interface PropertyManagementNote {
  id: string;
  property_id: number;
  note_text: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  created_by: string;
  is_archived: boolean;
}

export default function PropertyManagementNotesDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const queryClient = useQueryClient();

  // Fetch Property Management comments (blue highlighted ones)
  const { data: pmComments = [] } = useQuery<CellComment[]>({
    queryKey: ['/api/cell-comments'],
    queryFn: async () => {
      const response = await fetch('/api/cell-comments');
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    }
  });

  // Fetch Property Management Notes from API
  const { data: pmNotes = [], refetch: refetchNotes } = useQuery<PropertyManagementNote[]>({
    queryKey: ['/api/property-notes'],
    queryFn: async () => {
      const response = await fetch('/api/property-notes');
      if (!response.ok) throw new Error('Failed to fetch property notes');
      return response.json();
    }
  });

  // Create new note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { property_id: number; note_text: string; category: string; priority: string }) => {
      const response = await fetch('/api/property-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });
      if (!response.ok) throw new Error('Failed to create note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/property-notes'] });
      refetchNotes();
    }
  });

  // Filter Property Management comments only
  const pmCommentsFiltered = pmComments.filter(comment => 
    comment.commentType === 'PROPERTY_MANAGEMENT' && 
    (searchTerm === '' || 
     comment.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
     comment.propertyCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter Property Management notes
  const filteredPMNotes = pmNotes.filter(note => {
    const matchesSearch = searchTerm === '' || 
      note.note_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'ALL' || note.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesPriority = priorityFilter === 'ALL' || note.priority.toLowerCase() === priorityFilter.toLowerCase();
    
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const getCategoryIcon = (category: string) => {
    switch(category.toLowerCase()) {
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'tenant': return <MessageSquare className="w-4 h-4" />;
      case 'marketing': return <ExternalLink className="w-4 h-4" />;
      case 'inspection': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
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


  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-900 text-white p-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="text-white border-white hover:bg-white hover:text-blue-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold uppercase">Property Management Dashboard</h1>
        </div>
        <p className="text-sm mt-2 opacity-90">
          Operations tracking, maintenance scheduling, and tenant management across portfolio properties
        </p>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filters */}
        <Card className="mb-6 border-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase">Filter & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Input
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-lg"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={newNoteDialog} onOpenChange={setNewNoteDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Property Note</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="property_id">Property ID</Label>
                      <Input
                        id="property_id"
                        type="number"
                        placeholder="Enter Property ID"
                        value={newNote.property_id}
                        onChange={(e) => setNewNote({...newNote, property_id: e.target.value})}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={newNote.category} onValueChange={(value) => setNewNote({...newNote, category: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="tenant">Tenant</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newNote.priority} onValueChange={(value) => setNewNote({...newNote, priority: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="note_text">Note</Label>
                      <Textarea
                        id="note_text"
                        placeholder="Enter your note here..."
                        value={newNote.note_text}
                        onChange={(e) => setNewNote({...newNote, note_text: e.target.value})}
                        rows={4}
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        createNoteMutation.mutate({
                          property_id: parseInt(newNote.property_id),
                          note_text: newNote.note_text,
                          category: newNote.category,
                          priority: newNote.priority
                        });
                        setNewNoteDialog(false);
                        setNewNote({ property_id: '', note_text: '', category: 'general', priority: 'medium' });
                      }}
                      disabled={!newNote.property_id || !newNote.note_text || createNoteMutation.isPending}
                      className="w-full"
                    >
                      {createNoteMutation.isPending ? 'Creating...' : 'Create Note'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Property Management Cell Comments */}
        <Card className="mb-6 border-2">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg font-bold uppercase flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Property Management Cell Comments ({pmCommentsFiltered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pmCommentsFiltered.length === 0 ? (
              <div className="p-6 text-center text-gray-600">
                No Property Management comments found. Click on data cells in the main dashboard to create comments.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-bold text-xs uppercase">Comment #</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Property</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Cell ID</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Comment Text</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Created</TableHead>
                    <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pmCommentsFiltered.map((comment) => (
                    <TableRow key={comment.id} className="hover:bg-blue-50">
                      <TableCell className="font-mono font-bold text-blue-600">
                        {comment.commentNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold">{comment.propertyCode}</div>
                        <div className="text-sm text-gray-600">{comment.propertyName}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{comment.cellId}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm">{comment.text}</div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={comment.isCompleted ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                          {comment.isCompleted ? 'Completed' : 'Open'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Property Management Notes & Tasks */}
        <Card className="border-2">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg font-bold uppercase flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Property Management Notes & Tasks ({filteredPMNotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-bold text-xs uppercase">Property ID</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Category</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Priority</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Note</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Created By</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Created</TableHead>
                  <TableHead className="font-bold text-xs uppercase">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPMNotes.map((note) => (
                  <TableRow key={note.id} className="hover:bg-blue-50">
                    <TableCell>
                      <div className="font-bold text-blue-600">{note.property_id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(note.category)}
                        <span className="text-sm capitalize">{note.category}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getPriorityColor(note.priority)}`}>
                        {note.priority.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-md">{note.note_text}</div>
                    </TableCell>
                    <TableCell className="text-sm">{note.created_by}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(note.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}