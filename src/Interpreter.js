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
        this.finishedExecution = false;
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
    if (!(tokens[0] in Instructions)) {
        throw Error("Unknown instruction");
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
    let errors = [];
    let counter = 0;
    let lineCounter = 0;
    //regular expression that will match every comment on every line
    text = text.replaceAll(/( *)(;)(.*)/g, "");
    const labelRegEx = /[A-z]+(?=:)/;
    let lines = text.split("\n");
    for (let line of lines) {
        try {
            if (line.match(/^(\s)+$/) != null || line.length === 0) {
                lineCounter++;
                continue;
            }
            let labelName = line.match(labelRegEx);
            if (labelName != null) {
                jumps[labelName[0]] = counter;
                lineCounter++;
                continue;
            }

            let tokens = line.split(/\s*(?: |,|$)\s*/).filter(token => token.length > 0);
            //we have to take special action incase of jump and call instructions because they can accept labels as input 
            let isJump = (JumpInstructions.includes(tokens[0]) && tokens.length === 2);
            let bytes = isJump ? parseJumpInstruction(tokens, counter, jumps, unfinishedJumps) : convertTokensToBytes(tokens);
            for (let byte of bytes) {
                program[counter++] = byte;
            }
        } catch (err) {
            errors.push({
                line: lineCounter,
                error: err.message
            });
        }
        lineCounter++;
    }
    for (let jump of unfinishedJumps) {
        let location = convertNumberToBytes(0x800 + jumps[jump.name]);
        program[jump.location] = location[0];
        program[jump.location + 1] = location[1];
    }
    return { program: program, errors: errors };
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
            interpreter.finishedExecution = true;
        case 0xe6:
            ani(interpreter, interpreter.memory[++interpreter.programCounter]);
            break;
        case Instructions.adi:
            adi(interpreter, interpreter.memory[++interpreter.programCounter]);
            break;
        case Instructions.aci:
            aci(interpreter, interpreter.memory[++interpreter.programCounter]);
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
        case Instructions.lxi.b:
            {
                let data = [
                    interpreter.memory[++interpreter.programCounter],
                    interpreter.memory[++interpreter.programCounter]
                ].reverse();
                interpreter.registry.b = data[0];
                interpreter.registry.c = data[1];
            }
            break;
        case Instructions.lxi.d:
            {
                let data = [
                    interpreter.memory[++interpreter.programCounter],
                    interpreter.memory[++interpreter.programCounter]
                ].reverse();
                interpreter.registry.d = data[0];
                interpreter.registry.e = data[1];
            }
            break;
        case Instructions.lxi.h:
            {
                let data = [
                    interpreter.memory[++interpreter.programCounter],
                    interpreter.memory[++interpreter.programCounter]
                ].reverse();
                interpreter.registry.h = data[0];
                interpreter.registry.l = data[1];
            }
            break;
        case Instructions.lxi.sp:
            {
                let data = [
                    interpreter.memory[++interpreter.programCounter],
                    interpreter.memory[++interpreter.programCounter]
                ].reverse();
                let address = convertBytesToNumber(data);
                interpreter.stackPointer = address - 0x800;
            }
            break;
        case Instructions.lhld:
            {
                let bytes = [
                    interpreter.memory[++interpreter.programCounter],
                    interpreter.memory[++interpreter.programCounter]
                ].reverse();
                let address = convertBytesToNumber(bytes) - 0x800;
                interpreter.registry.h = interpreter.memory[address + 1];
                interpreter.registry.l = interpreter.memory[address];
            }
            break;
        case Instructions.shld:
            {
                let bytes = [
                    interpreter.memory[++interpreter.programCounter],
                    interpreter.memory[++interpreter.programCounter]
                ].reverse();
                let address = convertBytesToNumber(bytes) - 0x800;
                interpreter.memory[address + 1] = interpreter.registry.h;
                interpreter.memory[address] = interpreter.registry.l;
            }
            break;
        case Instructions.xchg:
            [interpreter.registry.h, interpreter.registry.d] = [interpreter.registry.d, interpreter.registry.h];
            [interpreter.registry.l, interpreter.registry.e] = [interpreter.registry.e, interpreter.registry.l];
            break;
        case Instructions.sta:
            {
                //read next 2 bytes
                let address = [
                    interpreter.memory[++interpreter.programCounter],
                    interpreter.memory[++interpreter.programCounter]
                ];
                interpreter.memory[convertBytesToNumber(address.reverse()) - 0x800] = interpreter.registry.a;
            }
            break;
        case Instructions.lda:
            {
                //read next 2 bytes
                let address = [
                    interpreter.memory[++interpreter.programCounter],
                    interpreter.memory[++interpreter.programCounter]
                ];
                interpreter.registry.a = interpreter.memory[convertBytesToNumber(address.reverse()) - 0x800];
            }
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
        //------MOV------
        case Instructions.mov.b.c: //mov b,c
            interpreter.registry.b = interpreter.registry.c;
            break;
        case Instructions.mov.b.d: //mov b,d
            interpreter.registry.b = interpreter.registry.d;
            break;
        case Instructions.mov.b.e: //mov b,e
            interpreter.registry.b = interpreter.registry.e;
            break;
        case Instructions.mov.b.h: //mov b,h
            interpreter.registry.b = interpreter.registry.h;
            break;
        case Instructions.mov.b.l: //mov b,l
            interpreter.registry.b = interpreter.registry.l;
            break;
        case Instructions.mov.b.m: //mov b,m
            interpreter.registry.b = interpreter.registry.m;
            break;
        case Instructions.mov.b.a: //mov b,a
            interpreter.registry.b = interpreter.registry.a;
            break;
        case Instructions.mov.c.b: //mov c,b
            interpreter.registry.c = interpreter.registry.b;
            break;
        case Instructions.mov.c.d: //mov c,d
            interpreter.registry.c = interpreter.registry.d;
            break;
        case Instructions.mov.c.e: //mov c,e
            interpreter.registry.c = interpreter.registry.e;
            break;
        case Instructions.mov.c.h: //mov c,h
            interpreter.registry.c = interpreter.registry.h;
            break;
        case Instructions.mov.c.l: //mov c,l
            interpreter.registry.c = interpreter.registry.l;
            break;
        case Instructions.mov.c.m: //mov c,m
            interpreter.registry.c = interpreter.registry.m;
            break;
        case Instructions.mov.c.a: //mov c,a
            interpreter.registry.c = interpreter.registry.a;
            break;
        case Instructions.mov.d.b: //mov d,b
            interpreter.registry.d = interpreter.registry.b;
            break;
        case Instructions.mov.d.c: //mov d,c
            interpreter.registry.d = interpreter.registry.c;
            break;
        case Instructions.mov.d.e: //mov d,e
            interpreter.registry.d = interpreter.registry.e;
            break;
        case Instructions.mov.d.h: //mov d,h
            interpreter.registry.d = interpreter.registry.h;
            break;
        case Instructions.mov.d.l: //mov d,l
            interpreter.registry.d = interpreter.registry.l;
            break;
        case Instructions.mov.d.m: //mov d,m
            interpreter.registry.d = interpreter.registry.m;
            break;
        case Instructions.mov.d.a: //mov d,a
            interpreter.registry.d = interpreter.registry.a;
            break;
        case Instructions.mov.e.b: //mov e,b
            interpreter.registry.e = interpreter.registry.b;
            break;
        case Instructions.mov.e.c: //mov e,c
            interpreter.registry.e = interpreter.registry.c;
            break;
        case Instructions.mov.e.d: //mov e,d
            interpreter.registry.e = interpreter.registry.d;
            break;
        case Instructions.mov.e.h: //mov e,h
            interpreter.registry.e = interpreter.registry.h;
            break;
        case Instructions.mov.e.l: //mov e,l
            interpreter.registry.e = interpreter.registry.l;
            break;
        case Instructions.mov.e.m: //mov e,m
            interpreter.registry.e = interpreter.registry.m;
            break;
        case Instructions.mov.e.a: //mov e,a
            interpreter.registry.e = interpreter.registry.a;
            break;
        case Instructions.mov.h.b: //mov h,b
            interpreter.registry.h = interpreter.registry.b;
            break;
        case Instructions.mov.h.c: //mov h,c
            interpreter.registry.h = interpreter.registry.c;
            break;
        case Instructions.mov.h.d: //mov h,d
            interpreter.registry.h = interpreter.registry.d;
            break;
        case Instructions.mov.h.e: //mov h,e
            interpreter.registry.h = interpreter.registry.e;
            break;
        case Instructions.mov.h.l: //mov h,l
            interpreter.registry.h = interpreter.registry.l;
            break;
        case Instructions.mov.h.m: //mov h,m
            interpreter.registry.h = interpreter.registry.m;
            break;
        case Instructions.mov.h.a: //mov h,a
            interpreter.registry.h = interpreter.registry.a;
            break;
        case Instructions.mov.l.b: //mov l,b
            interpreter.registry.l = interpreter.registry.b;
            break;
        case Instructions.mov.l.c: //mov l,c
            interpreter.registry.l = interpreter.registry.c;
            break;
        case Instructions.mov.l.d: //mov l,d
            interpreter.registry.l = interpreter.registry.d;
            break;
        case Instructions.mov.l.e: //mov l,e
            interpreter.registry.l = interpreter.registry.e;
            break;
        case Instructions.mov.l.h: //mov l,h
            interpreter.registry.l = interpreter.registry.h;
            break;
        case Instructions.mov.l.m: //mov l,m
            interpreter.registry.l = interpreter.registry.m;
            break;
        case Instructions.mov.l.a: //mov l,a
            interpreter.registry.l = interpreter.registry.a;
            break;
        case Instructions.mov.m.b: //mov m,b
            interpreter.registry.m = interpreter.registry.b;
            break;
        case Instructions.mov.m.c: //mov m,c
            interpreter.registry.m = interpreter.registry.c;
            break;
        case Instructions.mov.m.d: //mov m,d
            interpreter.registry.m = interpreter.registry.d;
            break;
        case Instructions.mov.m.e: //mov m,e
            interpreter.registry.m = interpreter.registry.e;
            break;
        case Instructions.mov.m.h: //mov m,h
            interpreter.registry.m = interpreter.registry.h;
            break;
        case Instructions.mov.m.l: //mov m,l
            interpreter.registry.m = interpreter.registry.l;
            break;
        case Instructions.mov.m.a: //mov m,a
            interpreter.registry.m = interpreter.registry.a;
            break;
        case Instructions.mov.a.b: //mov a,b
            interpreter.registry.a = interpreter.registry.b;
            break;
        case Instructions.mov.a.c: //mov a,c
            interpreter.registry.a = interpreter.registry.c;
            break;
        case Instructions.mov.a.d: //mov a,d
            interpreter.registry.a = interpreter.registry.d;
            break;
        case Instructions.mov.a.e: //mov a,e
            interpreter.registry.a = interpreter.registry.e;
            break;
        case Instructions.mov.a.h: //mov a,h
            interpreter.registry.a = interpreter.registry.h;
            break;
        case Instructions.mov.a.l: //mov a,l
            interpreter.registry.a = interpreter.registry.l;
            break;
        case Instructions.mov.a.m: //mov a,m
            interpreter.registry.a = interpreter.registry.m;
            break;
        //------MVI------
        case Instructions.mvi.b: //mvi b,d8
            interpreter.registry.b = interpreter.memory[++interpreter.programCounter];
            break;
        case Instructions.mvi.c: //mvi c,d8
            interpreter.registry.c = interpreter.memory[++interpreter.programCounter];
            break;
        case Instructions.mvi.d: //mvi d,d8
            interpreter.registry.d = interpreter.memory[++interpreter.programCounter];
            break;
        case Instructions.mvi.e: //mvi e,d8
            interpreter.registry.e = interpreter.memory[++interpreter.programCounter];
            break;
        case Instructions.mvi.h: //mvi h,d8
            interpreter.registry.h = interpreter.memory[++interpreter.programCounter];
            break;
        case Instructions.mvi.l: //mvi l,d8
            interpreter.registry.l = interpreter.memory[++interpreter.programCounter];
            break;
        case Instructions.mvi.m: //mvi m,d8
            interpreter.registry.m = interpreter.memory[++interpreter.programCounter];
            break;
        case Instructions.mvi.a: //mvi a,d8
            interpreter.registry.a = interpreter.memory[++interpreter.programCounter];
            break;
        //------ADD------
        case Instructions.add.b: //add b
            add(interpreter, 'b');
            break;
        case Instructions.add.c: //add c
            add(interpreter, 'c');
            break;
        case Instructions.add.d: //add d
            add(interpreter, 'd');
            break;
        case Instructions.add.e: //add e
            add(interpreter, 'e');
            break;
        case Instructions.add.h: //add h
            add(interpreter, 'h');
            break;
        case Instructions.add.l: //add l
            add(interpreter, 'l');
            break;
        case Instructions.add.m: //add m
            add(interpreter, 'm');
            break;
        case Instructions.add.a: //add a
            add(interpreter, 'a');
            break;
        //------ADC------
        case Instructions.adc.b: //adc b
            adc(interpreter, 'b');
            break;
        case Instructions.adc.c: //adc c
            adc(interpreter, 'c');
            break;
        case Instructions.adc.d: //adc d
            adc(interpreter, 'd');
            break;
        case Instructions.adc.e: //adc e
            adc(interpreter, 'e');
            break;
        case Instructions.adc.h: //adc h
            adc(interpreter, 'h');
            break;
        case Instructions.adc.l: //adc l
            adc(interpreter, 'l');
            break;
        case Instructions.adc.m: //adc m
            adc(interpreter, 'm');
            break;
        case Instructions.adc.a: //adc a
            adc(interpreter, 'a');
            break;
        //------ANA------
        case Instructions.ana.b: //ana b
            ana(interpreter, 'b');
            break;
        case Instructions.ana.c: //ana c
            ana(interpreter, 'c');
            break;
        case Instructions.ana.d: //ana d
            ana(interpreter, 'd');
            break;
        case Instructions.ana.e: //ana e
            ana(interpreter, 'e');
            break;
        case Instructions.ana.h: //ana h
            ana(interpreter, 'h');
            break;
        case Instructions.ana.l: //ana l
            ana(interpreter, 'l');
            break;
        case Instructions.ana.m: //ana m
            ana(interpreter, 'm');
            break;
        case Instructions.ana.a: //ana a
            ana(interpreter, 'a');
            break;
        default:
            throw Error("Unrecognized byte code");
    }
    interpreter.programCounter++;
    return interpreter;
}