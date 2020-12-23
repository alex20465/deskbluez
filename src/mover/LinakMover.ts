import { DeskState, LENGTH_UNITS } from "../desks/AbstractDesk";
import logger from "../lib/logger";
import { AbstractMover } from "./AbstractMover";

export class LinakMover extends AbstractMover {

    /**
     * @unit micrometer
     * 
     * This value defines the accuracy between currentPosition and move-to-position
     * which is used to finished | stop the mover.
     * 
     * Example: If the current position is 1500/mu and our desired move-to position is 1550/mu (TOLERANCE=50).
     * with the FINISH_TOLERANCE=60 the mover would stop to perform and will finish the action.
     */
    static FINISH_TOLERANCE = 20;

    /**
     * @unit micrometer
     * 
     * This value determines the frequency of the movement (up/down) based on
     * distance to the previous movement. 
     * 
     * This depends on the distance the desk performs by a single movement. We currently use the 50%
     * of the distance and fire another command before the previous is done for a smooth movement.
     * 
     * The default value is 50 which means the travel-distance of a single move-command is 100 mu / 1 cm
     */
    static PERFORM_FREQUENCY = 50;

    /**
     * @unit micrometer
     * 
     * Keeps track of the last movement, it is used in combination 
     * with `PERFORM_FREQUENCY`.
     */
    private previousPerformedPosition: number;

    /**
     * Determines if the mover process has detected an resistance.
     */
    private resistanceDetected = false;

    onStateChange = async (state: DeskState) => {
        this.state = state;
        /**
         * Track speed direction change and mutate resistance-detection.
         */
        if (this.direction === "up" && state.speed < 0) {
            this.resistanceDetected = true;
        } else if (this.direction === "down" && state.speed > 0) {
            this.resistanceDetected = true;
        }

        if (this.finished || this.resistanceDetected) {
            // force stop and catch errors.. possible [In Progress Error]
            // but stop will still have an effect.
            logger.debug("MOVER: force stop", {
                finished: this.finished,
                resistanceDetected: this.resistanceDetected
            });
            await this.desk.stop().catch(() => { })
        }
    }

    perform = async (): Promise<boolean> => {
        if (this.finished) {
            logger.info("MOVER: finished");
            return true;
        } else if (this.resistanceDetected) {
            logger.warn("MOVER: resistance detected.. STOP");
            return false;
        } else if (this.shouldPerformMove()) {
            await this.move();
            return this.perform();
        } else {
            await this.wait(100);
            return this.perform();
        }
    }

    private async move() {
        logger.debug("MOVER: perform move action...");

        if (this.desiredPosition > this.desk.total()) {
            throw new Error(`Desk is not capable to move over: ${this.desk.total()} steps, desired: ${this.desiredPosition}`);
        } else if (this.desiredPosition < 0) {
            throw new Error(`Desk is not capable to move bellow ZERO`);
        }

        this.previousPerformedPosition = this.state.value;

        if (this.direction === "down") {
            await this.desk.down();
        } else {
            await this.desk.up();
        }
    }

    private shouldPerformMove() {
        const previousPerformActionDistance = this.state.value - this.previousPerformedPosition;

        if (!this.previousPerformedPosition || Math.abs(previousPerformActionDistance) >= LinakMover.PERFORM_FREQUENCY) {
            return true;
        } else {
            return false;
        }
    }

    get finished(): boolean {
        let tolerance: number;

        if (this.direction === "up") {
            tolerance = this.desiredPosition - this.state.value;
        } else {
            tolerance = this.state.value - this.desiredPosition;
        }

        return tolerance <= LinakMover.FINISH_TOLERANCE;
    }

    get currentMilliseconds(): number {
        return (new Date()).getTime();
    }

    get desiredPosition(): number {
        let normalizedPosition: number;

        if (this.unit === LENGTH_UNITS.CM) {
            normalizedPosition = this.position * 100;
        } else if (this.unit === LENGTH_UNITS.INC) {
            normalizedPosition = this.position * 2.54 * 100;
        }

        if (this.absolute) {
            /**
             * @Todo use it from link desk-transcoder
             */
            normalizedPosition = normalizedPosition - this.desk.offset();
        }

        return normalizedPosition;
    }
}