function doPost(e) {
    try {
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        var data = JSON.parse(e.postData.contents);

        // Header check
        // Changed Columns: Timestamp, Date, QuestName, Project, Type, Status, PlannedSlot, ExecutionType, Progress
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(["Timestamp", "Date", "QuestName", "Project", "Type", "Status", "PlannedSlot", "ExecutionType", "Progress"]);
        }

        // Append row
        // Mapped from payload keys defined in server/services/sheets.ts
        sheet.appendRow([
            new Date(),
            data.recordedDate,
            data.questName || "",
            data.projectName || "",
            data.questType,
            data.finalStatus,
            data.plannedTimeSlot || "",
            data.executionType,
            data.progress
        ]);

        return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
}
