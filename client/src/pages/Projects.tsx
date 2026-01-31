import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Folder, Calendar, Trash2, Pencil, RefreshCw, ChevronDown, ChevronRight, Briefcase } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Projects() {
    const [openNewProject, setOpenNewProject] = useState(false);
    const { data: projects, refetch: refetchProjects } = trpc.project.list.useQuery();
    const { data: templates, refetch: refetchTemplates } = trpc.template.list.useQuery();

    // Refresh both on updates
    const refreshAll = () => {
        refetchProjects();
        refetchTemplates();
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-8 font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => window.location.href = "/"}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                    </div>
                    <Button onClick={() => setOpenNewProject(true)} size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> 新規プロジェクト
                    </Button>
                </div>

                <div className="space-y-4">
                    {projects?.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10 opacity-50">
                            <Folder className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>プロジェクトがありません</p>
                        </div>
                    ) : (
                        projects?.map(project => (
                            <ParentProjectCard
                                key={project.id}
                                project={project}
                                templates={templates?.filter(t => t.projectId === project.id) || []}
                                onUpdate={refreshAll}
                            />
                        ))
                    )}
                </div>

                <ParentProjectDialog open={openNewProject} onOpenChange={setOpenNewProject} onSubmitted={refreshAll} />
            </div>
        </div>
    );
}

function ParentProjectCard({ project, templates, onUpdate }: { project: any, templates: any[], onUpdate: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [openNewWork, setOpenNewWork] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const deleteProject = trpc.project.delete.useMutation();

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("プロジェクトを削除しますか？配下のワークもアーカイブされます。")) {
            await deleteProject.mutateAsync({ projectId: project.id });
            onUpdate();
        }
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-card border rounded-xl shadow-sm transition-all">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                        <Folder className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base">{project.name}</h3>
                        {project.description && <p className="text-xs text-muted-foreground">{project.description}</p>}
                        {project.startDate && project.endDate && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(project.startDate), "yyyy/MM/dd")} - {format(new Date(project.endDate), "yyyy/MM/dd")}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full mr-2">
                        {templates.length} works
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <CollapsibleContent>
                <div className="p-4 pt-0 border-t border-dashed bg-muted/10">
                    <div className="space-y-2 mt-4">
                        {templates.map(tmpl => (
                            <WorkItem key={tmpl.id} template={tmpl} onUpdate={onUpdate} />
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4 border-dashed gap-2 text-muted-foreground hover:text-foreground" onClick={() => setOpenNewWork(true)}>
                        <Plus className="w-4 h-4" /> ワークを追加
                    </Button>
                </div>
            </CollapsibleContent>

            <ParentProjectDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                initialData={project}
                onSubmitted={onUpdate}
            />

            {/* New Work Dialog */}
            <WorkDialog
                open={openNewWork}
                onOpenChange={setOpenNewWork}
                projectId={project.id}
                onSubmitted={onUpdate}
            />
        </Collapsible>
    );
}

function WorkItem({ template, onUpdate }: { template: any, onUpdate: () => void }) {
    const [editOpen, setEditOpen] = useState(false);
    const deleteTemplate = trpc.template.delete.useMutation();

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("このワークを削除しますか？")) {
            await deleteTemplate.mutateAsync({ templateId: template.id });
            onUpdate();
        }
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-background border hover:border-indigo-300 transition-colors group">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="font-bold text-sm text-foreground">{template.questName}</h4> {/* ワーク名 */}
                    <p className="text-xs text-muted-foreground">{template.projectName}</p> {/* メモ */}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex flex-col items-end text-xs text-muted-foreground mr-2">
                    <div className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        {formatFrequency(template)}
                    </div>
                    {template.endDate && (
                        <span>~{format(new Date(template.endDate), "MM/dd")}</span>
                    )}
                </div>

                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)}>
                        <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete}>
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            <WorkDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                initialData={template}
                onSubmitted={onUpdate}
            />
        </div>
    );
}

function formatFrequency(t: any) {
    if (t.daysOfWeek) {
        const days = ["日", "月", "火", "水", "木", "金", "土"];
        const selected = JSON.parse(t.daysOfWeek).map((d: number) => days[d]);
        return selected.join("・");
    }
    if (t.weeksOfMonth) return `月次 (第${JSON.parse(t.weeksOfMonth).join("・")}週)`;
    if (t.datesOfMonth) return `月次 (${JSON.parse(t.datesOfMonth).join("・")}日)`;
    return "毎日";
}

