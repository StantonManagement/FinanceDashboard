import { Card, CardContent } from '@/components/ui/card';
import type { Note, ActionItem } from '@shared/schema';

interface NotesTabProps {
  notes: Note[];
  actionItems: ActionItem[];
}

export function NotesTab({ notes, actionItems }: NotesTabProps) {
  return (
    <div>
      <h3 className="text-lg font-bold uppercase text-institutional-black mb-4">
        Action Items & Notes
      </h3>
      
      <div className="grid grid-cols-2 gap-5">
        <div>
          <h4 className="font-bold text-sm uppercase mb-3">Open Action Items</h4>
          <div className="space-y-2">
            {actionItems.map((item: ActionItem) => (
              <Card key={item.id} className="border border-institutional-border bg-institutional-accent">
                <CardContent className="p-3">
                  <div className="text-sm font-bold">{item.itemId}: Review Action Item</div>
                  <div className="text-xs text-gray-600">
                    Property: S0010 | Priority: {item.priority} | Created: {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm mt-1">{item.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-bold text-sm uppercase mb-3">Recent Notes</h4>
          <div className="space-y-2">
            {notes.map((note: Note) => (
              <Card key={note.id} className="border border-institutional-border bg-institutional-accent">
                <CardContent className="p-3">
                  <div className="text-sm font-bold">GL {note.cellId.replace('gl-', '')} Note</div>
                  <div className="text-xs text-gray-600">
                    Added: {new Date(note.createdAt).toLocaleString()}
                  </div>
                  <div className="text-sm mt-1">{note.text}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}