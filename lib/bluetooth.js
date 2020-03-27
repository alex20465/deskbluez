const Bluez = require('bluez');

module.exports = class Bluetooth {

    constructor() {
        this.module = new Bluez();
        this.adapter = null;
    }

    async init() {
        await this.module.init()
        this.adapter = await this.module.getAdapter('hci0');
    }

    async startDiscovery() {
        return this.adapter.StartDiscovery();
    }

    async stopDiscovery() {
        return this.adapter.StopDiscovery();
    }

    async discoverDevices(timeout = 1000) {

        const devices = [];
        this.startDiscovery();

        await new Promise((resolve) => {
            function deviceListener(address, props) {
                devices.push({ address, props });
            }

            this.module.on('device', deviceListener);

            setTimeout(() => {
                this.module.removeListener("device", deviceListener);
                resolve(devices);
            }, timeout);
        });


        await this.stopDiscovery();

        return devices
    }

    async connect(address) {
        return this.module.getDevice(address);
    }

}
