import { InstructionLengthInfo, Instructions, JumpInstructions } from "./AssemblyInfo";
import { convertNumberToBytes } from './Helpers';

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
        let byte = Instructions[tokens[0]][tokens[1]][tokens[2]];
        if (byte === undefined) {
            throw Error("Operation has invalid arguments")
        }
        return [byte];
    }
    if (value1IsAName) {
        let byte = Instructions[tokens[0]][tokens[1]];
        if (byte === undefined) {
            throw Error("Operation has invalid arguments")
        }
        return tokens[2] === undefined ?
            [Instructions[tokens[0]][tokens[1]]].flat() :
            [Instructions[tokens[0]][tokens[1]], convertNumberToBytes(value2)].flat();
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