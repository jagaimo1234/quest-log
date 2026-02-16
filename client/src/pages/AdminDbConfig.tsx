
import React, { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { useAuth } from "../lib/auth";
import { Layout } from "../components/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../components/ui/dialog";
import { Loader2, Trash2, Edit, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";

export default function AdminDbConfig() {
    const { user } = useAuth();
    const [selectedTable, setSelectedTable] = useState<string>("quests");
    const [page, setPage] = useState(0);
    const [limit] = useState(20);
    const [editRow, setEditRow] = useState<any>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [formData, setFormData] = useState<Record<string, any>>({});

    const utils = trpc.useContext();

    // Redirect if not authenticated (Basic check, real protection is on server)
    // if (!user) return <div>Access Denied</div>;

    const { data: tables } = trpc.admin.getTables.useQuery();
    const { data: tableData, isLoading, refetch } = trpc.admin.getTableData.useQuery(
        { tableName: selectedTable, limit, offset: page * limit }
    );

    const updateMutation = trpc.admin.updateRecord.useMutation({
        onSuccess: () => {
            setIsEditOpen(false);
            setEditRow(null);
            refetch();
        },
    });

    const deleteMutation = trpc.admin.deleteRecord.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

    const handleEdit = (row: any) => {
        setEditRow(row);
        setFormData({ ...row });
        setIsEditOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this record? This cannot be undone.")) {
            await deleteMutation.mutateAsync({ tableName: selectedTable, id });
        }
    };

    const handleSave = async () => {
        if (!editRow) return;

        // Convert strings back to numbers/booleans/JSON where appropriate if possible
        // For now, we rely on the server handling mostly, but let's try to be smart about JSON fields
        const dataToSend = { ...formData };

        for (const key of Object.keys(dataToSend)) {
            // If the original was an object/array, try to parse the string input back
            if (typeof editRow[key] === 'object' && editRow[key] !== null && !(editRow[key] instanceof Date)) {
                try {
                    if (typeof dataToSend[key] === 'string') {
                        dataToSend[key] = JSON.parse(dataToSend[key]);
                    }
                } catch (e) {
                    // Failed to parse, maybe leave it or error? 
                    // Ideally show validation error
                    alert(`Invalid JSON for field ${key}`);
                    return;
                }
            }
        }

        await updateMutation.mutateAsync({
            tableName: selectedTable,
            id: editRow.id,
            data: dataToSend
        });
    };

    const renderCell = (key: string, value: any) => {
        if (value === null || value === undefined) return <span className="text-muted-foreground italic">null</span>;
        if (typeof value === "boolean") return value ? "true" : "false";
        if (value instanceof Date) return value.toLocaleString();
        if (typeof value === "object") return <pre className="text-xs max-w-[200px] overflow-hidden truncate">{JSON.stringify(value)}</pre>;
        if (String(value).length > 50) return <span title={String(value)}>{String(value).substring(0, 50)}...</span>;
        return String(value);
    };

    const renderEditField = (key: string, value: any) => {
        if (key === "id" || key === "createdAt" || key === "updatedAt") return null; // Skip read-only fields

        const originalValue = editRow[key];
        const isDate = originalValue instanceof Date || (typeof originalValue === 'string' && !isNaN(Date.parse(originalValue)) && key.endsWith('At'));
        const isBoolean = typeof originalValue === "boolean";
        const isLongText = typeof originalValue === "string" && originalValue.length > 50;
        const isObject = typeof originalValue === "object" && originalValue !== null && !(originalValue instanceof Date);

        if (isBoolean) {
            return (
                <div key={key} className="grid grid-cols-4 items-center gap-4">
                    <label className="text-right text-sm font-medium">{key}</label>
                    <div className="col-span-3">
                        <select
                            className="w-full border rounded p-2"
                            value={String(formData[key])}
                            onChange={e => setFormData({ ...formData, [key]: e.target.value === 'true' })}
                        >
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </select>
                    </div>
                </div>
            );
        }

        return (
            <div key={key} className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium">{key}</label>
                {isObject ? (
                    <textarea
                        className="col-span-3 w-full border rounded p-2 text-xs font-mono"
                        rows={4}
                        value={typeof formData[key] === 'string' ? formData[key] : JSON.stringify(formData[key], null, 2)}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    />
                ) : (
                    <Input
                        className="col-span-3"
                        value={formData[key] === null ? '' : formData[key]}
                        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                        type={isDate ? "datetime-local" : "text"}
                    />
                )}
            </div>
        );
    };

    if (!user) return <div className="p-8 text-center text-muted-foreground">Please log in to access admin tools.</div>;

    return (
        <Layout title="DB Admin">
            <div className="space-y-4">
                <div className="flex justify-between items-center overflow-x-auto pb-2 gap-2">
                    <div className="flex gap-2">
                        {tables?.map((table) => (
                            <Button
                                key={table}
                                variant={selectedTable === table ? "default" : "outline"}
                                onClick={() => { setSelectedTable(table); setPage(0); }}
                                size="sm"
                                className="whitespace-nowrap"
                            >
                                {table}
                            </Button>
                        ))}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => refetch()}>
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>

                <div className="rounded-md border bg-card">
                    <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Actions</TableHead>
                                    {tableData?.rows?.[0] && Object.keys(tableData.rows[0]).map((key) => (
                                        <TableHead key={key} className="whitespace-nowrap">{key}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-24 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : tableData?.rows?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                            No data found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tableData?.rows?.map((row: any) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="flex gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => handleEdit(row)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(row.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                            {Object.entries(row).map(([key, value]) => (
                                                <TableCell key={key} className="whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                                                    {renderCell(key, value)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Total: {tableData?.total || 0}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                            Prev
                        </Button>
                        <span className="flex items-center px-2 text-sm">Page {page + 1}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!tableData?.rows || tableData.rows.length < limit}>
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Record ({selectedTable})</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {editRow && Object.keys(editRow).map(key => renderEditField(key, editRow[key]))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={updateMutation.isPending}>
                            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
