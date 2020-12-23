import prompts from "prompts";
import { DeskModelItem } from "../desks/types";
import { DiscoveredDevice } from "./bluetooth";
import REGISTRY from "../REGISTRY";


export async function chooseDevice(devices: DiscoveredDevice[]): Promise<DiscoveredDevice> {
    const { device = null } = await prompts([
        {
            type: "select",
            name: "device",
            message: "choose desk device",
            choices: devices.map(device => {
                return {
                    title: `${device.name} [${device.address}]`,
                    value: device
                }
            })
        }
    ]);

    if (device === null) {
        throw new Error("No device selected");
    }

    return device;
}

export async function confirmDisconnection() {
    return prompts([
        {
            type: "confirm",
            name: "disconnected",
            message: "make sure the desk device isn't paired OR connected",
            onState: ({ value }) => (value === false ? process.exit() : null)
        },
    ]);
}

export async function confirmPairingMode() {
    return prompts([
        {
            type: "confirm",
            name: "pairing",
            message: "enable the pairing mode (usually hold bluetooth button for 2-3 seconds)",
            onState: ({ value }) => (value === false ? process.exit() : null)
        }
    ]);
}


export async function chooseModel(): Promise<DeskModelItem> {

    const { model = null } = await prompts([
        {
            type: "select",
            name: "model",
            message: "choose device model:",
            choices: REGISTRY.map(model => {
                return {
                    title: `${model.name}`,
                    value: model
                }
            })
        }
    ]);

    if (model === null) {
        throw new Error("No desk model selected");
    } else {
        return model;
    }
}