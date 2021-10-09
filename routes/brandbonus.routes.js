const {Router} = require('express')
const router = Router()
const auth = require('../middleware/auth.middleware')
const config = require('config')
const BigQueryRepeater = require("../service/BigQuery")
const {boltBrandBonus} = require("../sql/query");
const BitrixApi = require("../service/Bitrix")
const bitrix = BitrixApi(config.get('bitrix_portal'), config.get('bitrix_key'))
const fs = require('fs');
const stringify = require('csv-stringify/lib/sync');
const {google} = require('googleapis');

const credentials = JSON.parse(fs.readFileSync('./credentials.json', {encoding: 'utf8'}))
const token = JSON.parse(fs.readFileSync('./token.json', {encoding: 'utf8'}));


router.post(
    '/send',
    auth,
    async (req, res) => {
        const {year, week_number} = req.body
        console.log(`Get BrandBonus ${year} ${week_number} ...`)
        const [result] = await BigQueryRepeater.runQuery(
            true,
            boltBrandBonus,
            {
                year,
                week_number
            })

        const resultArray = result.map(row => [row.park, row.car, row.ok_trips])

        const csv = stringify(resultArray, {
            header: false,
            delimiter: ';'
        })

        const {client_secret, client_id, redirect_uris} = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
        oAuth2Client.setCredentials(token);
        const mailId = await sendMail(oAuth2Client, csv);

        async function sendMail(auth, csv) {
            const gmail = google.gmail({version: 'v1', auth});
            const attach = new Buffer.from(csv).toString("base64");
            const messageParts = [
                "MIME-Version: 1.0",
                'From: Teste <bobckx10@gmail.com>',
                'To: Teste <bob-ck@ukr.net>',
                `Subject: Subject here`,
                "Content-Type: multipart/mixed; boundary=012boundary01",
                '',
                "--012boundary01",
                "Content-Type: multipart/alternative; boundary=012boundary02",
                '',
                "--012boundary02",
                "Content-type: text/html; charset=UTF-8",
                "Content-Transfer-Encoding: quoted-printable",
                '',
                'emailBody here, add some text...',
                '',
                "--012boundary02--",
                "--012boundary01",
                "Content-Type: Application/csv; name=mypdf.csv",
                'Content-Disposition: attachment; filename=mypdf.csv',
                "Content-Transfer-Encoding: base64",
                '',
                attach,
                "--012boundary01--",
            ];
            const message = messageParts.join('\n');
            // The body needs to be base64url encoded.
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const res = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });
            console.log(res.data);
            return res.data;
        }

        res.status(200).json({
            mailId
        })
    })

module.exports = router
