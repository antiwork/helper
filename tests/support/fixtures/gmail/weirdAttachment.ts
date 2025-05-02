// Taken from Email 522,444 in production
import { Buffer } from "buffer";

const b64DecodedRawMessage = Buffer.from(
  'From: from@gmail.com\r\nMessage-ID: <f938j4a98jfoj3fu834@domain.com>\r\nTo: To Name <to@gmail.com>\r\nSubject: "Org" has been accepted by from@gmail.com\r\nContent-Type: multipart/alternative;\r\n boundary="=_f628560768da3fda8d0e09b03f7e4893"\r\n\r\n--=_f628560768da3fda8d0e09b03f7e4893\r\nContent-Transfer-Encoding: quoted-printable\r\nContent-Type: text/plain; charset=UTF-8;\r\n format=flowed\r\n\r\nfrom@gmail.com has accepted the invitation to the following event:\r\n\r\n*Org*\r\n\r\nWhen: 2024-07-23 14:00 - 14:30 (Asia/Jakarta)\r\n\r\nInvitees: To Name <to@gmail.com>,\r\n  invitee@gmail.com <invitee@gmail.com>,\r\n  invitee2@gmail.com <invitee2@gmail.com>,\r\n  invitee3@gmail.com <invitee3@gmail.com>,\r\n  from@gmail.com <from@gmail.com>\r\n--=_f628560768da3fda8d0e09b03f7e4893\r\nContent-Transfer-Encoding: 8bit\r\nContent-Type: text/calendar; charset=UTF-8; method=REPLY;\r\n name=event.ics\r\n\r\nBEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Roundcube 1.6.6//Sabre VObject 4.5.4//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:REPLY\r\nBEGIN:VTIMEZONE\r\nTZID:Asia/Jakarta\r\nEND:VTIMEZONE\r\nBEGIN:VEVENT\r\nUID:4r083j8a4aqflmpom8rs2j8ap4@google.com\r\nDTSTAMP:20240723T063409Z\r\nCREATED:20240723T042839Z\r\nLAST-MODIFIED:20240723T063127Z\r\nDTSTART;TZID=Asia/Jakarta:20240723T140000\r\nDTEND;TZID=Asia/Jakarta:20240723T143000\r\nSUMMARY:Org\r\nDESCRIPTION:-::~:~::~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~\r\n :~:~:~:~:~:~:~:~::~:~::-\\nJoin with Google Meet: https://meet.google.com/m\r\n kv-nrxb-cte\\n\\nLearn more about Meet at: https://support.google.com/a/user\r\n s/answer/9282720\\n\\nPlease do not edit this section.\\n-::~:~::~:~:~:~:~:~:\r\n ~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~:~::~:~::-\r\nSEQUENCE:0\r\nTRANSP:OPAQUE\r\nSTATUS:CONFIRMED\r\nATTENDEE;CN=from@gmail.com;PARTSTAT=ACCEPTED;ROLE=REQ-PARTICIPANT;CUT\r\n YPE=INDIVIDUAL:mailto:from@gmail.com\r\nORGANIZER;CN=To Name:mailto:to@gmail.com\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT30M\r\nDESCRIPTION:This is an event reminder\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n\r\n--=_f628560768da3fda8d0e09b03f7e4893--\r\n\r\n',
  "utf-8",
);
const updatedRaw = Buffer.from(b64DecodedRawMessage).toString("base64url");

export const raw = {
  id: "190de4c26806ee13",
  threadId: "190de4c26806ee13",
  labelIds: ["UNREAD", "CATEGORY_PERSONAL", "INBOX"],
  snippet: "<omitted>",
  sizeEstimate: 7484,
  raw: updatedRaw,
  historyId: "2512746",
  internalDate: "1721716449000",
};
