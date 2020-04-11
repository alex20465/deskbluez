# DESKBLUEZ

**THIS IS A REWRITE OF BLUEDESK PYTHON IMPLEMENTATION AS NODEJS MODULE**

Connects to a low energy actuator system via bluetooth and allows remote control via command line or internal managed interface.


## Supported and Tested Desks

- [Linak Desk 8721 (Module)](https://www.linak.com/products/controls/desk-control-basic-app/) / [IKEA IDÅSEN](https://www.ikea.com/gb/en/p/idasen-desk-sit-stand-brown-beige-s79280917/)

> Other devices may also work.

# FEATURES

- move to specific position
- move Up / Down
- MQTT message broker connection to subcribe and publish the real state of the desk.

# Requirements

- Linux
- libglib2.0-dev
- libdbus-1-dev

```
npm install -g deskbluez
```

# CLI Usage


## HELP

```
Usage: deskbluez [options] [command]

Options:
  -V, --version                                               output the version number
  -h, --help                                                  display help for command

Commands:
  connect
  serve [options] <endpoint> <publishTopic> <subscribeTopic>
  move [options]
  position
  help [command]                                              display help for command
```

## CONNECT

```
hostname@user:~/$ deskbluez connect
? Choose device › - Use arrow-keys. Return to submit.
❯   My Desk [E4:D1:A7:7E:XX:XX]
    Redmi [20:34:FB:BA:XX:XX]

...

✔ Choose device › My Desk [E4:D1:A7:7E:XX:XX]
Device connected successfully.
```

## Move to a position

```
hostname@user:~/$ deskbluez move --to 3000
```

## Move UP

```
hostname@user:~/$ deskbluez move --up
```

## Move DOWN

```
hostname@user:~/$ deskbluez move --down
```

# Node-Red and MQTT Broker

```
Usage: deskbluez serve [options] <endpoint> <publishTopic> <subscribeTopic>

Options:
  --password [password]  
  --username [username]  
  -h, --help             display help for command
```

This command allows to keep the connection with your desk and get real-time feedback about the desk-state.

Requirements:

    - MQTT Broker (https://randomnerdtutorials.com/how-to-install-mosquitto-broker-on-raspberry-pi/)

    - Use pm2 to keep the process running

    - Install Node-red and exchange command with the service.


```
hostname@user:~/$ deskbluez serve mqtt://<hostToMqttBroker>:1883 positionUpdate control
```

This command will publish a JSON (example: `{"height": 3000}`) to the `positionUpdate` topic and will subscribe to the `control` topic in order to receive command.

## COMMANDS API:

```
- UP: "up" <string>
- DOWN: "down" <string>
- MOVE-TO: "to:<position>" <string> (example: "to:3000")
```

You can use Node-Red to control and display the realtime data of your desk.
