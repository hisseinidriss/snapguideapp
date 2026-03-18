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
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const type = formData.get("type") as string;
      const appId = formData.get("app_id") as string;

      if (!file) return errorResponse("No file provided", 400);

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "png";
      const blobName = `${uuidv4()}.${ext}`;

      let containerName = "app-icons";
      if (type === "recording-screenshot") {
        containerName = "recording-screenshots";
      }

      const url = await uploadBlob(containerName, blobName, buffer, file.type);

      return jsonResponse({ icon_url: url, url });
    } catch (err: any) {
      context.error("Upload error:", err);
      return errorResponse(err.message);
    }
  },
});
