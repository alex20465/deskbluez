import { AbstractDesk, DeskState } from "../desks/AbstractDesk";

export abstract class AbstractTranscoder {

    constructor(protected desk: AbstractDesk) { }

    abstract decodeState(data: ArrayBuffer | Buffer | String): DeskState;
    abstract encodeUp(): number[];
    abstract encodeDown(): number[];
    abstract encodeStop(): number[];

    protected hexToBytes = (hex: string) => {
        const result = [];
        for (var i = 0; i < hex.length; i += 2) {
            result.push(parseInt(hex.substr(i, 2), 16));
        }
        return result;
    }

    protected unpack = (data: string): Buffer => {
        const arrayBuffer = Buffer.alloc(data.length);
        for (var i = 0; i < data.length; i++) {
            var char = ("" + data[i]).charCodeAt(0);
            arrayBuffer[i] = char;
        }
        return arrayBuffer;
    }
}