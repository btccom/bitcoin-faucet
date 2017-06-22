let db = require('./ipdb');
let express = require('express');
let bitcoin = require('bitcoin');
let reporter = require('./reporter');
let bodyParser = require('body-parser');
let config = require('./config.json');

let ipdb = new db.default(config.REDIS_SERVER, config.REDIS_PORT, config.REDIS_PASSWORD);

// INIT //
let app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

let client = new bitcoin.Client({
    host: config.BITCOIND_RPC_HOST,
    port: config.BITCOIND_RPC_PORT,
    user: config.BITCOIND_RPC_USER,
    pass: config.BITCOIND_RPC_PASS,
    timeout: 30000
});

app.set('view engine', 'pug');
app.use('/styles', express.static('styles'));
app.use('/img', express.static('img'));
app.use('/js', express.static('js'));
////////////

app.get('/', (req, res) => {

    res.render('form', {
        title: config.FAUCET_TITLE,
        infotext: config.FAUCET_JUST_FOR_YOU,
        message: '┬──┬﻿ ノ( ゜-゜ノ)'
    });
});

app.post('/give', (req, res) => {

    let response = res;

    let renderRejection = (errortext) => {
        return res.render('done', {
            title: config.FAUCET_TITLE,
            infotext: config.FAUCET_JUST_FOR_YOU,
            resulttext: 'Huh, something went wrong..\t[ ' + errortext + ' ]',
            message: '┬──┬﻿ ︵ /(.□. \\）'
        })
    };

    // Check if IP already got coins
    let ip = req.connection.remoteAddress;

    ipdb.incr(ip).then((counter) => {
        console.log('give', ip, counter);

        if(counter > config.FAUCET_MAX_PER_TTL) {
            return renderRejection('you did that to often already');
        }

        // Validate address provided by the user
        client.validateAddress(req.body.address, (err, res) => {
            if(err) {
                return renderRejection('check back later');
            }
            if(res.isvalid) {
                // Get balance to calculate how much to give and to check for low balance (reporting)
                client.getBalance((err, res) => {
                    if (err) {
                        console.log(err);
                    }

                    // Report if balance low
                    if(res < config.FAUCET_REPORT_LOW_BALANCE){
                        reporter.report("Faucet balance low!! " + res + " tBTC left over.");
                    }

                    let amount = (config.FAUCET_PERCENTAGE * res).toFixed(4);
                    if (amount > config.FAUCET_MAX_AMOUNT) {
                        amount = config.FAUCET_MAX_AMOUNT;
                    }
                    let address = req.body.address;

                    // Create send object for sendMany
                    let send = {};
                    send[address] = amount;

                    client.sendMany("", send, 0, (err, res) => {
                        if (err) {
                            return renderRejection('error sending. check back later, you did nothing wrong.');
                        }
                        console.log('tx:' + res, ip, amount, address);

                        if(config.FAUCET_REPORT_TRANSACTIONS){
                            reporter.report("txid:\t\t" + res + "\namount:\t" + amount + " tBTC\naddress:\t" + address + "\nip:\t\t" + ip);
                        }

                        return response.render('done', {
                            title: config.FAUCET_TITLE,
                            infotext: config.FAUCET_JUST_FOR_YOU,
                            resulttext: amount + ' tBTC have been sent to ' + address,
                            txid: 'Transaction id: ' + res,
                            message: '(╯°o°)╯︵ ┻━━┻'
                        });
                    });
                });
            } else {
                return renderRejection('invalid testnet address');
            }
        });
    });
});

ipdb.connect().then(() => {
    console.log("Testnet 5 faucet ready");
})
    .catch((err) => {
        console.log(err);
    });

app.listen(process.env.PORT);
