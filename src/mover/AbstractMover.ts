import { AbstractDesk, DeskState, LENGTH_UNITS } from "../desks/AbstractDesk";
import logger from "../lib/logger";

export abstract class AbstractMover {

    constructor(
        protected state: DeskState,
        protected position: number,
        protected absolute: boolean,
        protected unit: LENGTH_UNITS,
        protected desk: AbstractDesk) {
    }

    abstract onStateChange(position: DeskState);

    abstract perform(): Promise<boolean>;

    abstract get desiredPosition(): number;

    protected get direction(): "up" | "down" {
        if (this.state.value < this.desiredPosition) {
            return "up";
        } else {
            return "down";
        }
    }

    protected async wait(time: number): Promise<void> {
        logger.debug("AB:MOVER: wait for", time);
        return new Promise(resolve => setTimeout(resolve, time));
    }
}