export interface Model {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export default function withTimestamps<T>(obj: T): T & Model {
  // Because Firebase cannot store Date objects, they must
  // be stored as strings, or as millis. Generally, when a
  //  Date is printed, `#toISOString()` is usually called
  // intrinsicly. Attempting to store Date objects will
  // cause the key to not set in Firebase.
  const timestamps: Model = {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  return {
    ...obj,
    ...timestamps,
  };
}