// Parent Project Dialog
function ParentProjectDialog({ open, onOpenChange, onSubmitted, initialData }: { open: boolean, onOpenChange: (v: boolean) => void, onSubmitted: () => void, initialData?: any }) {
    const createProject = trpc.project.create.useMutation();
    const updateProject = trpc.project.update.useMutation();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            startDate: formData.get("startDate") as string || null,
            endDate: formData.get("endDate") as string || null,
        };

        try {
            if (initialData) {
                await updateProject.mutateAsync({ projectId: initialData.id, ...data });
                toast.success("プロジェクトを更新しました");
            } else {
                await createProject.mutateAsync(data);
                toast.success("プロジェクトを作成しました");
            }
            onOpenChange(false);
            onSubmitted();
        } catch (e) {
            toast.error("保存に失敗しました");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>{initialData ? "プロジェクト編集" : "新規プロジェクト"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><Label>プロジェクト名</Label><Input name="name" defaultValue={initialData?.name} required placeholder="例：マルシェ出店" /></div>
                    <div><Label>メモ</Label><Input name="description" defaultValue={initialData?.description} placeholder="詳細 / メモ" /></div>

                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>開始日 (任意)</Label><Input type="date" name="startDate" defaultValue={initialData?.startDate ? format(new Date(initialData.startDate), "yyyy-MM-dd") : ""} /></div>
                        <div><Label>終了日 (任意)</Label><Input type="date" name="endDate" defaultValue={initialData?.endDate ? format(new Date(initialData.endDate), "yyyy-MM-dd") : ""} /></div>
                    </div>

                    <Button type="submit" className="w-full">{initialData ? "更新" : "作成"}</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Work (Child) Dialog
function WorkDialog({ open, onOpenChange, onSubmitted, projectId, initialData }: { open: boolean, onOpenChange: (v: boolean) => void, onSubmitted: () => void, projectId?: number, initialData?: any }) {
    const createTemplate = trpc.template.create.useMutation();
    const updateTemplate = trpc.template.update.useMutation();
    const [selectedDays, setSelectedDays] = useState<number[]>(initialData?.daysOfWeek ? JSON.parse(initialData.daysOfWeek) : []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // Data mapping for Work
        const data = {
            questName: formData.get("questName") as string, // ワーク名
            projectName: formData.get("projectName") as string, // メモ
            questType: "Project" as const,
            startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
            endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
            daysOfWeek: selectedDays.length > 0 ? selectedDays : null,
            projectId: projectId || initialData?.projectId, // Link to parent
        };

        try {
            if (initialData) {
                await updateTemplate.mutateAsync({ templateId: initialData.id, ...data });
                toast.success("ワークを更新しました");
            } else {
                await createTemplate.mutateAsync(data);
                toast.success("ワークを作成しました");
            }
            onOpenChange(false);
            onSubmitted();
        } catch (e) {
            console.error(e);
            toast.error("保存に失敗しました");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{initialData ? "ワーク編集" : "新規ワーク追加"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><Label>ワーク名</Label><Input name="questName" defaultValue={initialData?.questName} required placeholder="例：商品開発" /></div>
                    <div><Label>メモ</Label><Input name="projectName" defaultValue={initialData?.projectName} placeholder="詳細など" /></div>

                    <div className="grid grid-cols-2 gap-4">
                        <div><Label>開始日</Label><Input type="date" name="startDate" defaultValue={initialData?.startDate ? format(new Date(initialData.startDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")} /></div>
                        <div><Label>終了日 (期限)</Label><Input type="date" name="endDate" defaultValue={initialData?.endDate ? format(new Date(initialData.endDate), "yyyy-MM-dd") : ""} required /></div>
                    </div>

                    <div className="space-y-2 border rounded-md p-3">
                        <Label>周期設定</Label>
                        <div className="flex gap-2 mb-2">
                            {[0, 1, 2, 3, 4, 5, 6].map(day => (
                                <div key={day}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs cursor-pointer border transition-colors ${selectedDays.includes(day) ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-muted text-muted-foreground'}`}
                                    onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                                >
                                    {["日", "月", "火", "水", "木", "金", "土"][day]}
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">曜日を選択（例：月・水）。未選択の場合は「特定なし（日数のみ）」として扱われます。</p>
                    </div>

                    <Button type="submit" className="w-full">{initialData ? "更新" : "作成"}</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
