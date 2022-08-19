/**
 * This is file that contains interpreter logic itself, detached from React.js implementation
 * However the reason why functions are extracted and called with interpreter as argument is to make it easier to use with React's states
 */

import { InstructionLengthInfo } from "./AssemblyInfo";

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

export function convertTextToCode(text) {
    let program = [];
    let jumps = {};
    //regular expression that will match every comment on every line
    text = text.replaceAll(/( *)(;)(.*)/g, "");
    const nameRegEx = /[A-z]{3,4}((?=\s+)|$)/;
    const labelRegEx = /[A-z]+(?=:)/;
    let lines = text.split("\n").filter(token => token.match(/^(\s)+$/) == null && token.length > 0);
    let lineId = 0;
    let result = [];
    for (let line of lines) {
        let labelName = line.match(labelRegEx);
        if (labelName != null) {
            jumps[labelName[0]] = lineId;
            continue;
        }
        let tokens = line.split(/\s*(?: |,|$)\s*/).filter(token => token.length > 0);
        let arg1 = parseInt(tokens[1]);
        let arg2 = parseInt(tokens[2]);
        if (!(tokens[0] in InstructionLengthInfo)) {
            throw Error("Given instruction is recognized: '" + tokens[0] + "'");
        }
        if ((InstructionLengthInfo[tokens[0]] + 1) === tokens.length) {
            program.push({
                operation: tokens[0],
                arg1: isNaN(arg1) ? tokens[1] : arg1,
                arg2: isNaN(arg2) ? tokens[2] : arg2
            });
        }
        else {
            throw Error("Provided instruction has more/less operands then required")
        }
        console.log(tokens);
        lineId++;
    }
    return {
        program: program,
        jumps: jumps
    }
}

/**Moves to the next instruction and executes it*/
export function stepProgram(interpreter) {
    const operand = interpreter.program[interpreter.programCounter];
    switch (operand.operation) {
        case "mov":
            interpreter.registry[operand.arg1] = interpreter.registry[operand.arg2];
            break;
        case "mvi":
            interpreter.registry[operand.arg1] = operand.arg2;
            break;
        case "sta":
            interpreter.memory[operand.arg1 - 0x800] = interpreter.registry.a;
            break;
        //adds A + other register/number, this does NOT write to CY flag
        case "add":
            {
                let value = (typeof operand.arg1) === "number" ? operand.arg1 : interpreter.registry[operand.arg1];
                let result = interpreter.registry.a + value;
                interpreter.flags = checkFlags(result);
                interpreter.registry.a = result & 0xff;//trim bits that would not physically fit in the cell in the actual processor
            }
            break;
        //adds A + other register/number, this does write to CY flag
        case "adc":
            {
                let value = (typeof operand.arg1) === "number" ? operand.arg1 : interpreter.registry[operand.arg1];
                let result = interpreter.registry.a + value + interpreter.flags.c ? 1 : 0;
                interpreter.flags = checkFlags(result);
                interpreter.registry.a = result & 0xff;//trim bits that would not physically fit in the cell in the actual processor
            } break;
        case "cma":
            interpreter.registry.a = ~interpreter.registry.a;
            break;
        case "cmc":
            interpreter.flags.c = !interpreter.flags.c;
            break;
        case "ana":
            {
                let result = interpreter.registry.a & interpreter.registry[operand.arg1];
                let flags = checkFlags(result);
                //Carry bit must be reset according to documentation
                flags.c = false;
                interpreter.registry.a = result;
                interpreter.flags = flags;
            }
            break;
        case "ani":
            {
                let result = interpreter.registry.a & operand.arg1;
                let flags = checkFlags(result);
                //Carry bit must be reset according to documentation
                flags.c = false;
                interpreter.registry.a = result;
                interpreter.flags = flags;
            }
            break;
        case "jmp":
            interpreter.programCounter = interpreter.jumps[operand.arg1] - 1;
            break;
        case "push":
            {
                let value1 = 0;
                let value2 = 0;
                switch (operand.arg1) {
                    case "b":
                        value1 = interpreter.registry.b;
                        value2 = interpreter.registry.c;
                        break;
                    case "d":
                        value1 = interpreter.registry.d;
                        value2 = interpreter.registry.e;
                        break;
                    case "h":
                        value1 = interpreter.registry.h;
                        value2 = interpreter.registry.l;
                        break;
                    default:
                        throw Error("Invalid registry name provided");
                }
                interpreter.memory[interpreter.stackPointer] = value1;
                interpreter.memory[--interpreter.stackPointer] = value2;
            }
            break;
        case "pop":
            {
                let value2 = interpreter.memory[interpreter.stackPointer];
                let value1 = interpreter.memory[++interpreter.stackPointer];
                switch (operand.arg1) {
                    case "b":
                        interpreter.registry.b = value1;
                        interpreter.registry.c = value2;
                        break;
                    case "d":
                        interpreter.registry.d = value1;
                        interpreter.registry.e = value2;
                        break;
                    case "h":
                        interpreter.registry.h = value1;
                        interpreter.registry.l = value2;
                        break;
                    default:
                        throw Error("Invalid registry name provided");
                }
            }
            break;
        case "call":
            interpreter.memory[interpreter.stackPointer] = (0x800 + interpreter.programCounter) & 0xFF;
            interpreter.memory[--interpreter.stackPointer] = ((0x800 + interpreter.programCounter) & 0xFF00) >> 8;
            interpreter.programCounter = interpreter.jumps[operand.arg1] - 1;
            break;
        case "ret":
            let address = ((interpreter.memory[interpreter.stackPointer] << 8) & interpreter.memory[++interpreter.stackPointer]);
            break;
        case "htl":
            console.info("Finished execution");
            break;
        default:
            console.error("Unknown operand " + interpreter.program[interpreter.programCounter].operation);
            break;
    }
    interpreter.programCounter++;
    //console.log(operand.command);
    return interpreter;
}

function add(interpreter, value) {
    let result = interpreter.registry.a + interpreter.registry[value];
    interpreter.flags = checkFlags(result);
    interpreter.registry.a = result & 0xff;//trim bits that would not physically fit in the cell in the actual processor
}

function adc(interpreter, value) {
    let result = interpreter.registry.a + interpreter.registry[value] + (interpreter.flags.c ? 1 : 0);
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
        //mov commands
        //i generated them via c# script :P
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
            interpreter.registry.b = interpreter.memory[interpreter.programCounter];
            break;
        case 0xe: //mvi c,d8
            interpreter.registry.c = interpreter.memory[interpreter.programCounter];
            break;
        case 0x16: //mvi d,d8
            interpreter.registry.d = interpreter.memory[interpreter.programCounter];
            break;
        case 0x1e: //mvi e,d8
            interpreter.registry.e = interpreter.memory[interpreter.programCounter];
            break;
        case 0x26: //mvi h,d8
            interpreter.registry.h = interpreter.memory[interpreter.programCounter];
            break;
        case 0x2e: //mvi l,d8
            interpreter.registry.l = interpreter.memory[interpreter.programCounter];
            break;
        case 0x36: //mvi m,d8
            interpreter.registry.m = interpreter.memory[interpreter.programCounter];
            break;
        case 0x3e: //mvi a,d8
            interpreter.registry.a = interpreter.memory[interpreter.programCounter];
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
}