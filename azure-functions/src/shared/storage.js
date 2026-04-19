// Azure Blob Storage helper (replaces Supabase Storage).
const { BlobServiceClient } = require("@azure/storage-blob");

let serviceClient;

function getService() {
  if (!serviceClient) {
    const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");
    serviceClient = BlobServiceClient.fromConnectionString(conn);
  }
  return serviceClient;
}

async function uploadBuffer({ container, path, buffer, contentType }) {
  const containerClient = getService().getContainerClient(container);
  await containerClient.createIfNotExists({ access: "blob" });
  const blob = containerClient.getBlockBlobClient(path);
  await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });
  return publicUrl(container, path);
}

function publicUrl(container, path) {
  const base =
    process.env.STORAGE_PUBLIC_BASE_URL ||
    `https://${getService().accountName}.blob.core.windows.net`;
  return `${base.replace(/\/$/, "")}/${container}/${path}`;
}

async function deletePrefix(container, prefix) {
  const containerClient = getService().getContainerClient(container);
  const exists = await containerClient.exists();
  if (!exists) return;
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    await containerClient.deleteBlob(blob.name).catch(() => {});
  }
}

async function deleteBlob(container, path) {
  const containerClient = getService().getContainerClient(container);
  await containerClient.deleteBlob(path).catch(() => {});
}

// Extract storage path from a public URL like
// https://acct.blob.core.windows.net/recording-screenshots/<id>/step-1.png
function extractPathFromUrl(container, url) {
  if (!url) return null;
  const marker = `/${container}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split("?")[0];
}

module.exports = { uploadBuffer, publicUrl, deletePrefix, deleteBlob, extractPathFromUrl };
