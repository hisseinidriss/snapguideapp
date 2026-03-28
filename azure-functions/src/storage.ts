// Azure Blob Storage module - handles file upload and deletion (3-17-2026)
// Used for storing app icons and recording screenshots
import { BlobServiceClient } from "@azure/storage-blob";

// Singleton blob client - reused across function invocations - Hissein
let blobServiceClient: BlobServiceClient | null = null;

// Initialize or return cached BlobServiceClient from connection string (Hissein 3-21-2026)
function getClient(): BlobServiceClient {
  if (!blobServiceClient) {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connStr) throw new Error("AZURE_STORAGE_CONNECTION_STRING not set");
    blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
  }
  return blobServiceClient;
}

// Upload a file buffer to a specified blob container and return the public URL (3-15-2026)
export async function uploadBlob(
  containerName: string,
  blobName: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const client = getClient();
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Upload with explicit content type so browsers render correctly - Hissein
  await blockBlobClient.upload(data, data.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blockBlobClient.url;
}

// Delete a blob if it exists - used when replacing app icons
export async function deleteBlob(
  containerName: string,
  blobName: string
): Promise<void> {
  const client = getClient();
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}