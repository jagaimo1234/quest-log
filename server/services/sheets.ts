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
    if (!GAS_WEB_APP_URL) {
        console.log("Skipping Spreadsheet update: GAS_WEB_APP_URL not set");
        return;
    }

    try {
        // Fire and forget (don't wait for response too long or don't block main flow if called without await)
        // using await here but with strict timeout
        await axios.post(GAS_WEB_APP_URL, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 5000
        });
        console.log(`Sent history to Spreadsheet: ${payload.questName} (${payload.progress})`);
    } catch (error) {
        console.error("Failed to send to Spreadsheet:", error instanceof Error ? error.message : error);
        // Suppress error to avoid failing the main request
    }
}
