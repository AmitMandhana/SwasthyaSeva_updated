export interface CloudinarySignatureResponse {
  timestamp: number;
  signature: string;
  api_key: string;
  cloud_name: string;
}

export async function uploadToCloudinary(
  file: File | Blob,
  getSignature: () => Promise<CloudinarySignatureResponse>,
): Promise<string> {
  const sig = await getSignature();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  formData.append("api_key", sig.api_key);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? "Image upload failed");
  }

  const data = await res.json();
  return data.secure_url;
}
