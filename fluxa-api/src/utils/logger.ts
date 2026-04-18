const log = (level: string) => (msg: string, meta?: object) => {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`${timestamp} [${level}] ${msg}${metaStr}`);
};

export const logger = { 
    info: log('INFO'),
    warn: log('WARN'),
    error: log('ERROR'),
};