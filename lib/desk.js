const binary = require("binary");


module.exports = class Desk {
    constructor(device) {
        this.device = device;
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

    async control(command) {
        const service = this.device.getService("99fa0001-338a-1024-8a49-009c0215f78a");
        const char = service.getCharacteristic("99fa0002-338a-1024-8a49-009c0215f78a");
        await char.WriteValue(this.toByteArray(command));
    }

    async startPositionListening(callback) {
        const service = this.device.getService("99fa0020-338a-1024-8a49-009c0215f78a");
        const char = service.getCharacteristic("99fa0021-338a-1024-8a49-009c0215f78a");

        await char.StartNotify();

        char.on("notify", (data) => {
            let buf = Buffer.from(data)
            buf = buf.filter(b => b < 194); // filter some unknown bytes
            callback(binary.parse(buf)
                .word16lu("height")
                .vars);
        })
    }

    async stopPositionListening() {
        const service = this.device.getService("99fa0020-338a-1024-8a49-009c0215f78a");
        const char = service.getCharacteristic("99fa0021-338a-1024-8a49-009c0215f78a");
        await char.StopNotify();
    }


    toByteArray(hexString) {
        var result = [];
        for (var i = 0; i < hexString.length; i += 2) {
            result.push(parseInt(hexString.substr(i, 2), 16));
        }
        return result;
    }
}

