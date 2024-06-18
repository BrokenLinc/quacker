import {
  getFirestore,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreDataConverter,
  WithFieldValue,
  SnapshotOptions,
} from 'firebase/firestore';
import _ from 'lodash';

import { app } from '.';

export const firestore = getFirestore(app);

export const createConverter = function <T>() {
  type K = T & {
    id: string;
  };

  const converter: FirestoreDataConverter<K> = {
    toFirestore(entity: WithFieldValue<K>): DocumentData {
      return _.omit(entity, 'id', 'ref');
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): K {
      const data = snapshot.data(options) as T;
      return {
        id: snapshot.id,
        ...data,
      };
    },
  };
  return converter;
};
