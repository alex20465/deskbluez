import { join } from "path";
import { homedir } from "os";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import logger from "./logger";

interface ConnectedDevice {
    name: string
    address: string
    modelName: string
}

class DataStore {

    private store: Map<string, string | number | boolean> = new Map()

    constructor(private readonly path: string) {
        this._read()
    }

    set(key: string, value: string | number | boolean) {
        const storedData = this.store.set(key, value)
        this._dump()
        return storedData
    }


    get(key: string): string | number | boolean {
        return this.store.get(key)
    }

    private _dump() {
        writeFileSync(this.path, JSON.stringify(Object.fromEntries(this.store)), { encoding: 'ascii' })
    }

    private _read() {
        if (existsSync(this.path)) {
            const data = readFileSync(this.path, { encoding: 'ascii' })
            this.store = new Map(Object.entries(JSON.parse(data)))
        } else {
            this.store = new Map()
        }
    }
}


export class ConfigManager {
    private store: DataStore;
    private path: string;

    constructor(private profile: string) {
        this.path = join(homedir(), ".config", `deskbluez-${this.profile}`);
        this.store = new DataStore(this.path);

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
        const name = this.store.get("connectedDeviceName") as string;
        const address = this.store.get("connectedDeviceAddress") as string;
        const modelName = this.store.get("connectedDeviceModelName") as string;

        if (!name || !address || !modelName) {
            throw new Error(`No connected device stored under: ${this.profile}`)
        }

        logger.debug("CONFIG: get device", { profile: this.profile, name, address, modelName });

        return { name, address, modelName };
    }
}