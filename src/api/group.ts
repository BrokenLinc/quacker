import {
  addDoc,
  collection,
  doc,
  limit,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import {
  useCollectionData,
  useDocumentData,
} from 'react-firebase-hooks/firestore';

import { createConverter, firestore } from '../firebase/firestore';

export interface Group {
  uid: string;
  authorName: string | null;
  authorPhotoURL: string | null;
  time: number;
  name: string;
}

const groupConverter = createConverter<Group>();

export const useGroup = (id: string) => {
  const ref = doc(firestore, 'groups', id).withConverter(groupConverter);
  return useDocumentData<Group>(ref);
};

export const useGroups = (options?: { limit: number }) => {
  const ref = collection(firestore, 'groups').withConverter(groupConverter);
  return useCollectionData<Group>(
    query(ref, orderBy('time', 'desc'), limit(options?.limit || 1000))
  );
};

export const addGroup = (data: Group) => {
  return addDoc(
    collection(firestore, 'groups').withConverter(groupConverter),
    data
  );
};

export const updateGroup = (id: string, data: Partial<Group>) => {
  const ref = doc(firestore, 'groups', id);
  return updateDoc(ref, data);
};
