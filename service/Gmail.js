const {google} = require('googleapis');
const fs = require('fs');

const credentials = JSON.parse(fs.readFileSync('./credentials.json', {encoding: 'utf8'}))
const token = JSON.parse(fs.readFileSync('./token.json', {encoding: 'utf8'}));
const {client_secret, client_id, redirect_uris} = credentials.installed;
const auth = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);
auth.setCredentials(token);


async function sendMail({subject, from, to, body, csvName, csv}) {
    const gmail = google.gmail({version: 'v1', auth});
    const attach = new Buffer.from(csv).toString("base64");
    const messageParts = [
        "MIME-Version: 1.0",
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: multipart/mixed; boundary=012boundary01",
        '',
        "--012boundary01",
        "Content-Type: multipart/alternative; boundary=012boundary02",
        '',
        "--012boundary02",
        "Content-type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: quoted-printable",
        '',
        body,
        '',
        "--012boundary02--",
        "--012boundary01",
        `Content-Type: Application/csv; name=${csvName.replace(/ /g, '_')}.csv`,
        `Content-Disposition: attachment; filename=${csvName.replace(/ /g, '_')}.csv`,
        "Content-Transfer-Encoding: base64",
        '',
        attach,
        "--012boundary01--"
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
    return res.data;
}

module.exports = {sendMail}
