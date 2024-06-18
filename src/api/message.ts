import {
  addDoc,
  collection,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';

import { createConverter, firestore } from '../firebase/firestore';

export interface Message {
  uid: string;
  authorName: string | null;
  authorPhotoURL: string | null;
  time: number;
  text: string;
  groupId: string;
}

const messageConverter = createConverter<Message>();

export const useGroupMessages = (
  groupId: string,
  options?: { limit: number }
) => {
  const ref = collection(firestore, 'messages').withConverter(messageConverter);
  return useCollectionData(
    query(
      ref,
      where('groupId', '==', groupId),
      orderBy('time', 'desc'),
      limit(options?.limit || 1000)
    )
  );
};

export const useMessages = (options?: { limit: number }) => {
  const ref = collection(firestore, 'messages').withConverter(messageConverter);
  return useCollectionData(
    query(ref, orderBy('time', 'desc'), limit(options?.limit || 1000))
  );
};

export const addMessage = (data: Message) => {
  return addDoc(
    collection(firestore, 'messages').withConverter(messageConverter),
    data
  );
};
