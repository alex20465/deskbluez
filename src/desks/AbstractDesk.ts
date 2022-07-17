import Bluez from "bluez";
import { EventEmitter } from "events";
import logger from "../lib/logger";
import { NotSupportedError, UnsupportedServiceError } from "./errors";

export interface Command {
    name: string
    service: string
    characteristic: string
}

export enum DESK_EVENT {
    STATE_CHANGE = "stateChange"
}

export type DeskState = {
    value: number

    // Desk Absolute Height position in CM and INCHES
    cm: number
    inch: number

    speed: number
}

export type DeskEvent = DeskState;

export type DeskEventListener = (event: DeskEvent) => void

export enum LENGTH_UNITS {
    CM = "cm",
    DESK = "desk",
    INC = "inch"
}

export abstract class AbstractDesk {

    public readonly device: Bluez.Device;

    protected emitter: EventEmitter;

    constructor(device: Bluez.Device) {
        this.device = device;
        this.emitter = new EventEmitter();
    }

    getCommand(name: string): Command | null {
        const commands = this.commands()
            .filter(command => command.name === name);

        if (commands.length) {
            logger.debug("AB:DESK: requested command", commands[0]);
            return commands[0];
        } else {
            logger.warn("AB:DESK: requested not existing command", name);
            return null;
        }
    }

    async getCharacteristic(name: string) {
        const command = this.getCommand(name);
        const service = await this.device.getService(command.service);

        if (!service) {
            throw new UnsupportedServiceError(`Service ${name} [${command.service}] not available.`);
        }
        logger.debug("AB:DESK: request characteristic", name);
        return service.getCharacteristic(command.characteristic);
    }

    async subscribe() {
        throw new NotSupportedError("Notification aren't supported");
    }

    async connect() {
        logger.debug("AB:DESK: connecting...");
        await this.device.Connect();
    }

    async disconnect() {
        logger.debug("AB:DESK: disconnecting...");
        await this.device.Disconnect();
    }

    async addListener(event: DESK_EVENT, listener: DeskEventListener) {
        logger.debug("AB:DESK: register event listener", event);
        this.emitter.addListener(event, listener);
    }

    async removeListener(event: DESK_EVENT, listener) {
        logger.debug("AB:DESK: remove event listener", event);
        this.emitter.removeListener(event, listener);
    }

    abstract commands(): Command[];

    abstract up(): Promise<void>

    abstract down(): Promise<void>

    abstract stop(): Promise<void>

    abstract moveTo(position: number, unit: LENGTH_UNITS): Promise<boolean>

    abstract state(): Promise<DeskState>

    abstract offset(): number;

    abstract total(): number;

    async isSupported(): Promise<boolean> {


        for (const command of this.commands()) {
            const service = await this.device.getService(command.service);

            if (!service) {
                logger.debug("No service found, command not supported", {
                    device: await this.device.Address(),
                    command,
                });
                return false;
            }

            const characteristic = await service.getCharacteristic(command.characteristic);

            if (!characteristic) {
                logger.debug("No characteristic found, command not supported", {
                    device: await this.device.Address(),
                    command,
                });
                return false;
            }
        }

        return true;
    };
}
