import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuid } from 'uuid';

import { app } from './';

export const storage = getStorage(app);

export const uploadImageBlob = async (blob: Blob) => {
  const blobRef = ref(storage, `/images/${uuid()}`);
  const snapshot = await uploadBytes(blobRef, blob);
  return getDownloadURL(snapshot.ref);
};
