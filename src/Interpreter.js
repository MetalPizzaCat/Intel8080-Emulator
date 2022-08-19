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
        this.program = [
            {
                operation: "mvi",
                arg1: "a",
                arg2: 3
            },
            {
                operation: "add",
                arg1: 4
            },
            {
                operation: "mov",
                arg1: "b",
                arg2: "a"
            },
            {
                operation: "mvi",
                arg1: "a",
                arg2: 0xFF
            },
            {
                operation: "ani",
                arg1: 0xF0,
            },
            {
                operation: "sta",
                arg1: 0x0800
            },
            {
                operation: "htl"
            }
        ];
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
        this.stackPointer = 944;
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
    let lines = text.split("\n").filter(token => token.length > 0);
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
        case "htl":
            console.info("Finished execution");
            break;
        default:
            console.error("Unknown operand " + interpreter.program[interpreter.programCounter].operation);
            break;
    }
    interpreter.programCounter++;
    console.log(operand.command);
    return interpreter;
}