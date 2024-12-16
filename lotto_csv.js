const https = require('https');
const axios = require('axios');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

class Tasker {
    constructor() {
        this.csvWriter = null;
    }

    async initialize() {
        // Initialize the CSV writer
        this.csvWriter = createObjectCsvWriter({
            path: 'lotto_history.csv',
            header: [
                { id: 'drwNo', title: 'Draw Number' },
                { id: 'drwNoDate', title: 'Draw Date' },
                { id: 'drwtNo1', title: 'Number 1' },
                { id: 'drwtNo2', title: 'Number 2' },
                { id: 'drwtNo3', title: 'Number 3' },
                { id: 'drwtNo4', title: 'Number 4' },
                { id: 'drwtNo5', title: 'Number 5' },
                { id: 'drwtNo6', title: 'Number 6' },
                { id: 'bnusNo', title: 'Bonus Number' },
                { id: 'firstWinamnt', title: 'First Prize Amount' },
                { id: 'firstPrzwnerCo', title: 'First Prize Winners' },
                { id: 'firstAccumamnt', title: 'First Prize Total Amount' },
                { id: 'totSellamnt', title: 'Total Sales Amount' }
            ],
            append: fs.existsSync('lotto_history.csv') // Append if file exists, create new otherwise
        });
    }

    async getLotto(drwNo) {
        let url = `https://www.nlotto.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`;
        return axios.get(url, {
            headers: { 'Content-Type': 'application/json' },
            responseType: 'json',
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
    }

    async loadHistory() {
        let result = 1;
        try {
            if (fs.existsSync('lotto_history.csv')) {
                const data = fs.readFileSync('lotto_history.csv', 'utf8');
                const rows = data.trim().split('\n');
                if (rows.length > 1) {
                    const lastRow = rows[rows.length - 1].split(',');
                    result = parseInt(lastRow[0], 10) + 1;
                }
            }
        } catch (err) {
            throw new Error(err);
        }

        return result;
    }

    async saveHistory(data) {
        try {
            const record = {
                drwNo: data.drwNo,
                drwNoDate: data.drwNoDate,
                drwtNo1: data.drwtNo1,
                drwtNo2: data.drwtNo2,
                drwtNo3: data.drwtNo3,
                drwtNo4: data.drwtNo4,
                drwtNo5: data.drwtNo5,
                drwtNo6: data.drwtNo6,
                bnusNo: data.bnusNo,
                firstWinamnt: data.firstWinamnt,
                firstPrzwnerCo: data.firstPrzwnerCo,
                firstAccumamnt: data.firstAccumamnt,
                totSellamnt: data.totSellamnt
            };
            await this.csvWriter.writeRecords([record]);
        } catch (err) {
            throw new Error(err);
        }
    }

    async fetchBatch(start, end) {
        const promises = [];
        for (let i = start; i <= end; i++) {
            promises.push(
                this.getLotto(i).then((response) => {
                    if (response.status === 200 && response.data.returnValue === 'success') {
                        return response.data;
                    }
                    return null;
                })
            );
        }

        const results = await Promise.all(promises);
        const validResults = results.filter((data) => data !== null);
        if (validResults.length > 0) {
            await this.csvWriter.writeRecords(validResults);
        }
    }

    async main() {
        await this.initialize();

        let drwNo = await this.loadHistory();
        const batchSize = 10; // Number of parallel requests
        const maxDrwNo = 1151;

        while (drwNo < maxDrwNo) {
            const end = Math.min(drwNo + batchSize - 1, maxDrwNo);
            console.log(`Fetching draw numbers ${drwNo} to ${end}`);
            await this.fetchBatch(drwNo, end);
            drwNo = end + 1;
        }
    }
}

let tasker = new Tasker();
tasker.main();
