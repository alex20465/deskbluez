

export class BaseDeskError extends Error {
    constructor(message?: string) {
        const trueProto = new.target.prototype;
        super(message);
        Object.setPrototypeOf(this, trueProto);
    }
}

export class NotSupportedError extends BaseDeskError { }

export class UnsupportedServiceError extends BaseDeskError { }