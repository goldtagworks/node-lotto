const util = require('util');
const https = require('https');
const axios = require('axios');
const mysql = require('mysql');
const sleep = require('await-sleep');

class Tasker {
    constructor() {
        this.pool = null;
    }

    async initialize() {
        this.pool = mysql.createPool({
            host: '127.0.0.1',
            port: 3306,
            user: 'root',
            password: '',
            database: 'lotto',
        });

        this.pool.query = util.promisify(this.pool.query);
    }

    async finalize() {
        await this.pool.end();
    }

    async getLotto(drwNo) {
        let url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`;
        return axios.get(url, {
            headers: { 'Content-Type': 'application/json' },
            responseType: 'json',
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });
    }

    async loadHistory() {
        let result = 1;
        try {
            let sql = 'SELECT * FROM history ORDER BY drwNo DESC LIMIT 1';
            let rows = await this.pool.query(sql);
            if (rows.length > 0) {
                result = rows[0].drwNo + 1;
            }
        } catch (err) {
            console.error(err);
        }
        return result;
    }

    async saveHistory(data) {
        try {
            const sql = `
                INSERT INTO history 
                (drwNo, drwNoDate, drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6, bnusNo, firstWinamnt, firstPrzwnerCo, firstAccumamnt, totSellamnt) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
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
            ];
            await this.pool.query(sql, params);
        } catch (err) {
            console.error(err);
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
                if (response.status === 200 && response.data.returnValue === 'success') {
                    console.log(`Saving draw number ${drwNo} to the database...`);
                    await this.saveHistory(response.data);
                }
            } catch (err) {
                console.error(`Failed to fetch or save draw number ${drwNo}:`, err);
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
