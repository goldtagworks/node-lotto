const https = require('https');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const sleep = require('await-sleep');

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
        const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`;

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

        let drwNo = await this.loadHistory();
        const maxDrwNo = 1151;

        while (drwNo <= maxDrwNo) {
            console.log(`Fetching draw number ${drwNo}...`);

            try {
                const response = await this.getLotto(drwNo);
                if (response) {
                    console.log(`Saving draw number ${drwNo} to the database...`);
                    await this.saveHistory(response);
                }
            } catch (err) {
                console.error(`Failed to fetch or save draw number ${drwNo}: ${err}`);
            }

            drwNo++;
            await sleep(500); // Slight delay between requests
        }

        await this.finalize();
        console.log('Completed.');
    }
}

let tasker = new Tasker();
tasker.main();
