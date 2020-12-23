import Bluez from "bluez";
import { DeskModelItem } from "./desks/types";
import { AbstractDesk } from "./desks/AbstractDesk";
import REGISTRY from "./REGISTRY";

export async function getSupportedDeskModels(device: Bluez.Device): Promise<DeskModelItem[]> {
    const supported: DeskModelItem[] = [];
    for (let item of REGISTRY) {
        const desk: AbstractDesk = new item.cls(device);
        const isSupported = await desk.isSupported();
        if (isSupported) {
            supported.push(item);
        }
    }
    return supported;
}

export function getDeskModel(name: string): DeskModelItem {
    const [registry = null] = REGISTRY.filter(item => {
        return item.name = name;
    });

    if (registry === null) {
        throw new Error(`No desk registry found for: ${name}`);
    } else {
        return registry;
    }
}

export async function getSupportedModel(device: Bluez.Device): Promise<DeskModelItem | null> {
    const [supportedModel = null] = await getSupportedDeskModels(device);

    return supportedModel;
}

export function createDesk(model: DeskModelItem, device: Bluez.Device): AbstractDesk {
    const desk: AbstractDesk = new model.cls(device);
    return desk;
}