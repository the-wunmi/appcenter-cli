//
// Parser for the output of the creds.exe helper program.
//

import { pipeline, split } from "event-stream";
import { Transform } from "stream";

//
// Regular expression to match the various fields in the input.
//

const fieldRe = /^([^:]+):\s(.*)$/;

//
// Convert space separated pascal caps ("Target Type")
// to camel case no spaces ("targetType"). Used to Convert
// field names to property names.
//
function fieldNameToPropertyName(fieldName: string): string {
  let parts = fieldName.split(" ");
  parts[0] = parts[0].toLowerCase();
  return parts.join("");
}

//
// Simple streaming parser, splits lines, collects them into single objects.
//
class WinCredStoreParsingStream extends Transform {
  currentEntry: any;

  constructor() {
    super({objectMode: true});
    this.currentEntry = null;
  }

  _transform(chunk: any, encoding: string, callback: {(err?: Error): void}): void {

    let line = chunk.toString();
    let count = 0;

    if (line === "") {
      if (this.currentEntry) {
        this.push(this.currentEntry);
        this.currentEntry = null;
        return callback();
      }
    }

    this.currentEntry = this.currentEntry || {};
    const match = fieldRe.exec(line);
    const key = fieldNameToPropertyName(match[1]);
    const value = match[2];
    this.currentEntry[key] = value;
    return callback();
  }

  _flush(callback: {(err?: Error): void}): void {
    if (this.currentEntry) {
      this.push(this.currentEntry);
      this.currentEntry = null;
    }
    callback();
  }
}

function createParsingStream(): NodeJS.ReadWriteStream {
  return <NodeJS.ReadWriteStream>pipeline(split(), new WinCredStoreParsingStream());
}

namespace createParsingStream {
  export let ParsingStream = WinCredStoreParsingStream;
}

export { createParsingStream };