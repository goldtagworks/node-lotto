const https = require('https');
const axios = require('axios');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const sleep = require('await-sleep');

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
            if (fs.existsSync('lotto_history.csv')) {
                const data = fs.readFileSync('lotto_history.csv', 'utf8');
                const rows = data.trim().split('\n');
                if (rows.length > 1) {
                    const lastRow = rows[rows.length - 1].split(',');
                    result = parseInt(lastRow[0], 10) + 1;
                }
            }
        } catch (err) {
            console.error(`Error loading history: ${err.message}`);
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
                    console.log(`Saving draw number ${drwNo} to CSV...`);
                    await this.saveHistory(response);
                }
            } catch (err) {
                console.error(`Failed to fetch or save draw number ${drwNo}: ${err}`);
            }

            drwNo++;
            await sleep(500); // Slight delay between requests
        }

        console.log('Completed.');
    }
}

let tasker = new Tasker();
tasker.main();
