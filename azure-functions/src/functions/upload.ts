// File upload endpoint - handles app icon and recording screenshot uploads (Hissein 3-21-2026)
// Files are stored in Azure Blob Storage with unique UUID-based filenames
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { corsHeaders, jsonResponse, errorResponse } from "../auth";
import { uploadBlob } from "../storage";
import { v4 as uuidv4 } from "uuid";

app.http("upload", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "upload",
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    if (req.method === "OPTIONS") return { status: 204, headers: corsHeaders() };

    try {
      // Parse multipart form data containing file and metadata - Hissein
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const type = formData.get("type") as string;
      const appId = formData.get("app_id") as string;

      if (!file) return errorResponse("No file provided", 400);

      // Convert file to buffer for Azure Blob upload (3-14-2026)
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "png";
      // Generate unique filename to prevent collisions
      const blobName = `${uuidv4()}.${ext}`;

      // Route to appropriate storage container based on upload type
      let containerName = "app-icons";
      if (type === "recording-screenshot") {
        containerName = "recording-screenshots";
      }

      const url = await uploadBlob(containerName, blobName, buffer, file.type);

      // Return both icon_url (legacy) and url for flexibility (Hissein 3-21-2026)
      return jsonResponse({ icon_url: url, url });
    } catch (err: any) {
      context.error("Upload error:", err);
      return errorResponse(err.message);
    }
  },
});