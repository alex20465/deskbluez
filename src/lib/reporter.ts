import Bluez from "bluez";
import Bluetooth from "./bluetooth";

interface DeviceReport {
    Adapter: any
    Properties: any
    Services: any
}

async function reportServices(device: Bluez.Device) {
    const report = {};
    const uuids: string[] = (await device.getProperties()).UUIDs;

    for (let uuid of uuids) {
        const service = await device.getService(uuid);

        if (!service) continue;

        const serviceProps = await service.getProperties();
        serviceProps.Characteristics = await reportCharacteristics(service);
        report[uuid] = serviceProps;
    }
    return report;
}

async function reportCharacteristics(service: Bluez.Service) {
    const report = {};
    const uuids = Object.keys((service as any).characteristics);
    for (let uuid of uuids) {
        const char = await service.getCharacteristic(uuid);
        const charProps = await char.getProperties();
        charProps.Descriptors = await reportDescriptors(char);
        report[uuid] = charProps;
    }

    return report;
}

async function reportDescriptors(char: Bluez.Characteristic) {
    const report = {};
    const uuids = await Object.keys((char as any).descriptors);
    for (let uuid of uuids) {
        const desc = await char.getDescriptor(uuid);
        const descProps = await desc.getProperties();
        report[uuid] = descProps;
    }
    return report;
}


export default async function (bluetooth: Bluetooth, device: Bluez.Device): Promise<DeviceReport> {

    const properties = await device.getProperties();

    const adapter = await bluetooth.adapter.getProperties();

    const services = await reportServices(device);

    return {
        Adapter: adapter,
        Properties: properties,
        Services: services
    }
}