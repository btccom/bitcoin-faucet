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

let report = (message) => {
    web.chat.postMessage(config.SLACK_CHANNEL_ID, message, {as_user: true}, (err, res) => {
        if(err) {
            console.log(err);
        }
    });
};

module.exports = {
    report: report,
    listChannels: listChannels
}
