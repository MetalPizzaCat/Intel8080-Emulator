/** Dictionary that describes length of commands
 * 
 * no, this is not an array, numbers mean amount of arguments
*/
export const InstructionLengthInfo = {
    "mov": 2,
    "mvi": 2,
    "ana": 1,
    "ani": 1,
    "add": 1,
    "adc": 1,
    "sta": 1,
    "jmp": 1,
    "jnz": 1,
    "jz": 1,
    "jp": 1,
    "jm": 1,
    "jc": 1,
    "jnc": 1,
    "push": 1,
    "pop": 1,
    "call": 1,
    "ret": 0,
    "hlt": 0
}