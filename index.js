const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios').default;
const dotenv = require('dotenv');
const { handle } = require('express/lib/application');
const app = express();
const env = dotenv.config().parsed;
const mqtt = require('mqtt')
const host = 'broker.hivemq.com'
const port = '1883'
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

const connectUrl = `mqtt://${host}:${port}`
var LED_1, LED_2;

const lineconfig = {
    channelAccessToken: process.env.ACCESS_TOKEN || env.ACCESS_TOKEN,
    channelSecret: process.env.SECRET_TOKEN || env.SECRET_TOKEN,
};

let headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
}

function getMessage() {
    return {
        "type": "flex",
        "altText": "สถานะบ้าน",
        "contents": {
            "type": "carousel",
            "contents": [
                {
                    "type": "bubble",
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": "ไฟ 1",
                                "weight": "bold",
                                "size": "xl"
                            },
                            {
                                "type": "box",
                                "layout": "vertical",
                                "margin": "lg",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "text",
                                        "color": (LED_1 == true) ? "#17C950" : "#FF0000",
                                        "text": (LED_1 == true) ? "สถานะ : เปิด" : "สถานะ : ปิด"
                                    },

                                ]
                            }
                        ],
                        "alignItems": "center"
                    },
                    "footer": {
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "button",
                                "style": "primary",
                                "height": "sm",
                                "action": {
                                    "type": "message",
                                    "label": (LED_1 == false) ? "เปิดไฟ" : "ปิดไฟ",
                                    "text": (LED_1 == false) ? "ON1" : "OFF1",
                                },
                                "color": (LED_1 == false) ? "#17C950" : "#FF0000",
                            },
                        ],
                        "flex": 0
                    }
                },
                {
                    "type": "bubble",
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": "ไฟ 2",
                                "weight": "bold",
                                "size": "xl"
                            },
                            {
                                "type": "box",
                                "layout": "vertical",
                                "margin": "lg",
                                "spacing": "sm",
                                "contents": [
                                    {
                                        "type": "text",
                                        "color": (LED_2 == true) ? "#17C950" : "#FF0000",
                                        "text": (LED_2 == true) ? "สถานะ : เปิด" : "สถานะ : ปิด"
                                    },

                                ]
                            }
                        ],
                        "alignItems": "center"
                    },
                    "footer": {
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "button",
                                "style": "primary",
                                "height": "sm",
                                "action": {
                                    "type": "message",
                                    "label": (LED_2 == false) ? "เปิดไฟ" : "ปิดไฟ",
                                    "text": (LED_2 == false) ? "ON2" : "OFF2",
                                },
                                "color": (LED_2 == false) ? "#17C950" : "#FF0000",
                            },
                        ],
                        "flex": 0
                    }
                },
            ]
        }
    }
}

const client = new line.Client(lineconfig);

const client_mqtt = mqtt.connect(connectUrl, {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: '',
    password: '',
    reconnectPeriod: 1000,
})

const topic = '/ESP32_1/LED1';
const topic_2 = '/ESP32_1/LED2';

client_mqtt.on('connect', () => {
    console.log('Connected')
    client_mqtt.subscribe([topic], () => {
        client_mqtt.publish(topic, 'OFF', { qos: 0, retain: false }, (error) => {
            if (error) {
                console.error(error)
            }
        })
        LED_1 = false;
        console.log(`Subscribe to topic '${topic}'`)
    })
    client_mqtt.subscribe([topic_2], () => {
        client_mqtt.publish(topic_2, 'OFF', { qos: 0, retain: false }, (error) => {
            if (error) {
                console.error(error)
            }
        })
        LED_2 = false;
        console.log(`Subscribe to topic '${topic_2}'`)
    })
})



app.post('/webhook', line.middleware(lineconfig), async (req, res) => {
    try {
        const events = req.body.events
        //console.log('event : ', events)
        return events.length > 0 ? await events.map(item => handleEvent(item)) : res.status(200).send("OK")
    }
    catch (error) {
        res.status(500).end()
    }
});

function callHome(event) {
    let token = event.replyToken;
    const msg = getMessage();
    let flex_msg = {
        "replyToken": token,
        "messages": [
            msg
        ]
    }
    axios.post('https://api.line.me/v2/bot/message/reply',
        flex_msg, {
        headers: headers
    }).then((res) => {
        //console.log(res)
    }).catch((error) => {
        try {
            console.log(JSON.stringify(error))
        } catch (err) {
            console.log(err)
        }
    });
}
const handleEvent = async (event) => {
    if (event.message.text === 'HOME') {
        return callHome(event);
    }

    if (event.message.text === 'ON1') {
        client_mqtt.publish(topic, 'ON', { qos: 0, retain: false }, (error) => {
            if (error) {
                console.error(error)
            }
        })
        LED_1 = true;
        return callHome(event);
    }

    if (event.message.text === 'OFF1') {
        client_mqtt.publish(topic, 'OFF', { qos: 0, retain: false }, (error) => {
            if (error) {
                console.error(error)
            }
        })
        LED_1 = false;
        return callHome(event);
    }

    if (event.message.text === 'ON2') {
        client_mqtt.publish(topic_2, 'ON', { qos: 0, retain: false }, (error) => {
            if (error) {
                console.error(error)
            }
        })
        LED_2 = true;
        return callHome(event);
    }

    if (event.message.text === 'OFF2') {
        client_mqtt.publish(topic_2, 'OFF', { qos: 0, retain: false }, (error) => {
            if (error) {
                console.error(error)
            }
        })
        LED_2 = false;
        return callHome(event);
    }
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
})


