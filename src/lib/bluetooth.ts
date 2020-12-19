import Bluez from "bluez";
import logger from "./logger";


export interface DiscoveredDevice {
    name: string
    address: string
}

export default class Bluetooth {

    private module: Bluez;

    public adapter: Bluez.Adapter;

    constructor() {
        this.module = new Bluez();
        this.adapter = null;
    }

    async init(adapter: string = "hci0") {
        logger.debug("BLUETOOTH: init");
        await this.module.init();
        logger.debug("BLUETOOTH: use adapter", adapter);
        this.adapter = await this.module.getAdapter(adapter);

        logger.debug("BLUETOOTH: adapter loaded", await this.adapter.getProperties());
    }

    async startDiscovery() {
        logger.debug("BLUETOOTH: start discovery");
        return this.adapter.StartDiscovery();
    }

    async stopDiscovery() {
        logger.debug("BLUETOOTH: stop discovery");
        return this.adapter.StopDiscovery();
    }

    async discoverDevices(uuids: string[] = []) {

        const devices: DiscoveredDevice[] = [];

        const listener = (address: string, props) => {
            logger.debug("BLUETOOTH: device discovered", address, props);

            devices.push({
                address,
                name: props.Name || "untitled"
            });
        }

        await this.adapter.SetDiscoveryFilter({ UUIDs: uuids });

        await this.startDiscovery();

        this.module.on('device', listener);

        await new Promise(resolve => setTimeout(resolve, 5000));

        await this.stopDiscovery();

        (this.module as any).removeListener("device", listener);


        if (devices.length === 0) {
            throw new Error("No devices found");
        }

        return devices;
    }

    async connect(address: string): Promise<Bluez.Device> {
        logger.debug("BLUETOOTH: connect to", address);
        return this.module.getDevice(address);
    }

    async disconnect(device: Bluez.Device): Promise<void> {
        logger.debug("BLUETOOTH: disconnect device", await device.Address());
        await device.Disconnect();
        await this.adapter.RemoveDevice(device);
    }
}