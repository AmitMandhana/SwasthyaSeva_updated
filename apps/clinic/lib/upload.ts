import { uploadToCloudinary as upload } from "@swasthyaseva/ui";
import { getCloudinarySignature } from "./api";

export function uploadToCloudinary(file: File): Promise<string> {
  return upload(file, getCloudinarySignature);
}
