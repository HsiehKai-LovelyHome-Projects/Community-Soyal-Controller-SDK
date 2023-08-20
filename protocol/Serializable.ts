export interface Serializable {
    serialize(): Uint8Array;
}

// For application layer only
export interface DeserializeResult<T> {
    instance: T;
    bufferConsumed: number;
}