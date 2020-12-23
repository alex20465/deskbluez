import { AbstractDesk, Command, DeskState, DESK_EVENT, LENGTH_UNITS } from "./AbstractDesk";
import { LinakMover } from "../mover/LinakMover";
import { LinakTranscoder } from "../transcoder/LinakTranscoder";
import logger from "../lib/logger";

enum COMMANDS {
    GET_CURRENT_STATE = "getCurrentState",
    CONTROL = "control",
    NOTIFICATION = "notification"
}

export class LinakDesk extends AbstractDesk {

    private currentState: DeskState;

    private transcoder = new LinakTranscoder(this);

    commands = (): Command[] => [
        {
            name: COMMANDS.GET_CURRENT_STATE,
            service: "99fa0020-338a-1024-8a49-009c0215f78a",
            characteristic: "99fa0021-338a-1024-8a49-009c0215f78a"
        },
        {
            name: COMMANDS.CONTROL,
            service: "99fa0001-338a-1024-8a49-009c0215f78a",
            characteristic: "99fa0002-338a-1024-8a49-009c0215f78a"
        },
        {
            name: COMMANDS.NOTIFICATION,
            service: "99fa0020-338a-1024-8a49-009c0215f78a",
            characteristic: "99fa0021-338a-1024-8a49-009c0215f78a"
        }
    ]

    async subscribe() {
        const characteristic = this.getCharacteristic(COMMANDS.NOTIFICATION);
        logger.debug("LINAK:DESK: subscribe notifications");
        await characteristic.StartNotify();
        // just to define the current state.
        this.currentState = await this.state();
        characteristic.on("notify", this.handleStateChangeNotification);
    }

    protected handleStateChangeNotification = (data: string) => {
        const position = this.transcoder.decodeState(data);
        this.emitter.emit(DESK_EVENT.STATE_CHANGE, position);
    }

    offset() {
        return 6150;
    }

    total() {
        return 6500;
    }

    async up() {
        const characteristic = this.getCharacteristic(COMMANDS.CONTROL);
        const value = this.transcoder.encodeUp();
        logger.debug("LINAK:DESK: handle UP, write value", COMMANDS.CONTROL, value);
        await characteristic.WriteValue(value);
    }

    async down() {
        const characteristic = this.getCharacteristic(COMMANDS.CONTROL);
        const value = this.transcoder.encodeDown();
        logger.debug("LINAK:DESK: handle DOWN, write value", COMMANDS.CONTROL, value);
        await characteristic.WriteValue(this.transcoder.encodeDown());
    }

    async state(): Promise<DeskState> {
        const characteristic = this.getCharacteristic(COMMANDS.GET_CURRENT_STATE);
        logger.debug("LINAK:DESK: request state...");
        const data = await characteristic.ReadValue();
        const state = this.transcoder.decodeState(data);
        logger.debug("LINAK:DESK: received state:", state);
        return state;
    }

    async stop() {
        const characteristic = this.getCharacteristic(COMMANDS.CONTROL);
        const value = this.transcoder.encodeStop();
        logger.debug("LINAK:DESK: handle STOP, write value", COMMANDS.CONTROL, value);
        await characteristic.WriteValue(this.transcoder.encodeStop());
    }

    async moveTo(position: number, unit: LENGTH_UNITS) {

        logger.debug("LINAK:DESK: prepare move to", {
            position, unit
        });

        const mover = new LinakMover(
            this.currentState,
            position,
            true,
            unit,
            this);

        this.addListener(DESK_EVENT.STATE_CHANGE, mover.onStateChange);

        const completed = await mover.perform();

        this.removeListener(DESK_EVENT.STATE_CHANGE, mover.onStateChange);

        return completed;
    }
}