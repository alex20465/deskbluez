import DataStore from "data-store";
import { join } from "path";
import { homedir } from "os";
import { unlinkSync } from "fs";
import logger from "./logger";

interface ConnectedDevice {
    name: string
    address: string
    modelName: string
}


export class ConfigManager {
    private store: any;
    private path: string;

    constructor(private profile: string) {
        this.path = join(homedir(), ".config", `deskbluez-${this.profile}`);
        this.store = DataStore({ path: this.path });

        logger.debug("CONFIG: load", { configPath: this.path, profile: this.profile });
    }

    async delete() {
        unlinkSync(this.path);
    }

    setConnectedDevice(device: ConnectedDevice) {
        this.store.set("connectedDeviceName", device.name);
        this.store.set("connectedDeviceAddress", device.address);
        this.store.set("connectedDeviceModelName", device.modelName);

        logger.debug("CONFIG: set device", { profile: this.profile, device });
    }

    getConnectedDevice(): ConnectedDevice {
        const name = this.store.get("connectedDeviceName");
        const address = this.store.get("connectedDeviceAddress");
        const modelName = this.store.get("connectedDeviceModelName");

        if (!name || !address || !modelName) {
            throw new Error(`No connected device stored under: ${this.profile}`)
        }

        logger.debug("CONFIG: get device", { profile: this.profile, name, address, modelName });

        return { name, address, modelName };
    }
}