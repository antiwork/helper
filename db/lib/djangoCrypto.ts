import crypto from "crypto";

export class PickleJS {
  encodeData(data: any): Buffer {
    const opcodes: Buffer[] = [];

    // Protocol header: 0x80 followed by protocol version (e.g., 4)
    const protocolVersion = 4;
    opcodes.push(Buffer.from([0x80, protocolVersion]));

    // FRAME opcode (0x95) with frame size (8 bytes)
    opcodes.push(Buffer.from([0x95]));
    // We'll update the frame size later

    this.encodeValue(data, opcodes);

    // STOP opcode (0x2e)
    opcodes.push(Buffer.from([0x2e]));

    // Update frame size
    const frameSize = Buffer.concat(opcodes.slice(2)).length;
    const frameSizeBuffer = Buffer.alloc(8);
    frameSizeBuffer.writeBigUInt64LE(BigInt(frameSize));
    opcodes[1] = Buffer.concat([Buffer.from([0x95]), frameSizeBuffer]);

    return Buffer.concat(opcodes);
  }

  private encodeValue(value: any, opcodes: Buffer[]): void {
    if (typeof value === "string") {
      this.encodeString(value, opcodes);
    } else if (Buffer.isBuffer(value)) {
      this.encodeBytes(value, opcodes);
    } else if (Array.isArray(value)) {
      this.encodeList(value, opcodes);
    } else if (typeof value === "object" && value !== null) {
      this.encodeObject(value, opcodes);
    } else {
      throw new Error(`Unsupported type: ${typeof value}`);
    }
  }

  private encodeList(value: any[], opcodes: Buffer[]): void {
    opcodes.push(Buffer.from([0x95])); // FRAME
    opcodes.push(Buffer.from([0x7d])); // EMPTY_DICT
    opcodes.push(Buffer.from([0x94])); // MEMOIZE (for the empty dict)
    opcodes.push(Buffer.from([0x28])); // MARK
    for (const item of value) {
      this.encodeValue(item, opcodes);
    }
    opcodes.push(Buffer.from([0x65])); // LIST
  }

  private encodeString(value: string, opcodes: Buffer[]): void {
    const bufferData = Buffer.from(value, "utf8");
    if (bufferData.length < 256) {
      opcodes.push(Buffer.from([0x8c, bufferData.length]));
    } else {
      opcodes.push(Buffer.from([0x8d]));
      const lengthBuffer = Buffer.alloc(4);
      lengthBuffer.writeUInt32LE(bufferData.length);
      opcodes.push(lengthBuffer);
    }
    opcodes.push(bufferData);
    opcodes.push(Buffer.from([0x94])); // MEMOIZE
  }

  private encodeBytes(value: Buffer, opcodes: Buffer[]): void {
    opcodes.push(Buffer.from([0x58]));
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(value.length);
    opcodes.push(lengthBuffer);
    opcodes.push(value);
    opcodes.push(Buffer.from([0x94])); // MEMOIZE
  }

  private encodeObject(value: object, opcodes: Buffer[]): void {
    opcodes.push(Buffer.from([0x7d])); // EMPTY_DICT
    opcodes.push(Buffer.from([0x94])); // MEMOIZE
    opcodes.push(Buffer.from([0x28])); // MARK
    for (const [key, val] of Object.entries(value)) {
      this.encodeValue(key, opcodes);
      this.encodeValue(val, opcodes);
    }
    opcodes.push(Buffer.from([0x75])); // SETITEMS
  }

