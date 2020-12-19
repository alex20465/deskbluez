export enum LEVEL {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
}


let level = LEVEL.ERROR;

export function setLevel(newLevel: LEVEL) {
    level = newLevel;
}

export function info(message: any, ...meta: any[]) {
    if(level >= LEVEL.INFO) console.log("[INFO]", message, ...meta);
}
export function debug(message: any, ...meta: any[]) {
    if(level >= LEVEL.DEBUG) console.debug("[DEBUG]", message, ...meta);
}
export function warn(message: any, ...meta: any[]) {
    if(level >= LEVEL.WARN) console.warn("[WARN]", message, ...meta);
}
export function error(message: any, ...meta: any[]) {
    if(level >= LEVEL.ERROR) console.error("[ERROR]", message, ...meta);
}

export default {info, debug, warn, error, setLevel, LEVEL};