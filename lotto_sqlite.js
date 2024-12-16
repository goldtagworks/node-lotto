const https = require('https');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

class Tasker {
    constructor() {
        this.db = null;
    }

    async initialize() {
        this.db = new sqlite3.Database('lotto_history.db');

        await new Promise((resolve, reject) => {
            this.db.run(
                `CREATE TABLE IF NOT EXISTS history (
                    drwNo INTEGER PRIMARY KEY,
                    drwNoDate TEXT,
                    drwtNo1 INTEGER,
                    drwtNo2 INTEGER,
                    drwtNo3 INTEGER,
                    drwtNo4 INTEGER,
                    drwtNo5 INTEGER,
                    drwtNo6 INTEGER,
                    bnusNo INTEGER,
                    firstWinamnt INTEGER,
                    firstPrzwnerCo INTEGER,
                    firstAccumamnt INTEGER,
                    totSellamnt INTEGER
                )`,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    async finalize() {
        await new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getLotto(drwNo) {
        const url = `https://www.nlotto.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`;

        try {
            const response = await axios.get(url, {
                headers: { 'Content-Type': 'application/json' },
                responseType: 'json',
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });

            if (response.status === 200 && response.data.returnValue === 'success') {
                return response.data;
            }
        } catch (err) {
            console.error(`Failed to fetch data for draw number ${drwNo}: ${err.message}`);
        }
        return null;
    }

    async loadHistory() {
        let result = 1;
        try {
            const row = await new Promise((resolve, reject) => {
                this.db.get(
                    `SELECT drwNo FROM history ORDER BY drwNo DESC LIMIT 1`,
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });

            if (row) {
                result = row.drwNo + 1;
            }
        } catch (err) {
            console.error(`Error loading history: ${err.message}`);
        }

        return result;
    }

    async saveHistory(data) {
        try {
            await new Promise((resolve, reject) => {
                this.db.run(
                    `INSERT INTO history (drwNo, drwNoDate, drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6, bnusNo, firstWinamnt, firstPrzwnerCo, firstAccumamnt, totSellamnt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        data.drwNo,
                        data.drwNoDate,
                        data.drwtNo1,
                        data.drwtNo2,
                        data.drwtNo3,
                        data.drwtNo4,
                        data.drwtNo5,
                        data.drwtNo6,
                        data.bnusNo,
                        data.firstWinamnt,
                        data.firstPrzwnerCo,
                        data.firstAccumamnt,
                        data.totSellamnt,
                    ],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        } catch (err) {
            console.error(`Error saving history for draw number ${data.drwNo}: ${err.message}`);
        }
    }

    async main() {
        await this.initialize();

        const drwNo = await this.loadHistory();
        const maxConcurrentRequests = 10; // Adjust the concurrency level
        const promises = [];

        for (let i = drwNo; i < 1151; i++) {
            console.log(i);
            promises.push(this.getLotto(i).then((data) => {
                if (data) {
                    return this.saveHistory(data);
                }
            }));

            if (promises.length >= maxConcurrentRequests) {
                await Promise.all(promises);
                promises.length = 0; // Clear the array for next batch
            }
        }

        // Wait for remaining promises to complete
        await Promise.all(promises);

        await this.finalize();
    }
}

let tasker = new Tasker();
tasker.main();
