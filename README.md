# chafouin
Chafouin is a tool for bypassing the limitations of train companies in Uzbekistan.

## Install

### Tor [(official documentation)](https://community.torproject.org/onion-services/setup/install/)

If you use MacOS, you may use Brew or MacPorts to install and setup Tor:
```sh
brew install tor # or sudo port install tor
```

### Environment

A .env containing the required variables to work with the environment:

```conf
# Telegram bot service
TELEGRAM_BOT_TOKEN=secret

# API service
TOR_CONFIG_DIR=/usr/local/etc
TOR_DATA_DIR=/usr/local/etc

# Provider
RAILWAYS_PROVIDER_MODULE=@chafouin/uzrailways
```

## Features

### Subscribe
The minimal request to subscribe to a train must include the inbound station, outbound station and departure date.

| Parameter | Description                  | Type    |Example     |
| --------- |----------------------------- | ------- | ---------- |
| inbound   | Name of the inbound station  | string  | tashkent   |
| outbound  | Name of the outbound station | string  | bukhara    |
| date      | Date of travel (YYYY-MM-DD)  | string  | 2024-09-01 |

```http
http://localhost:8080/subscribe
?inbound=samarkand
&outbound=bukhara
&date=2024-09-01
```

Additionally, filters may be passed to have further control over subscriptions.

| Parameter | Description                                               | Type    |Example |
| --------- |---------------------------------------------------------- | ------- | ------ |
| name      | Only displays updates to the train with the given name    | string  | SH-120 |
| type      | Only displays updates for a train type                    | string  | sharq  |
| seats     | Only displays updates when seats count changes            | boolean | true   |
| available | Only displays updates for trains that are newly available | boolean | true   |

For reference, the following request subscribes to all newly bookable "sharq" trains going from bukhara to Samarkand on the 1st of september, 2024:

```http
http://localhost:8080/subscribe
?inbound=samarkand
&outbound=bukhara
&date=2024-09-01
&type=sharq
&available=true
```

### Unsubscribe

The minimal request to subscribe to a train must include the inbound station, outbound station and departure date.

| Parameter | Description                  | Type    |Example     |
| --------- |----------------------------- | ------- | ---------- |
| inbound   | Name of the inbound station  | string  | tashkent   |
| outbound  | Name of the outbound station | string  | bukhara    |
| date      | Date of travel (YYYY-MM-DD)  | string  | 2024-09-01 |