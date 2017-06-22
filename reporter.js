let config = require('./config.json');
let WebClient = require('@slack/client').WebClient;

let token = config.SLACK_API_TOKEN || null;
let web = new WebClient(token);


let listChannels = () => {
    web.channels.list((err, info) => {
        if(err) {
            console.log(err);
            return err;
        } else {
            return info;
        }
    });
};

let report = (messageType, message) => {

    let color = '#439FE0';
    let title = 'Faucet information';
    let possibleAlerts = ['good', 'warning', 'danger'];

    if(possibleAlerts.indexOf(messageType) !== -1) {
        color = messageType;
    }

    switch (messageType){
        case 'good':
            title = 'Faucet sent coins';
            break;
        case 'warning':
            title = 'Faucet warning';
            break;
        case 'danger':
            title = 'Faucet danger';
            break;
        default:
            title = 'Faucet information';
            break;
    }

    let msg = {
        as_user: true,
        attachments: JSON.stringify([
            {
                "color": color,
                "title": title,
                "text": message
            }
        ])
    };

    web.chat.postMessage(config.SLACK_CHANNEL_ID, "", msg, (err, res) => {
        if(err) {
            console.log(err);
        }
    });
};

module.exports = {
    report: report,
    listChannels: listChannels
}
