let bluebird = require('bluebird');
let redis = require('redis');
let config = require('./config.json');

bluebird.promisifyAll(redis.RedisClient.prototype);

class ipDB {

    constructor (ip, port, password) {
        this.db = {};
        this.ip = ip;
        this.port = port;
        this.password = password;
        this._client = null;
    }

    connect() {
        if (!this.connected) {
            let self = this;
            this._client = redis.createClient({port: this.port, host: this.ip, password: config.REDIS_PASSWORD});

            return new Promise(function (resolve, reject) {
                self._client.on('connect', () => {
                    self.connected = true;
                    console.log("Connected to redis");

                    resolve(self);
                });

                self._client.on('error', (err) => {
                    console.log("redis err", err);
                    reject(err);
                });

                setTimeout(function () {
                    if(!self.connected) {
                        console.log('timeout');
                        reject();
                    }
                }, 100);
            });
        } else {
            return new Promise(function (resolve, reject) {
                resolve(this._client);
            });
        }
    }

    set(ip, value) {
        return this._client.setAsync(config.REDIS_KEY_PREFIX + '.' + ip, value);
    }

    get(ip) {
        return this._client.getAsync(config.REDIS_KEY_PREFIX + '.' + ip);
    }

    expire(ip) {
        return this._client.expireAsync(config.REDIS_KEY_PREFIX + '.' + ip, config.FAUCET_TTL);
    }

    incr(ip) {
        return this._client.incrAsync(config.REDIS_KEY_PREFIX + '.' + ip).then((counter) => {
            if(counter === 1) {
                this.expire(ip);
            }

            return counter;
        });
    }
}

exports.default = ipDB;