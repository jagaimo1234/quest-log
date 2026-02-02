import axios from "axios";

// This should be set via environment variable
const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL;

export interface SheetPayload {
    recordedDate: string;
    questName: string | null;
    projectName: string | null;
    questType: string;
    finalStatus: string;
    plannedTimeSlot: string | null;
    executionType: "FIX" | "NON-FIX";
    progress: string; // e.g. "1/3"
}

export async function sendToSpreadsheet(payload: SheetPayload) {
    // Log payload for debugging (Vercel Logs)
    console.log("[Sheets] Preparing to send payload:", JSON.stringify(payload));

    if (!GAS_WEB_APP_URL) {
        console.error("[Sheets] ERROR: GAS_WEB_APP_URL is not set in environment variables! Skipping update.");
        return;
    }

    try {
        // Fire and forget (don't wait for response too long or don't block main flow if called without await)
        // using await here but with strict timeout
        const response = await axios.post(GAS_WEB_APP_URL, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 5000
        });
        console.log(`[Sheets] Successfully sent history: ${payload.questName} (${payload.progress}). Status: ${response.status}`);
    } catch (error) {
        console.error("[Sheets] Failed to send to Spreadsheet:", error instanceof Error ? error.message : error);
        if (axios.isAxiosError(error)) {
            console.error("[Sheets] Axios Response:", error.response?.data);
            console.error("[Sheets] Axios Code:", error.code);
        }
    }
}
