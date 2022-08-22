/**
 * This is file that contains interpreter logic itself, detached from React.js implementation
 * However the reason why functions are extracted and called with interpreter as argument is to make it easier to use with React's states
 */

import { InstructionLengthInfo, Instructions, JumpInstructions } from "./AssemblyInfo";

/**Class that stores all of the processor related info */
export default class Interpreter {
    constructor() {
        /**
        * Operations are stored not as op codes but in a more convenient format that 
        * stores operation name and operands, reducing need for weird jumps depending on
        * how long is the operation and reducing amount of switch cases needed
        * 
        *(there are at least 20 mov operations, i'm not doing them all by hand :O )
        */
        this.flags = {
            s: false,
            z: false,
            ac: false,
            p: false,
            c: false
        };
        /**All of the memory that this processor has access to */
        this.memory = Array(0xbb0 - 0x800).fill(0);
        /**
         * Jumps is map of all jump labels present in the program
         * index is relative to processed program rather then original program id
         */
        this.jumps = [];
        this.programCounter = 0;
        //This emulator has address space from 0800 to 0bb0
        //and 0bb0-0800 is 380 which is 944 in decimal
        this.stackPointer = 943;
        /**Stores values of the register */
        this.registry = {
            a: 0,
            b: 0,
            c: 0,
            d: 0,
            e: 0,
            h: 0,
            l: 0
        };
    }
}

/**Check for parity(?) 
  * This technically returns true if amount of bits that are equal to 1 is even
 */
export function parity(x, size) {
    let parity = 0;
    for (let i = 0; i < size; i++) {
        parity += x & 1;
        x = x >> 1;
    }
    return (parity % 2) === 0;
}

/**This will extract value and return number
 * So if passed id is register name it will return value of the register
 * 
 * If id is number it will return number
 * 
 * And if id is M it will return value at memory cell with address stored in HL
 */
export function getValue(id, interpreter) {
    return (typeof id) == "number" ? id : interpreter.registry[id];
}

/**Performs checks on the given value and returns FLAGS objects with results */
export function checkFlags(value) {
    //clean value from any bits that technically don't fit into memory cell
    const cleanValue = value & 0xFF;
    return {
        s: 0x80 === (cleanValue & 0x80),
        z: cleanValue === 0,
        ac: cleanValue > 0x09,
        p: parity(cleanValue, 8),
        c: value > 0xFF
    }
}

/**Convert number to a byte array that is stored in the i8080 compatible way
* Right pair of the number first
*/
function convertNumberToBytes(number) {
    if (number > 0xff) {
        return [number & 0x00FF, (number & 0xFF00) >> 8]
    }
    return [number];
}

/**Convert two bytes of 8bit numbers back into 16bit number */
function convertBytesToNumber(bytes) {
    return (bytes[0] << 8) + bytes[1];
}

/**Converts tokens for the line into byte codes for the instruction and the arguments */
function convertTokensToBytes(tokens) {
    let argumentCount = 0;
    for (let i = 1; i < tokens.length; i++) {
        argumentCount += (tokens[i] !== undefined ? 1 : 0);
    }
    if (argumentCount !== InstructionLengthInfo[tokens[0]]) {
        throw Error("Invalid number of arguments");
    }
    let value1 = parseInt(tokens[1]);
    let value2 = parseInt(tokens[2]);
    let value1IsAName = tokens[1] !== undefined && isNaN(value1);
    let value2IsAName = tokens[2] !== undefined && isNaN(value2);
    if (value1IsAName && value2IsAName) {
        return [Instructions[tokens[0]][tokens[1]][tokens[2]]];
    }
    if (value1IsAName) {
        return [Instructions[tokens[0]][tokens[1]], convertNumberToBytes(value2)].flat();
    } else {
        return tokens[1] === undefined ? [Instructions[tokens[0]]].flat() : [Instructions[tokens[0]], convertNumberToBytes(value1)].flat();
    }
}

function parseJumpInstruction(tokens, location, jumps, unfinishedJumps) {
    //jump commands are always excepting one argument so to avoid having label accidentally converted into registry name 
    let result = [];
    result.push(Instructions[tokens[0]]);
    if (tokens[1] in jumps) {
        let index = convertNumberToBytes(jumps[tokens[1]] + 0x800);
        result.push(index[0]);
        result.push(index[1]);
    }
    else {
        unfinishedJumps.push({ name: tokens[1], location: location + 1 });
        result.push(undefined);
        result.push(undefined);
    }
    return result;
}

