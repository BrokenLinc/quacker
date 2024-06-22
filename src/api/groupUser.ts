import {
  addDoc,
  collection,
  doc,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import _ from 'lodash';
import {
  useCollectionData,
  useDocumentData,
} from 'react-firebase-hooks/firestore';

import { createConverter, firestore } from '../firebase/firestore';

export interface GroupUser {
  uid: string;
  groupId: string;
  userName: string | null;
  userPhotoURL: string | null;
  time: number;
  canPost: boolean;
  canManage: boolean;
}

const groupUserConverter = createConverter<GroupUser>();

export const useGroupUser = (id: string) => {
  const ref = doc(firestore, 'groupUsers', id).withConverter(
    groupUserConverter
  );
  return useDocumentData<GroupUser>(ref);
};

export const useGroupUsers = (options?: {
  groupId?: string;
  userId?: string;
}) => {
  const ref = collection(firestore, 'groupUsers').withConverter(
    groupUserConverter
  );
  const constraints = _.compact([
    options?.groupId && where('groupId', '==', options?.groupId),
    options?.userId && where('userId', '==', options?.userId),
  ]);
  return useCollectionData<GroupUser>(query(ref, ...constraints));
};

export const addGroupUser = (data: GroupUser) => {
  return addDoc(
    collection(firestore, 'groupUsers').withConverter(groupUserConverter),
    data
  );
};

export const updateGroupUser = (id: string, data: Partial<GroupUser>) => {
  const ref = doc(firestore, 'groupUsers', id);
  return updateDoc(ref, data);
};
