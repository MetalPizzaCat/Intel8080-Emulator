/**
 * This is file that contains interpreter logic itself, detached from React.js implementation
 * However the reason why functions are extracted and called with interpreter as argument is to make it easier to use with React's states
 */

import { Instructions } from "./AssemblyInfo";
import { convertNumberToBytes, convertBytesToNumber } from './Helpers';

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

function add(interpreter, value) {
    let result = interpreter.registry.a + interpreter.registry[value];
    interpreter.flags = checkFlags(result);
    interpreter.registry.a = result & 0xff;//trim bits that would not physically fit in the cell in the actual processor
}

function sub(interpreter, value) {
    let result = interpreter.registry.a - interpreter.registry[value];
    interpreter.flags = checkFlags(result);
    interpreter.registry.a = result & 0xff;//trim bits that would not physically fit in the cell in the actual processor
}

function sbb(interpreter, value) {
    let result = interpreter.registry.a - interpreter.registry[value] - (interpreter.flags.c ? 1 : 0);
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

function dcr(interpreter, name) {
    interpreter.registry[name]--;
    interpreter.registry[name] &= 0xFF;//to clean bits that don't fit in the memory cell
}

function inr(interpreter, name) {
    interpreter.registry[name]++;
    interpreter.registry[name] &= 0xFF;//to clean bits that don't fit in the memory cell
}

function ora(interpreter, value) {
    let result = interpreter.registry.a | interpreter.registry[value];
    let flags = checkFlags(result);
    //Carry bit must be reset according to documentation
    flags.c = false;
    interpreter.registry.a = result;
    interpreter.flags = flags;
}


/**Reads next 16bites of data */
function readWord(interpreter) {
    return [
        interpreter.memory[++interpreter.programCounter],
        interpreter.memory[++interpreter.programCounter]
    ].reverse();
}

function readWordFromStack(interpreter) {
    return [
        interpreter.memory[++interpreter.stackPointer],
        interpreter.memory[++interpreter.stackPointer]
    ];
}

function writeToStack(interpreter, bytes) {
    interpreter.memory[interpreter.stackPointer--] = bytes[0];
    interpreter.memory[interpreter.stackPointer--] = bytes[1];
}

function call(interpreter) {
    //read address of the current operation and save it with offset(because that's where in memory next operation should be)
    let savedAddress = convertNumberToBytes(interpreter.programCounter + 0x800 + 3);
    writeToStack(interpreter, savedAddress);
    interpreter.programCounter = convertBytesToNumber(readWord(interpreter)) - 0x800 - 1;
}

function jump(interpreter) {
    interpreter.programCounter = convertBytesToNumber(readWord(interpreter)) - 0x800 - 1;
}

function cmp(interpreter, name) {
    let value = interpreter.registry[name];
    let result = interpreter.registry.a - value;
    interpreter.flags.z = result === 0;
    interpreter.flags.s = (0x80 === (result & 0x80));
    interpreter.flags.p = parity(result, 8);
    interpreter.flags.c = interpreter.registry.a < value;
}

function cpi(interpreter, value) {
    let result = interpreter.registry.a - value;
    interpreter.flags.z = result === 0;
    interpreter.flags.s = (0x80 === (result & 0x80));
    interpreter.flags.p = parity(result, 8);
    interpreter.flags.c = interpreter.registry.a < value;
}

export function executionStep(interpreter) {
    let opByte = interpreter.memory[interpreter.programCounter];
    switch (opByte) {
        //i generated them via c# script :P
        case Instructions.hlt: case 118:
            interpreter.finishedExecution = true;
            break;
        case Instructions.cma:
            interpreter.registry.a = ~interpreter.registry.a;
            break;
        case Instructions.cmc:
            interpreter.flags.c = !interpreter.flags.c;
            break;
        case Instructions.ral:
            {
                let temp = interpreter.registry.a;
                let msb = interpreter.registry.a >> 7;
                interpreter.registry.a = ((temp << 1) | (interpreter.flags.c)) & 0xff;
                interpreter.flags.c = msb;
            }
            break;
        case Instructions.rar:
            {
                let temp = interpreter.registry.a;
                let msb = (interpreter.registry.a >> 7) << 7;
                interpreter.registry.a = ((temp >> 1) | (msb)) & 0xff;
                interpreter.flags.c = (temp << 7) >> 7;
            }
            break;
        case Instructions.rlc:
            {
                let temp = interpreter.registry.a;
                interpreter.registry.a = ((temp << 1) | (temp >> 7)) & 0xff;;
                interpreter.flags.c = (temp >> 7) > 0;
            }
            break;
        case Instructions.rrc:
            {
                let temp = interpreter.registry.a;
                interpreter.registry.a = ((temp >> 1) | (temp << 7)) & 0xff;
                interpreter.flags.c = (interpreter.registry.a >> 7) > 0;
            }
            break;
        case Instructions.ani:
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
                let data = readWord(interpreter);
                interpreter.registry.b = data[0];
                interpreter.registry.c = data[1];
            }
            break;
        case Instructions.lxi.d:
            {
                let data = readWord(interpreter);
                interpreter.registry.d = data[0];
                interpreter.registry.e = data[1];
            }
            break;
        case Instructions.lxi.h:
            {
                let data = readWord(interpreter);
                interpreter.registry.h = data[0];
                interpreter.registry.l = data[1];
            }
            break;
        case Instructions.lxi.sp:
            {
                let data = readWord(interpreter);
                let address = convertBytesToNumber(data);
                interpreter.stackPointer = address - 0x800;
            }
            break;
        case Instructions.lhld:
            {
                let address = convertBytesToNumber(readWord(interpreter)) - 0x800;
                interpreter.registry.h = interpreter.memory[address + 1];
                interpreter.registry.l = interpreter.memory[address];
            }
            break;
        case Instructions.shld:
            {
                let address = convertBytesToNumber(readWord(interpreter)) - 0x800;
                interpreter.memory[address + 1] = interpreter.registry.h;
                interpreter.memory[address] = interpreter.registry.l;
            }
            break;
        case Instructions.xchg:
            [interpreter.registry.h, interpreter.registry.d] = [interpreter.registry.d, interpreter.registry.h];
            [interpreter.registry.l, interpreter.registry.e] = [interpreter.registry.e, interpreter.registry.l];
            break;
        case Instructions.sta:
            interpreter.memory[convertBytesToNumber(readWord(interpreter)) - 0x800] = interpreter.registry.a;
            break;
        case Instructions.lda:
            interpreter.registry.a = interpreter.memory[convertBytesToNumber(readWord(interpreter)) - 0x800]
            break;
        case Instructions.jmp:
            jump(interpreter);
            break;
        case Instructions.jz:
            if (interpreter.flags.z === false) {
                jump(interpreter);
            }
            break;
        case Instructions.jnz:
            if (interpreter.flags.z !== false) {
                jump(interpreter);
            }
            break;
        case Instructions.jp:
            if (interpreter.flags.s === false) {
                jump(interpreter);
            }
            break;
        case Instructions.jm:
            if (interpreter.flags.s !== false) {
                jump(interpreter);
            }
            break;
        case Instructions.jc:
            if (interpreter.flags.c !== false) {
                jump(interpreter);
            }
            break;
        case Instructions.jnc:
            if (interpreter.flags.c === false) {
                jump(interpreter);
            }
            break;
        case Instructions.jpe:
            if (interpreter.flags.p !== false) {
                jump(interpreter);
            }
            break;
        case Instructions.jpo:
            if (interpreter.flags.p === false) {
                jump(interpreter);
            }
            break;
        case Instructions.call:
            call(interpreter);
            break;
        case Instructions.cz:
            if (interpreter.flags.z === false) {
                call(interpreter);
            }
            break;
        case Instructions.cnz:
            if (interpreter.flags.z !== false) {
                call(interpreter);
            }
            break;
        case Instructions.cp:
            if (interpreter.flags.s === false) {
                call(interpreter);
            }
            break;
        case Instructions.cm:
            if (interpreter.flags.s !== false) {
                call(interpreter);
            }
            break;
        case Instructions.cc:
            if (interpreter.flags.c !== false) {
                call(interpreter);
            }
            break;
        case Instructions.cnc:
            if (interpreter.flags.c === false) {
                call(interpreter);
            }
            break;
        case Instructions.cpe:
            if (interpreter.flags.p !== false) {
                call(interpreter);
            }
            break;
        case Instructions.cpo:
            if (interpreter.flags.p === false) {
                call(interpreter);
            }
            break;
        case Instructions.ret:
            interpreter.programCounter = convertBytesToNumber(readWordFromStack(interpreter)) - 0x800 - 1;
            break;
        case Instructions.cpi:
            cpi(interpreter, interpreter.memory[++interpreter.programCounter]);
            break;
        //------CMP------
        case Instructions.cmp.b:
            cmp(interpreter, 'b');
            break;
        case Instructions.cmp.c:
            cmp(interpreter, 'c');
            break;
        case Instructions.cmp.d:
            cmp(interpreter, 'd');
            break;
        case Instructions.cmp.e:
            cmp(interpreter, 'e');
            break;
        case Instructions.cmp.h:
            cmp(interpreter, 'h');
            break;
        case Instructions.cmp.l:
            cmp(interpreter, 'l');
            break;
        case Instructions.cmp.m:
            cmp(interpreter, 'm');
            break;
        case Instructions.cmp.a:
            cmp(interpreter, 'a');
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
        //------DCR------
        case Instructions.dcr.b: dcr(interpreter, 'b');
            break;
        case Instructions.dcr.c: dcr(interpreter, 'c');
            break;
        case Instructions.dcr.d: dcr(interpreter, 'd');
            break;
        case Instructions.dcr.e: dcr(interpreter, 'e');
            break;
        case Instructions.dcr.h: dcr(interpreter, 'h');
            break;
        case Instructions.dcr.l: dcr(interpreter, 'l');
            break;
        case Instructions.dcr.m: dcr(interpreter, 'm');
            break;
        case Instructions.dcr.a: dcr(interpreter, 'a');
            break;
        //------INR------
        case Instructions.inr.b: inr(interpreter, 'b');
            break;
        case Instructions.inr.c: inr(interpreter, 'c');
            break;
        case Instructions.inr.d: inr(interpreter, 'd');
            break;
        case Instructions.inr.e: inr(interpreter, 'e');
            break;
        case Instructions.inr.h: inr(interpreter, 'h');
            break;
        case Instructions.inr.l: inr(interpreter, 'l');
            break;
        case Instructions.inr.m: inr(interpreter, 'm');
            break;
        case Instructions.inr.a: inr(interpreter, 'a');
            break;
        //------ORA------
        case Instructions.ora.b: ora(interpreter, 'b');
            break;
        case Instructions.ora.c: ora(interpreter, 'c');
            break;
        case Instructions.ora.d: ora(interpreter, 'd');
            break;
        case Instructions.ora.e: ora(interpreter, 'e');
            break;
        case Instructions.ora.h: ora(interpreter, 'h');
            break;
        case Instructions.ora.l: ora(interpreter, 'l');
            break;
        case Instructions.ora.m: ora(interpreter, 'm');
            break;
        case Instructions.ora.a: ora(interpreter, 'a');
            break;
        //------SUB------
        case Instructions.sub.b: sub(interpreter, 'b');
            break;
        case Instructions.sub.c: sub(interpreter, 'c');
            break;
        case Instructions.sub.d: sub(interpreter, 'd');
            break;
        case Instructions.sub.e: sub(interpreter, 'e');
            break;
        case Instructions.sub.h: sub(interpreter, 'h');
            break;
        case Instructions.sub.l: sub(interpreter, 'l');
            break;
        case Instructions.sub.m: sub(interpreter, 'm');
            break;
        case Instructions.sub.a: sub(interpreter, 'a');
            break;
        //------SBB------
        case Instructions.sbb.b: sbb(interpreter, 'b');
            break;
        case Instructions.sbb.c: sbb(interpreter, 'c');
            break;
        case Instructions.sbb.d: sbb(interpreter, 'd');
            break;
        case Instructions.sbb.e: sbb(interpreter, 'e');
            break;
        case Instructions.sbb.h: sbb(interpreter, 'h');
            break;
        case Instructions.sbb.l: sbb(interpreter, 'l');
            break;
        case Instructions.sbb.m: sbb(interpreter, 'm');
            break;
        case Instructions.sbb.a: sbb(interpreter, 'a');
            break;
        default:
            throw Error("Unrecognized byte code");
    }
    interpreter.programCounter++;
    return interpreter;
}