/**Convert assembly text code into bytes and return  resulting  memory bank */
export function convertTextToCode(text) {
    let program = Array(0xbb0 - 0x800).fill(0);
    //records places in memory that reference jump labels
    let jumps = {};
    let unfinishedJumps = [];
    let counter = 0;
    //regular expression that will match every comment on every line
    text = text.replaceAll(/( *)(;)(.*)/g, "");
    const labelRegEx = /[A-z]+(?=:)/;
    let lines = text.split("\n").filter(token => token.match(/^(\s)+$/) == null && token.length > 0);
    for (let line of lines) {
        let labelName = line.match(labelRegEx);
        if (labelName != null) {
            jumps[labelName[0]] = counter;
            continue;
        }
        let tokens = line.split(/\s*(?: |,|$)\s*/).filter(token => token.length > 0);
        //we have to take special action incase of jump and call instructions because they can accept labels as input 
        let isJump = (JumpInstructions.includes(tokens[0]) && tokens.length === 2);
        let bytes = isJump ? parseJumpInstruction(tokens, counter, jumps, unfinishedJumps) : convertTokensToBytes(tokens);
        for (let byte of bytes) {
            program[counter++] = byte;
        }
    }
    for (let jump of unfinishedJumps) {
        let location = convertNumberToBytes(0x800 + jumps[jump.name]);
        program[jump.location] = location[0];
        program[jump.location + 1] = location[1];
    }
    return program;
}

function add(interpreter, value) {
    let result = interpreter.registry.a + interpreter.registry[value];
    interpreter.flags = checkFlags(result);
    interpreter.registry.a = result & 0xff;//trim bits that would not physically fit in the cell in the actual processor
}

function adi(interpreter, value) {
    let result = interpreter.registry.a + value;
    interpreter.flags = checkFlags(result);
    interpreter.registry.a = result & 0xff;//trim bits that would not physically fit in the cell in the actual processor
}

function adc(interpreter, value) {
    let result = interpreter.registry.a + interpreter.registry[value] + (interpreter.flags.c ? 1 : 0);
    interpreter.flags = checkFlags(result);
    interpreter.registry.a = result & 0xff;//trim bits that would not physically fit in the cell in the actual processor
}

function aci(interpreter, value) {
    let result = interpreter.registry.a + value + (interpreter.flags.c ? 1 : 0);
    interpreter.flags = checkFlags(result);
    interpreter.registry.a = result & 0xff;//trim bits that would not physically fit in the cell in the actual processor
}

function ana(interpreter, value) {
    let result = interpreter.registry.a & interpreter.registry[value];
    let flags = checkFlags(result);
    //Carry bit must be reset according to documentation
    flags.c = false;
    interpreter.registry.a = result;
    interpreter.flags = flags;
}

function ani(interpreter, value) {
    let result = interpreter.registry.a & value;
    let flags = checkFlags(result);
    //Carry bit must be reset according to documentation
    flags.c = false;
    interpreter.registry.a = result;
    interpreter.flags = flags;
}

