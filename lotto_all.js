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
        this.pool = await mysql.createPool({
              host: '127.0.0.1'
            , port: 3306
            , user: 'root'
            , password: ''
            , database: 'lotto'
        });

        this.pool.query = await util.promisify(this.pool.query);
    }
    
    async finalize() {
        await this.pool.end();
    }

    async getLotto(drwNo = 1) {
        let url = 'https://www.nlotto.co.kr/common.do?method=getLottoNumber&drwNo=' + drwNo;

        return await axios.get(url, {
            headers: { 'Content-Type': 'application/json' },
            responseType: 'json',
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
    }

    async loadHistory() {
        let result = 1;
        try {
            let sql = '';
            sql += 'SELECT * FROM history ORDER BY drwNo desc LIMIT 1';
            
            let rows = await this.pool.query(sql);
            if (rows.length != 0) {
                result = rows[0].drwNo + 1;
            }
        } catch (err) {
            throw new Error(err);
        }
        
        return result;
    }

    async saveHistory(data) {
        try {
            let sql = '';
            sql += 'INSERT INTO history (drwNo, drwNoDate, drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6, bnusNo, firstWinamnt, firstPrzwnerCo, firstAccumamnt, totSellamnt) ';
            sql += 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            
            let params = [data.drwNo, data.drwNoDate, data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6, data.bnusNo, data.firstWinamnt, data.firstPrzwnerCo, data.firstAccumamnt, data.totSellamnt];
            await this.pool.query(sql, params);
        } catch (err) {
            throw new Error(err);
        }
    }

    async main() {
        await this.initialize();
        
        let drwNo = await this.loadHistory();
        for (let i = drwNo; i < 874; i++) {
            let response = await this.getLotto(i);
            if (response.status == 200 && response.data.returnValue == 'success') {
                await this.saveHistory(response.data);
            }
            await sleep(500);
        }
        
        await this.finalize();
    }
}

let tasker = new Tasker();
tasker.main();
