
import { program } from "commander";
import treeify from "treeify";
import { version } from "../version.json";
import Bluetooth from "./bluetooth";
import { ConfigManager } from "./config";
import * as factory from "../factory";
import logger from "./logger";
import * as prompts from "./prompts";
import { DESK_EVENT, LENGTH_UNITS } from "../desks/AbstractDesk";
import reporter from "./reporter";
import ProgressBar from "progress";

interface ParsedPosition {
    unit: LENGTH_UNITS,
    pos: number
}

export class CommandLine {

    private profile: string;
    private adapter: string;
    private bluetooth: Bluetooth;
    private config: ConfigManager;

    constructor() {
        program.version(version);

        program.option('--profile <profile>', "select configuration profile", "default");
        program.option('--adapter <adapter>', "bluetooth adapter selection", "hci0");
        program.option('--debug', "enable more details logs", false);

        program
            .command("connect")
            .description("connect and pair a supported device")
            .action(this.decorate(this.actionConnect))

        program
            .command("disconnect")
            .description("disconnect and remove connected device")
            .action(this.decorate(this.actionDisconnect))

        program
            .command("status")
            .description("get information about the current connect device")
            .action(this.decorate(this.actionStatus))

        program
            .command("report")
            .description("start a report process for unsupported device and get all information for support")
            .action(this.decorate(this.actionReport))

        program
            .command("up")
            .description("perform a single UP action")
            .action(this.decorate(this.actionMoveUp))

        program
            .command("down")
            .description("perform a single DOWN action")
            .action(this.decorate(this.actionMoveDown))

        program
            .command("to <position>")
            .description("move desk to a specific position (absolute height), supported units: centimeter/inches, example: '65cm' OR '40inch' ")
            .action(this.decorate(this.actionMoveTo))

        this.bluetooth = new Bluetooth();

    }

    parse(argv: string[]) {
        program.parse(argv);
    }

    private actionReport = async () => {
        await prompts.confirmDisconnection();
        await prompts.confirmPairingMode();
        const devices = await this.bluetooth.discoverDevices();
        const device = await prompts.chooseDevice(devices);
        const bluetoothDevice = await this.bluetooth.connect(device.address);

        await bluetoothDevice.Pair();

        let paired = false;

        console.log("Waiting for pairing ...");

        while (!paired) {
            paired = await bluetoothDevice.Paired();
        }
        const report = await reporter(this.bluetooth, bluetoothDevice);

        await this.bluetooth.disconnect(bluetoothDevice);

        console.log(treeify.asTree(report as any, true, true));
    }

    private actionDisconnect = async () => {
        const desk = await this.connectDesk();
        await this.bluetooth.disconnect(desk.device);
        await this.config.delete();
    }

    private actionConnect = async () => {

        await prompts.confirmDisconnection();
        const model = await prompts.chooseModel();
        await prompts.confirmPairingMode();

        const devices = await this.bluetooth.discoverDevices(model.services);

        const device = await prompts.chooseDevice(devices);

        const bluetoothDevice = await this.bluetooth.connect(device.address);

        await bluetoothDevice.Pair();

        this.config.setConnectedDevice({
            name: device.name,
            address: device.address,
            modelName: model.name
        });
    }

    private actionStatus = async () => {
        const { address, modelName, name } = this.config.getConnectedDevice();
        const desk = await this.connectDesk();
        const state = await desk.state();

        const content = treeify.asTree({
            Device: {
                Name: name,
                Address: address
            },
            Adapter: modelName,
            State: {
                Centimeters: state.cm.toFixed(2),
                Inches: state.inch.toFixed(2),
                DeviceValue: "" + state.value,
                DeviceSpeedValue: "" + state.speed,
            }
        }, true, true);

        console.log(`STATUS\n${content}`);
    }

    private actionMoveUp = async () => {
        const desk = await this.connectDesk();
        await desk.up();
    }

    private actionMoveDown = async () => {
        const desk = await this.connectDesk();
        await desk.down();
    }

    private actionMoveTo = async (position: string) => {
        const desk = await this.connectDesk();
        const { pos, unit } = this.parsePositionString(position);

        const initialState = await desk.state();

        const progress = new ProgressBar(":percent [:bar] (:cmcm | :inchinches)", {
            // Total is the difference from current position to the desired position.
            total: Math.abs(pos - (unit === LENGTH_UNITS.CM ? initialState.cm : initialState.inch)),
            renderThrottle: 50,
            width: 20,
            clear: true
        });

        desk.addListener(DESK_EVENT.STATE_CHANGE, (state) => {
            progress.curr = unit === LENGTH_UNITS.CM ? Math.abs(initialState.cm - state.cm) : Math.abs(initialState.inch - state.inch);
            progress.render({ cm: state.cm.toFixed(0), inch: state.inch.toFixed(0), speed: state.speed / 100 });
        });

        const completed = await desk.moveTo(pos, unit);

        progress.curr = pos;

        // Render final progress state
        const finalState = await desk.state();
        progress.render({ cm: finalState.cm.toFixed(0), inch: finalState.inch.toFixed(0), speed: finalState.speed / 100 });

        if (completed === false) {
            // if not completed possible resistance detected.
            console.log("");
            console.log("Resistance detected, stop action for safety.");
        } else {
            console.log("");
        }
    }

    private decorate(action: any) {
        return async (...args) => {
            await this.preAction();
            return action(...args).then(this.onActionEnd).catch(this.onActionError);
        }
    }

    private async connectDesk() {
        const { address, modelName } = this.config.getConnectedDevice();
        const model = factory.getDeskModel(modelName);
        await this.bluetooth.startDiscovery();
        const bluetoothDevice = await this.bluetooth.connect(address);
        await this.bluetooth.stopDiscovery();
        const desk = factory.createDesk(model, bluetoothDevice);

        await desk.connect();
        await desk.subscribe();

        return desk;
    }

    private preAction = async () => {
        this.profile = program.profile || "default";
        this.adapter = program.adapter || "hci0";

        if (program.debug) logger.setLevel(logger.LEVEL.DEBUG);

        this.config = new ConfigManager(this.profile);

        await this.bluetooth.init(this.adapter);
    }

    private onActionEnd = (result?: any) => {
        if (result) console.log(result);
        process.exit(0);
    }

    private onActionError = (err: Error) => {
        logger.warn(err);
        console.error(err.message);
        process.exit(1);
    }

    private parsePositionString = (position: string): ParsedPosition => {
        const parser = /(\d+)(\w+)?/;
        const [root = null, pos = null, unit = null] = parser.exec(position) || [];

        if (Number.isNaN(parseInt(pos))) {
            throw new Error("Invalid position input, supported format: <position: number>(cm|inch) - example: '70cm' OR '35inch'");
        } else if (["cm", "inch"].indexOf(unit) === -1) {
            throw new Error("Invalid position unit: supported units: 'cm' OR 'inch' - example: '70cm' OR '35inch'");
        }

        return {
            pos: parseInt(pos),
            unit: unit === "cm" ? LENGTH_UNITS.CM : LENGTH_UNITS.INC
        } as ParsedPosition;
    }
}