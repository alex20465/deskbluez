const prompts = require('prompts');
const mqtt = require('mqtt')
const { program } = require('commander');

const store = require("data-store")({ path: ".config" });

const Bluetooth = require("./lib/bluetooth");
const Desk = require("./lib/desk");


program.version("0.0.1");


const connect = async () => {

    const bluetooth = new Bluetooth();
    await bluetooth.init();

    const devices = await bluetooth.discoverDevices();

    const { device = null } = await prompts([
        {
            type: "select",
            name: "device",
            message: "Choose device",
            choices: devices.map(device => {
                return {
                    title: `${device.props.Name} [${device.address}]`,
                    value: device
                }
            })
        }
    ]);


    if (!device) {
        console.error("No device selected!");
        process.exit(1);
    }

    const deskDevice = await bluetooth.connect(device.address);
    const desk = new Desk(deskDevice);
    await desk.connect();

    store.set("connectedDevice", device.address);
    console.log("Device connected successfully.");

    process.exit(0);
};

const move = async (data) => {

    const bluetooth = new Bluetooth();
    await bluetooth.init();

    await bluetooth.discoverDevices(1000);


    const address = store.get("connectedDevice");

    if (!address) {
        throw new Error("No connected device found!");
    }
    console.log(address);
    const device = await bluetooth.connect(address);
    const desk = new Desk(device);

    if (data.up) {
        await desk.up();
    } else {
        await desk.down();
    }

    process.exit(0);
}


const serve = async (endpoint, publishTopic, subscribeTopic, data) => {

    const { username = undefined, password = undefined } = data;

    const bluetooth = new Bluetooth();
    await bluetooth.init();

    await bluetooth.discoverDevices(1000);

    const address = store.get("connectedDevice");

    if (!address) {
        throw new Error("No connected device found!");
    }

    const device = await bluetooth.connect(address);
    const desk = new Desk(device);

    const client = mqtt.connect(endpoint, {
        username: username,
        password: password,
    });

    client.on("connect", function (err) {
        console.log("Connected to the MQTT Broker", err);

        let lastP = 0;

        desk.startPositionListening((position) => {
            const diff = Date.now() - lastP;
            if(diff > 100) {
                lastP = Date.now();
                client.publish(publishTopic, JSON.stringify(position));
            }
        });

        client.subscribe("control", {}, (data) => {
            console.log("data");
        });

        client.on("message", (topic, data) => {
            if(topic !== "control") return;
            const command = data.toString();

            if(command === "up") {
                desk.up();
            } else if(command === "down") {
                desk.down();
            }
        });
    });
}

program
    .command("connect")
    .action(connect)

program
    .command("serve <endpoint> <publishTopic> <subscribeTopic>")
    .option("--password [password]")
    .option("--username [username]")
    .action(serve);

program
    .command("move")
    .option("--up")
    .option("--down")
    .action(move);

program.parse(process.argv);