export function executionStep(interpreter) {
    let opByte = interpreter.memory[interpreter.programCounter];
    switch (opByte) {
        //i generated them via c# script :P
        case 0x76: case 118:
            throw Error("Program exit handling is not implemented");
            break;
        case 0xe6:
            ani(interpreter, interpreter.memory[++interpreter.programCounter]);
            break;
        case Instructions.adi:
            adi(interpreter, interpreter.memory[++interpreter.programCounter]);
            break;
        case Instructions.push.b:
            interpreter.memory[interpreter.stackPointer--] = interpreter.registry.b;
            interpreter.memory[interpreter.stackPointer--] = interpreter.registry.c;
            break;
        case Instructions.push.d:
            interpreter.memory[interpreter.stackPointer--] = interpreter.registry.d;
            interpreter.memory[interpreter.stackPointer--] = interpreter.registry.e;
            break;
        case Instructions.push.h:
            interpreter.memory[interpreter.stackPointer--] = interpreter.registry.h;
            interpreter.memory[interpreter.stackPointer--] = interpreter.registry.l;
            break;
        case Instructions.jmp:
            {
                //read next 2 bytes
                let address = [
                    interpreter.memory[++interpreter.programCounter],
                    interpreter.memory[++interpreter.programCounter]
                ];
                interpreter.programCounter = convertBytesToNumber(address.reverse()) - 0x800 - 1;
            }
            break;
        case Instructions.call:
            {
                let savedAddress = convertNumberToBytes(interpreter.programCounter + 0x800);
                interpreter.memory[interpreter.stackPointer--] = savedAddress[0];
                interpreter.memory[interpreter.stackPointer--] = savedAddress[1];

                let address = [
                    interpreter.memory[++interpreter.programCounter],
                    interpreter.memory[++interpreter.programCounter]
                ];
                interpreter.programCounter = convertBytesToNumber(address.reverse()) - 0x800 - 1;
            }
            break;
        case Instructions.ret:
            {
                let address = [
                    interpreter.memory[++interpreter.stackPointer],
                    interpreter.memory[++interpreter.stackPointer]
                ];
                interpreter.programCounter = convertBytesToNumber(address) - 0x800 - 1;
            }
            break;
        //----MOV------
        case 0x40: //mov b,b
            interpreter.registry.b = interpreter.registry.b;
            break;
        case 0x41: //mov b,c
            interpreter.registry.b = interpreter.registry.c;
            break;
        case 0x42: //mov b,d
            interpreter.registry.b = interpreter.registry.d;
            break;
        case 0x43: //mov b,e
            interpreter.registry.b = interpreter.registry.e;
            break;
        case 0x44: //mov b,h
            interpreter.registry.b = interpreter.registry.h;
            break;
        case 0x45: //mov b,l
            interpreter.registry.b = interpreter.registry.l;
            break;
        case 0x46: //mov b,m
            interpreter.registry.b = interpreter.registry.m;
            break;
        case 0x47: //mov b,a
            interpreter.registry.b = interpreter.registry.a;
            break;
        case 0x48: //mov c,b
            interpreter.registry.c = interpreter.registry.b;
            break;
        case 0x49: //mov c,c
            interpreter.registry.c = interpreter.registry.c;
            break;
        case 0x4a: //mov c,d
            interpreter.registry.c = interpreter.registry.d;
            break;
        case 0x4b: //mov c,e
            interpreter.registry.c = interpreter.registry.e;
            break;
        case 0x4c: //mov c,h
            interpreter.registry.c = interpreter.registry.h;
            break;
        case 0x4d: //mov c,l
            interpreter.registry.c = interpreter.registry.l;
            break;
        case 0x4e: //mov c,m
            interpreter.registry.c = interpreter.registry.m;
            break;
        case 0x4f: //mov c,a
            interpreter.registry.c = interpreter.registry.a;
            break;
        case 0x50: //mov d,b
            interpreter.registry.d = interpreter.registry.b;
            break;
        case 0x51: //mov d,c
            interpreter.registry.d = interpreter.registry.c;
            break;
        case 0x52: //mov d,d
            interpreter.registry.d = interpreter.registry.d;
            break;
        case 0x53: //mov d,e
            interpreter.registry.d = interpreter.registry.e;
            break;
        case 0x54: //mov d,h
            interpreter.registry.d = interpreter.registry.h;
            break;
        case 0x55: //mov d,l
            interpreter.registry.d = interpreter.registry.l;
            break;
        case 0x56: //mov d,m
            interpreter.registry.d = interpreter.registry.m;
            break;
        case 0x57: //mov d,a
            interpreter.registry.d = interpreter.registry.a;
            break;
        case 0x58: //mov e,b
            interpreter.registry.e = interpreter.registry.b;
            break;
        case 0x59: //mov e,c
            interpreter.registry.e = interpreter.registry.c;
            break;
        case 0x5a: //mov e,d
            interpreter.registry.e = interpreter.registry.d;
            break;
        case 0x5b: //mov e,e
            interpreter.registry.e = interpreter.registry.e;
            break;
        case 0x5c: //mov e,h
            interpreter.registry.e = interpreter.registry.h;
            break;
        case 0x5d: //mov e,l
            interpreter.registry.e = interpreter.registry.l;
            break;
        case 0x5e: //mov e,m
            interpreter.registry.e = interpreter.registry.m;
            break;
        case 0x5f: //mov e,a
            interpreter.registry.e = interpreter.registry.a;
            break;
        case 0x60: //mov h,b
            interpreter.registry.h = interpreter.registry.b;
            break;
        case 0x61: //mov h,c
            interpreter.registry.h = interpreter.registry.c;
            break;
        case 0x62: //mov h,d
            interpreter.registry.h = interpreter.registry.d;
            break;
        case 0x63: //mov h,e
            interpreter.registry.h = interpreter.registry.e;
            break;
        case 0x64: //mov h,h
            interpreter.registry.h = interpreter.registry.h;
            break;
        case 0x65: //mov h,l
            interpreter.registry.h = interpreter.registry.l;
            break;
        case 0x66: //mov h,m
            interpreter.registry.h = interpreter.registry.m;
            break;
        case 0x67: //mov h,a
            interpreter.registry.h = interpreter.registry.a;
            break;
        case 0x68: //mov l,b
            interpreter.registry.l = interpreter.registry.b;
            break;
        case 0x69: //mov l,c
            interpreter.registry.l = interpreter.registry.c;
            break;
        case 0x6a: //mov l,d
            interpreter.registry.l = interpreter.registry.d;
            break;
        case 0x6b: //mov l,e
            interpreter.registry.l = interpreter.registry.e;
            break;
        case 0x6c: //mov l,h
            interpreter.registry.l = interpreter.registry.h;
            break;
        case 0x6d: //mov l,l
            interpreter.registry.l = interpreter.registry.l;
            break;
        case 0x6e: //mov l,m
            interpreter.registry.l = interpreter.registry.m;
            break;
        case 0x6f: //mov l,a
            interpreter.registry.l = interpreter.registry.a;
            break;
        case 0x70: //mov m,b
            interpreter.registry.m = interpreter.registry.b;
            break;
        case 0x71: //mov m,c
            interpreter.registry.m = interpreter.registry.c;
            break;
        case 0x72: //mov m,d
            interpreter.registry.m = interpreter.registry.d;
            break;
        case 0x73: //mov m,e
            interpreter.registry.m = interpreter.registry.e;
            break;
        case 0x74: //mov m,h
            interpreter.registry.m = interpreter.registry.h;
            break;
        case 0x75: //mov m,l
            interpreter.registry.m = interpreter.registry.l;
            break;
        case 0x76: //mov m,m
            interpreter.registry.m = interpreter.registry.m;
            break;
        case 0x77: //mov m,a
            interpreter.registry.m = interpreter.registry.a;
            break;
        case 0x78: //mov a,b
            interpreter.registry.a = interpreter.registry.b;
            break;
        case 0x79: //mov a,c
            interpreter.registry.a = interpreter.registry.c;
            break;
        case 0x7a: //mov a,d
            interpreter.registry.a = interpreter.registry.d;
            break;
        case 0x7b: //mov a,e
            interpreter.registry.a = interpreter.registry.e;
            break;
        case 0x7c: //mov a,h
            interpreter.registry.a = interpreter.registry.h;
            break;
        case 0x7d: //mov a,l
            interpreter.registry.a = interpreter.registry.l;
            break;
        case 0x7e: //mov a,m
            interpreter.registry.a = interpreter.registry.m;
            break;
        case 0x7f: //mov a,a
            interpreter.registry.a = interpreter.registry.a;
            break;
        //------MVI------
        case 0x6: //mvi b,d8
            interpreter.registry.b = interpreter.memory[++interpreter.programCounter];
            break;
        case 0xe: //mvi c,d8
            interpreter.registry.c = interpreter.memory[++interpreter.programCounter];
            break;
        case 0x16: //mvi d,d8
            interpreter.registry.d = interpreter.memory[++interpreter.programCounter];
            break;
        case 0x1e: //mvi e,d8
            interpreter.registry.e = interpreter.memory[++interpreter.programCounter];
            break;
        case 0x26: //mvi h,d8
            interpreter.registry.h = interpreter.memory[++interpreter.programCounter];
            break;
        case 0x2e: //mvi l,d8
            interpreter.registry.l = interpreter.memory[++interpreter.programCounter];
            break;
        case 0x36: //mvi m,d8
            interpreter.registry.m = interpreter.memory[++interpreter.programCounter];
            break;
        case 0x3e: //mvi a,d8
            interpreter.registry.a = interpreter.memory[++interpreter.programCounter];
            break;
        //------ADD------
        case 0x80: //add b
            add(interpreter, 'b');
            break;
        case 0x81: //add c
            add(interpreter, 'c');
            break;
        case 0x82: //add d
            add(interpreter, 'd');
            break;
        case 0x83: //add e
            add(interpreter, 'e');
            break;
        case 0x84: //add h
            add(interpreter, 'h');
            break;
        case 0x85: //add l
            add(interpreter, 'l');
            break;
        case 0x86: //add m
            add(interpreter, 'm');
            break;
        case 0x87: //add a
            add(interpreter, 'a');
            break;
        //------ADC------
        case 0x88: //adc b
            adc(interpreter, 'b');
            break;
        case 0x89: //adc c
            adc(interpreter, 'c');
            break;
        case 0x8a: //adc d
            adc(interpreter, 'd');
            break;
        case 0x8b: //adc e
            adc(interpreter, 'e');
            break;
        case 0x8c: //adc h
            adc(interpreter, 'h');
            break;
        case 0x8d: //adc l
            adc(interpreter, 'l');
            break;
        case 0x8e: //adc m
            adc(interpreter, 'm');
            break;
        case 0x8f: //adc a
            adc(interpreter, 'a');
            break;
        //------ANA------
        case 0xa0: //ana b
            ana(interpreter, 'b');
            break;
        case 0xa1: //ana c
            ana(interpreter, 'c');
            break;
        case 0xa2: //ana d
            ana(interpreter, 'd');
            break;
        case 0xa3: //ana e
            ana(interpreter, 'e');
            break;
        case 0xa4: //ana h
            ana(interpreter, 'h');
            break;
        case 0xa5: //ana l
            ana(interpreter, 'l');
            break;
        case 0xa6: //ana m
            ana(interpreter, 'm');
            break;
        case 0xa7: //ana a
            ana(interpreter, 'a');
            break;
        default:
            throw Error("Unrecognized byte code");
    }
    interpreter.programCounter++;
    return interpreter;
}