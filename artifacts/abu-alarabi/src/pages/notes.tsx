import { useState, useRef, useEffect } from "react";
import { useListNotes, useCreateNote, useUpdateNote, useDeleteNote, useListSubjects } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, StickyNote, Trash2, Pin, PinOff, Tag, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Notes() {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<number | undefined>();
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editor state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubjectId, setEditSubjectId] = useState<number>(1); // default fallback
  
  const { data: notesList, isLoading } = useListNotes({ subjectId: subjectFilter });
  const { data: subjects } = useListSubjects();
  
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  // Auto-save logic reference
  const autoSaveTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (activeNoteId && isEditing) {
      clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = setTimeout(() => {
        updateNote.mutate({
          id: activeNoteId,
          data: { title: editTitle, content: editContent }
        });
      }, 1000);
    }
    return () => clearTimeout(autoSaveTimeout.current);
  }, [editTitle, editContent, activeNoteId, isEditing]);

  const handleCreateNew = () => {
    const subjectIdToUse = subjectFilter || (subjects && subjects[0]?.id) || 1;
    createNote.mutate(
      { data: { title: "ملاحظة جديدة", content: "", subjectId: subjectIdToUse } },
      {
        onSuccess: (newNote) => {
          setActiveNoteId(newNote.id);
          setEditTitle(newNote.title);
          setEditContent(newNote.content);
          setEditSubjectId(newNote.subjectId);
          setIsEditing(true);
        }
      }
    );
  };

  const handleSelectNote = (note: any) => {
    setActiveNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditSubjectId(note.subjectId);
    setIsEditing(true);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) {
      deleteNote.mutate({ id }, {
        onSuccess: () => {
          if (activeNoteId === id) {
            setActiveNoteId(null);
            setIsEditing(false);
          }
        }
      });
    }
  };

  const togglePin = (id: number, isPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    updateNote.mutate({ id, data: { isPinned: !isPinned }});
  };

  // Filter local search since API might not have text search
  const filteredNotes = (Array.isArray(notesList) ? notesList : []).filter(n => 
    n.title.includes(search) || n.content.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
        
        {/* Left/Main Sidebar: Notes List */}
        <div className={`w-full md:w-80 lg:w-96 flex flex-col h-full ${activeNoteId ? 'hidden md:flex' : 'flex'}`}>
          <div className="mb-4 space-y-4">
            <h1 className="text-3xl font-black flex items-center gap-3">
              <StickyNote className="w-8 h-8 text-primary" /> ملاحظاتي
            </h1>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="بحث..." 
                  className="pr-9 bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateNew} size="icon" className="shrink-0" disabled={createNote.isPending}>
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Subject Filters horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button 
                onClick={() => setSubjectFilter(undefined)}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors ${!subjectFilter ? 'bg-primary text-white' : 'bg-white border text-muted-foreground hover:bg-muted'}`}
              >
                الكل
              </button>
              {subjects?.map(s => (
                <button 
                  key={s.id}
                  onClick={() => setSubjectFilter(s.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors ${subjectFilter === s.id ? 'bg-primary text-white' : 'bg-white border text-muted-foreground hover:bg-muted'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <StickyNote className="w-12 h-12 mx-auto mb-2" />
                <p>لا توجد ملاحظات</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredNotes.map((note) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={note.id}
                  >
                    <Card 
                      className={`cursor-pointer transition-all border-l-4 overflow-hidden ${activeNoteId === note.id ? 'bg-primary/5 border-l-primary shadow-md' : 'bg-white hover:bg-gray-50 border-l-transparent'}`}
                      onClick={() => handleSelectNote(note)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold truncate pr-2 text-sm">{note.title || 'بدون عنوان'}</h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={(e) => togglePin(note.id, !!note.isPinned, e)} className="text-muted-foreground hover:text-primary">
                              {note.isPinned ? <Pin className="w-4 h-4 fill-primary text-primary" /> : <PinOff className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 h-8">
                          {note.content || '...'}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-muted rounded text-muted-foreground">{note.subjectName}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {new Date(note.createdAt).toLocaleDateString('ar-JO')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right/Editor Area */}
        <div className={`flex-1 h-full flex flex-col ${!activeNoteId ? 'hidden md:flex' : 'flex'}`}>
          {activeNoteId ? (
            <Card className="flex-1 flex flex-col bg-white/80 backdrop-blur-xl border-white overflow-hidden shadow-xl">
              <div className="p-4 border-b border-black/5 flex items-center justify-between bg-white/50">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveNoteId(null)}>
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  <select 
                    className="bg-transparent font-bold text-sm text-primary focus:outline-none cursor-pointer"
                    value={editSubjectId}
                    onChange={(e) => {
                      const newId = parseInt(e.target.value);
                      setEditSubjectId(newId);
                      updateNote.mutate({ id: activeNoteId, data: { subjectId: newId } as any }); // Mock cast since subjectId might not be in NoteUpdate exactly based on schema, but logically it should be
                    }}
                  >
                    {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline-block">
                    {updateNote.isPending ? 'جاري الحفظ...' : 'تم الحفظ تلقائياً'}
                  </span>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => handleDelete(activeNoteId, e)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <input
                  type="text"
                  placeholder="عنوان الملاحظة..."
                  className="text-2xl md:text-3xl font-black mb-6 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 w-full"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                
                <textarea
                  placeholder="اكتب ملاحظاتك هنا... (يتم الحفظ تلقائياً)"
                  className="flex-1 resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-base md:text-lg leading-relaxed text-gray-700 placeholder:text-muted-foreground/30 scrollbar-hide"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>
            </Card>
          ) : (
            <div className="flex-1 rounded-3xl border-2 border-dashed border-muted bg-white/30 flex flex-col items-center justify-center text-muted-foreground">
              <StickyNote className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg">اختر ملاحظة لقراءتها أو أنشئ واحدة جديدة</p>
              <Button onClick={handleCreateNew} variant="outline" className="mt-4 bg-white">
                <Plus className="w-4 h-4 ml-2" /> ملاحظة جديدة
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// Fix missing chevron right import
import { ChevronRight } from "lucide-react";