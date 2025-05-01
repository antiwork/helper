export class DataError extends Error {
  constructor(message: string, opts?: { cause: unknown }) {
    super(message);
    this.name = this.constructor.name;
    this.stack = undefined;
    this.cause = opts?.cause;
  }
}
