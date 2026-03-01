
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import type { TrpcContext } from "../_core/context.js";
import { getDb } from "../db.js";
import {
    quests,
    questHistory,
    users,
    questTemplates,
    projects,
    userProgression,
    dailyInsights
} from "../../drizzle/schema.js";
import { eq, desc, asc, sql, and, getTableColumns } from "drizzle-orm";

// Map of available tables (Allowed for admin access)
const tables = {
    quests,
    questHistory,
    users,
    questTemplates,
    projects,
    userProgression,
    dailyInsights
} as const;

type TableName = keyof typeof tables;

export const adminRouter = router({
    /**
     * Get list of available tables
     */
    getTables: protectedProcedure.query(() => {
        return Object.keys(tables);
    }),

    /**
     * Get table schema for building forms
     */
    getTableSchema: protectedProcedure
        .input(z.object({ tableName: z.string() }))
        .query(async ({ input }) => {
            const tableName = input.tableName as TableName;
            const table = tables[tableName];
            if (!table) throw new Error(`Table ${input.tableName} not found`);

            const columns = getTableColumns(table as any);
            return Object.entries(columns).map(([key, col]: [string, any]) => ({
                name: key,
                type: col.dataType,
                notNull: col.notNull,
                hasDefault: col.hasDefault,
            }));
        }),

    /**
     * Get raw data from a table
     */
    getTableData: protectedProcedure
        .input(z.object({
            tableName: z.string(),
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            sortBy: z.string().optional(),
            sortOrder: z.enum(["asc", "desc"]).default("desc"),
        }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const tableName = input.tableName as TableName;
            const table = tables[tableName];

            if (!table) {
                throw new Error(`Table ${input.tableName} not found or access denied`);
            }

            // Dynamic sorting
            let orderBy = desc(table.id); // Default to ID desc
            if (input.sortBy && input.sortBy in table) {
                const column = table[input.sortBy as keyof typeof table];
                orderBy = input.sortOrder === "asc" ? asc(column as any) : desc(column as any);
            } else if ('createdAt' in table) {
                // @ts-ignore - we know it has createdAt if check passes commonly
                orderBy = desc(table.createdAt);
            } else if ('updatedAt' in table) {
                // @ts-ignore
                orderBy = desc(table.updatedAt);
            }

            // Fetch data
            const rows = await db.select()
                .from(table)
                .limit(input.limit)
                .offset(input.offset)
                .orderBy(orderBy);

            // Get total count (approximation)
            const countResult = await db.select({ count: sql<number>`count(*)` }).from(table);
            const total = countResult[0].count;

            return {
                rows,
                total,
                page: Math.floor(input.offset / input.limit) + 1,
                pageSize: input.limit
            };
        }),

    /**
     * Update a record
     */
    updateRecord: protectedProcedure
        .input(z.object({
            tableName: z.string(),
            id: z.number(),
            data: z.any()
        }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const tableName = input.tableName as TableName;
            const table = tables[tableName];

            if (!table) {
                throw new Error(`Table ${input.tableName} not found`);
            }

            // Filter out ID from data to prevent changing PK
            // Use 'as any' for input.data to access properties safely after z.any()
            const { id, ...updateData } = input.data as any;

            const processedData: any = { ...updateData };

            // Simple heuristic for date fields
            for (const key of Object.keys(processedData)) {
                if (key.endsWith('At') || key.endsWith('Date') || key === 'deadline') {
                    const val = processedData[key];
                    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
                        processedData[key] = new Date(val);
                    }
                }
            }

            await db.update(table)
                .set(processedData)
                .where(eq(table.id, input.id));

            return { success: true };
        }),

    /**
     * Create a new record
     */
    createRecord: protectedProcedure
        .input(z.object({
            tableName: z.string(),
            data: z.any()
        }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const tableName = input.tableName as TableName;
            const table = tables[tableName];

            if (!table) {
                throw new Error(`Table ${input.tableName} not found`);
            }

            const processedData: any = { ...input.data };

            // Simple heuristic for date fields
            for (const key of Object.keys(processedData)) {
                if (key.endsWith('At') || key.endsWith('Date') || key === 'deadline') {
                    const val = processedData[key];
                    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
                        processedData[key] = new Date(val);
                    }
                }
            }

            await db.insert(table).values(processedData);

            return { success: true };
        }),

    /**
     * Delete a record
     */
    deleteRecord: protectedProcedure
        .input(z.object({
            tableName: z.string(),
            id: z.number()
        }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const tableName = input.tableName as TableName;
            const table = tables[tableName];

            if (!table) {
                throw new Error(`Table ${input.tableName} not found`);
            }

            await db.delete(table)
                .where(eq(table.id, input.id));

            return { success: true };
        })
});
