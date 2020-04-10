const binary = require("binary");
const events = require("events");

module.exports = class Desk {

    constructor(device) {
        this.device = device;
        this.shouldStop = false;
        this.emitter = new events.EventEmitter();
        this.startNotification = false;
        this.isMoving = false;
    }


    async connect() {
        await this.device.Connect();
    }

    async disconnect() {
        await this.device.Disconnect();
    }

    async up() {
        return this.control("4700");
    }

    async down() {
        return this.control("4600");
    }

    async stop() {
        return this.control("FF00")
    }

    async cancelCurrentMove() {
        if (this.isMoving) {
            this.shouldStop = true;

            return new Promise((resolve) => {

                const intervalId = setInterval(() => {
                    if(this.isMoving === false) {
                        clearInterval(intervalId);
                        resolve();
                    }
                }, 100);
            });
        }
    }

    async moveTo(desiredPosition) {
        const currentPosition = await this.getCurrentPosition();
        let intervalId;
        this.isMoving = true;
        if (desiredPosition === currentPosition) return true;

        const shouldMoveUp = currentPosition < desiredPosition;

        function positionListener (resolve, { height }) {
            if (
                // move up stop
                (shouldMoveUp && (desiredPosition < height) && this.shouldStop === false) ||

                // move down stop
                (!shouldMoveUp && (desiredPosition > height) && this.shouldStop === false) ||

                // cotinue sent stop message.
                this.shouldStop
            ) {
                clearInterval(intervalId);
                this.shouldStop = true;
                this.stop()
                    .then(resolve)
                    .catch((err) => {
                        if (err.dbusName !== "org.bluez.Error.InProgress") {
                            reject(err);
                        } else {
                            /**
                             * Ignore in progress error and continue, until no error.
                             */
                        }
                    });
            }
        }
        let listener;

        await new Promise(async (resolve) => {
            listener = positionListener.bind(this, resolve);
            await this.startPositionListening(listener);

            intervalId = setInterval(async () => {
                if (shouldMoveUp) {
                    await this.up();
                } else {
                    await this.down();
                }
            }, 500);
        });

        this.shouldStop = false;

        await this.stopPositionListening(listener);
        this.isMoving = false;
    }

    async getCurrentPosition() {
        const service = this.device.getService("99fa0020-338a-1024-8a49-009c0215f78a");
        const char = service.getCharacteristic("99fa0021-338a-1024-8a49-009c0215f78a");
        const value = await char.ReadValue();

        return binary.parse(Buffer.from(value))
            .word16lu("height")
            .vars.height;
    }

    async control(command) {
        const service = this.device.getService("99fa0001-338a-1024-8a49-009c0215f78a");
        const char = service.getCharacteristic("99fa0002-338a-1024-8a49-009c0215f78a");
        await char.WriteValue(this.toByteArray(command));
        if (this.shouldStop) await char.WriteValue(this.toByteArray("FF00"));
    }

    async startPositionListening(handler) {

        if (!this.startNotification) {
            this.startNotification = true;
            const service = this.device.getService("99fa0020-338a-1024-8a49-009c0215f78a");
            const char = service.getCharacteristic("99fa0021-338a-1024-8a49-009c0215f78a");

            await char.StartNotify();

            char.on("notify", (data) => {
                let buf = Buffer.from(data)
                buf = buf.filter(b => b < 194); // filter some unknown bytes
                this.emitter.emit("position:change", binary.parse(buf)
                    .word16lu("height")
                    .vars);
            });
        }

        this.emitter.on("position:change", handler);
    }

    async stopPositionListening(handler) {

        if (handler) {
            this.emitter.removeListener("position:change", handler);
        }

        if (this.emitter.listenerCount("position:change") === 0 || !handler) {
            const service = this.device.getService("99fa0020-338a-1024-8a49-009c0215f78a");
            const char = service.getCharacteristic("99fa0021-338a-1024-8a49-009c0215f78a");
            await char.StopNotify();
        }
    }


    toByteArray(hexString) {
        var result = [];
        for (var i = 0; i < hexString.length; i += 2) {
            result.push(parseInt(hexString.substr(i, 2), 16));
        }
        return result;
    }
}

