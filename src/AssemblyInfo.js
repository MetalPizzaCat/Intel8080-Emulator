/** Dictionary that describes length of commands
 * 
 * no, this is not an array, numbers mean amount of arguments
*/
export const InstructionLengthInfo = {
    "mov": 2,
    "mvi": 2,
    "lxi": 2,
    "ana": 1,
    "ani": 1,
    "adi": 1,
    "aci": 1,
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
    "lda": 1,
    "pop": 1,
    "call": 1,
    "lhld": 1,
    "shld" : 1,
    "xthl": 0,
    "pchl": 0,
    "ret": 0,
    "xchg": 0,
    "hlt": 0
}

/**List of instructions that take label as input rather then number or register */
export const JumpInstructions = [
    "jmp", "jz", "jnz", "jp", "jm", "jc", "jnc", "jpe", "jpo", "call", "cz", "cp", "cm", "cc", "cnc", "cpe", "cpo"
]

/**Dictionary of all op codes for instructions available 
 * It's accessible by "name.register.register"
*/
export const Instructions = {
    hlt: 0x76,
    ani: 0xe6,
    adi: 0xc6,
    aci: 0xce,
    jmp: 0xc3,
    ret: 0xc9,
    call: 0xcd,
    lda: 0x3a,
    sta: 0x32,
    jz: 0xca,
    jnz: 0xc2,
    jp: 0xf2,
    jm: 0xfa,
    jc: 0xda,
    jnc: 0xd2,
    jpe: 0xea,
    jpo: 0xe2,
    xchg: 0x3b,
    xthl: 0xe3,
    pchl: 0xe9,
    shld: 0x22,
    lxi: {
        b: 0x01,
        d: 0x11,
        h: 0x21,
        sp: 0x31
    },
    ldax: {
        b: 0x0a,
        d: 0x1a
    },
    lhld: 0x2a,
    push: {
        b: 0xc5,
        d: 0xd5,
        h: 0xf5
    },
    pop: {
        b: 0xc5,
        d: 0xd5,
        h: 0xf5
    },
    mov: {
        b: {
            b: 0x40,
            c: 0x41,
            d: 0x42,
            e: 0x43,
            h: 0x44,
            l: 0x45,
            m: 0x46,
            a: 0x47,
        },
        c: {
            b: 0x48,
            c: 0x49,
            d: 0x4a,
            e: 0x4b,
            h: 0x4c,
            l: 0x4d,
            m: 0x4e,
            a: 0x4f,
        },
        d: {
            b: 0x50,
            c: 0x51,
            d: 0x52,
            e: 0x53,
            h: 0x54,
            l: 0x55,
            m: 0x56,
            a: 0x57,
        },
        e: {
            b: 0x58,
            c: 0x59,
            d: 0x5a,
            e: 0x5b,
            h: 0x5c,
            l: 0x5d,
            m: 0x5e,
            a: 0x5f,
        },
        h: {
            b: 0x60,
            c: 0x61,
            d: 0x62,
            e: 0x63,
            h: 0x64,
            l: 0x65,
            m: 0x66,
            a: 0x67,
        },
        l: {
            b: 0x68,
            c: 0x69,
            d: 0x6a,
            e: 0x6b,
            h: 0x6c,
            l: 0x6d,
            m: 0x6e,
            a: 0x6f,
        },
        m: {
            b: 0x70,
            c: 0x71,
            d: 0x72,
            e: 0x73,
            h: 0x74,
            l: 0x75,
            m: 0x76,
            a: 0x77,
        },
        a: {
            b: 0x78,
            c: 0x79,
            d: 0x7a,
            e: 0x7b,
            h: 0x7c,
            l: 0x7d,
            m: 0x7e,
            a: 0x7f,
        }
    },
    mvi: {
        b: 0x6,
        c: 0xe,
        d: 0x16,
        e: 0x1e,
        h: 0x26,
        l: 0x2e,
        m: 0x36,
        a: 0x3e,
    },
    add: {
        b: 0x80,
        c: 0x81,
        d: 0x82,
        e: 0x83,
        h: 0x84,
        l: 0x85,
        m: 0x86,
        a: 0x87,
    },
    adc: {
        b: 0x88,
        c: 0x89,
        d: 0x8a,
        e: 0x8b,
        h: 0x8c,
        l: 0x8d,
        m: 0x8e,
        a: 0x8f,
    },
    ana: {
        b: 0xa0,
        c: 0xa1,
        d: 0xa2,
        e: 0xa3,
        h: 0xa4,
        l: 0xa5,
        m: 0xa6,
        a: 0xa7,
    }
}