  decodeData(data: Buffer): any {
    let offset = 0;
    const stack: any[] = [];
    let markIndex = -1;

    // Read protocol header
    if (data[offset] !== 0x80) {
      throw new Error(`Unsupported pickle protocol header ${data[offset]}`);
    }
    offset += 1;

    const protocolVersion = data[offset];
    offset += 1;

    if (protocolVersion && protocolVersion > 5) {
      throw new Error(`Unsupported pickle protocol version ${protocolVersion}`);
    }

    while (offset < data.length) {
      const opcode = data[offset];
      offset += 1;

      // eslint-disable-next-line
      switch (opcode) {
        case 0x94: // MEMOIZE
          // No data associated; continue
          break;
        case 0x2e: // STOP
          // Finished parsing
          return stack.pop();
        case 0x95: // FRAME
          // Read frame size (8 bytes, little-endian)
          offset += 8;
          break;
        case 0x8c: // SHORT_BINUNICODE
          const length = data[offset];
          if (length === undefined) {
            throw new Error("Invalid data format: length is undefined");
          }
          offset += 1;
          const strData = data.slice(offset, offset + length).toString("utf8");
          offset += length;
          stack.push(strData);
          break;
        case 0x8d: // BINUNICODE
          const uniLength = data.readUInt32LE(offset);
          offset += 4;
          const uniData = data.slice(offset, offset + uniLength).toString("utf8");
          offset += uniLength;
          stack.push(uniData);
          break;
        case 0x58: // BINBYTES
          const bytesLength = data.readUInt32LE(offset);
          offset += 4;
          const bytesData = data.slice(offset, offset + bytesLength);
          offset += bytesLength;
          stack.push(bytesData);
          break;
        case 0x7d: // EMPTY_DICT
          stack.push({});
          break;
        case 0x73: // SETITEM
          const value = stack.pop();
          const key = stack.pop();
          const dict = stack[stack.length - 1];
          if (typeof dict === "object" && !Array.isArray(dict)) {
            dict[key] = value;
          }
          break;
        case 0x75: // SETITEMS
          const items = stack.splice(markIndex);
          const target = stack[stack.length - 1];
          if (typeof target === "object" && !Array.isArray(target)) {
            for (let i = 0; i < items.length - 1; i += 2) {
              target[items[i]] = items[i + 1];
            }
          }
          markIndex = -1;
          break;
        case 0x28: // MARK
          markIndex = stack.length;
          break;

        case 0x29: // TUPLE3 (older opcode)
          const item3 = stack.pop();
          const item2_3 = stack.pop();
          const item1_3 = stack.pop();
          stack.push([item1_3, item2_3, item3]);
          break;

        case 0x85: // TUPLE1
          stack.push([stack.pop()]);
          break;

        case 0x86: // TUPLE
          const tupleSize = stack.pop();
          const tupleItems = [];
          for (let i = 0; i < tupleSize; i++) {
            tupleItems.unshift(stack.pop());
          }
          stack.push(tupleItems);
          break;

        case 0x88: // NEWTRUE
          stack.push(true);
          break;

        case 0x89: // NEWFALSE
          stack.push(false);
          break;

        case 0x4a: // BININT
          const intValue = data.readInt32LE(offset);
          offset += 4;
          stack.push(intValue);
          break;

        case 0x47: // BINFLOAT
          const floatValue = data.readDoubleLE(offset);
          offset += 8;
          stack.push(floatValue);
          break;

        case 0x65: // LIST
          const listItems = stack.splice(markIndex);
          stack.push(listItems);
          markIndex = -1;
          break;

        case 0x8a: // LONG1 (single byte length)
          const len1 = data[offset];
          if (len1 === undefined) {
            throw new Error("Invalid data format: length is undefined");
          }
          offset += 1;
          const longData = data.slice(offset, offset + len1);
          offset += len1;

          // Convert bytes to number using little-endian format
          let valueLong = 0n;
          for (let i = 0; i < len1; i++) {
            valueLong += BigInt(longData[i] ?? 0) << BigInt(i * 8);
          }
          // Handle negative numbers (two's complement)
          const lastByte = longData[len1 - 1];
          if (lastByte !== undefined && lastByte & 0x80) {
            valueLong -= BigInt(1) << BigInt(len1 * 8);
          }

          stack.push(Number(valueLong));
          break;

        case 0x8e: // BINBYTES8 (8-byte length)
          const len8 = Number(data.readBigUInt64LE(offset));
          offset += 8;
          if (len8 > Number.MAX_SAFE_INTEGER) {
            throw new Error("BINBYTES8 exceeds system's maximum size");
          }
          const bytes8Data = data.slice(offset, offset + len8);
          offset += len8;
          stack.push(bytes8Data);
          break;

        default:
          const hexOpcode = `0x${opcode?.toString(16).padStart(2, "0")}`;
          throw new Error(`Unsupported pickle opcode ${hexOpcode}`);
      }
    }

    throw new Error("STOP opcode not found in pickle data");
  }
}

export class DjangoCryptoCompat {
  private secret_key: string;
  private pickle: PickleJS;

  constructor(secret_key: string) {
    this.secret_key = secret_key;
    this.pickle = new PickleJS();
  }

  encrypt(data: Buffer | string): Buffer {
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
    const pickledData = this.pickle.encodeData(bufferData);
    const current_time = Math.floor(Date.now() / 1000);
    const iv = crypto.randomBytes(16);
    return this._encrypt_from_parts(pickledData, current_time, iv);
  }

  _encrypt_from_parts(data: Buffer, current_time: number, iv: Buffer): Buffer {
    // PKCS7 padding
    const blockSize = 16;
    const padLength = blockSize - (data.length % blockSize);
    const padding = Buffer.alloc(padLength, padLength);
    const padded_data = Buffer.concat([data, padding]);

    // AES-CBC encryption
    const cipher = crypto.createCipheriv("aes-256-cbc", this.deriveKey(), iv);
    cipher.setAutoPadding(false); // Disable auto padding as we've manually padded
    let encrypted = cipher.update(padded_data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const ciphertext = Buffer.concat([iv, encrypted]);
    return this.sign(ciphertext, current_time);
  }

  sign(data: Buffer, current_time: number): Buffer {
    const version = Buffer.from([0x80]);
    const timestamp = Buffer.alloc(8);
    timestamp.writeBigUInt64BE(BigInt(current_time));

    const payload = Buffer.concat([version, timestamp, data]);
    const hmac = crypto.createHmac("sha256", this.secret_key);
    hmac.update(payload);
    const signature = hmac.digest();

    return Buffer.concat([payload, signature]);
  }

  decrypt(data: Buffer): Buffer {
    const unsigned = this.unsign(data);
    const iv = unsigned.slice(0, 16);
    const encrypted = unsigned.slice(16);
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.deriveKey(), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return this.pickle.decodeData(decrypted);
  }

  unsign(signed: any) {
    if (signed[0] !== 0x80) {
      throw new Error("Invalid version");
    }

    const signature = signed.slice(-32);
    const payload = signed.slice(0, -32);

    const hmac = crypto.createHmac("sha256", this.secret_key);
    hmac.update(payload);
    const expectedSignature = hmac.digest();

    if (!crypto.timingSafeEqual(signature, expectedSignature)) {
      throw new Error("Invalid signature");
    }

    return payload.slice(9); // Remove version and timestamp
  }

  deriveKey() {
    // Django uses PBKDF2 to derive the encryption key
    return crypto.pbkdf2Sync(this.secret_key, "django-cryptography", 30000, 32, "sha256");
  }
}
