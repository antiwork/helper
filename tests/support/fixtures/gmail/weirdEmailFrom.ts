// Taken from Email 1,330,897 in production
import { Buffer } from "buffer";

const updatedEmailContents = Buffer.from(
  "Message-ID: <12.A1.11111.AB111A22@aab13mail05>\r\n" +
    "Subject: <a subject>\r\n" +
    "To: Email Name <to@custom_domain.org>\r\n" +
    "From: =?UTF-8?Q?=27AGIL_P=C3=A4dagogik=2C_Get=C3=A4ve?= =?UTF-8?Q?=27?= <from@custom_domain.org>\r\n" +
    "Reply-To: =?UTF-8?Q?AGIL_P=C3=A4dagogik=2C_Gesundheit_und_Pr=C3=A4vention?= <reply_to@org.de>\r\n" +
    "MIME-Version: 1.0\r\n" +
    'Content-Type: multipart/alternative; boundary="boundary_string"\r\n' +
    "\r\n" +
    "--boundary_string\r\n" +
    'Content-Type: text/html; charset="UTF-8"\r\n' +
    "Content-Transfer-Encoding: quoted-printable\r\n" +
    "\r\n" +
    '<html dir=3D"ltr" lang=3D"nl"><body>omitted body</body></html>\r\n' +
    "\r\n" +
    "--boundary_string--\r\n",
  "utf-8",
);
const updatedMessageRaw = Buffer.from(updatedEmailContents).toString("base64url");

export const raw = {
  id: "190e5b316697e033",
  threadId: "190e388c96d0ab2f",
  labelIds: ["INBOX"],
  snippet: "<omitted>",
  sizeEstimate: 55675,
  raw: updatedMessageRaw,
  historyId: "3369349",
  internalDate: "1721840635000",
};
