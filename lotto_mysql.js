const util = require('util');
const https = require('https');
const axios = require('axios');
const mysql = require('mysql');

class Tasker {
    constructor() {
        this.pool = null;
        this.batchSize = 10; // Number of parallel requests
        this.saveBatchSize = 50; // Number of records saved in a single query
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
        let url = `https://www.nlotto.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`;
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

    async saveBatch(records) {
        if (records.length === 0) return;

        try {
            const sql = `
                INSERT INTO history 
                (drwNo, drwNoDate, drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6, bnusNo, firstWinamnt, firstPrzwnerCo, firstAccumamnt, totSellamnt) 
                VALUES ?
            `;
            const params = records.map(data => [
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
            ]);
            await this.pool.query(sql, [params]);
        } catch (err) {
            console.error(err);
        }
    }

    async fetchBatch(start, end) {
        const promises = [];
        for (let i = start; i <= end; i++) {
            promises.push(
                this.getLotto(i)
                    .then(response => {
                        if (response.status === 200 && response.data.returnValue === 'success') {
                            return response.data;
                        }
                        return null;
                    })
                    .catch(() => null)
            );
        }

        const results = await Promise.all(promises);
        return results.filter(data => data !== null);
    }

    async main() {
        await this.initialize();

        let drwNo = await this.loadHistory();
        const maxDrwNo = 1151;

        let records = [];
        while (drwNo <= maxDrwNo) {
            const end = Math.min(drwNo + this.batchSize - 1, maxDrwNo);
            console.log(`Fetching draw numbers ${drwNo} to ${end}...`);

            const batchResults = await this.fetchBatch(drwNo, end);
            records = records.concat(batchResults);

            if (records.length >= this.saveBatchSize) {
                console.log(`Saving ${records.length} records to the database...`);
                await this.saveBatch(records);
                records = [];
            }

            drwNo = end + 1;
        }

        // Save remaining records
        if (records.length > 0) {
            console.log(`Saving final ${records.length} records to the database...`);
            await this.saveBatch(records);
        }

        await this.finalize();
        console.log('Completed.');
    }
}

let tasker = new Tasker();
tasker.main();
