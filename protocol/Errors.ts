export class PacketFormatError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PacketFormatError';
    }
}

export class PacketValueError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PacketValueError';
    }
}


export class PacketCheckSumError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PacketCheckSumError';
    }

}

export class UnknownProtocol extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnknownProtocol';
    }
}

export class UnsuccessfulOperation extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnsuccessfulOperation';
    }
}

export class InvalidProtocol extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidProtocol';
    }
}