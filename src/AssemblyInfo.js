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
    "cz": 1,
    "cp": 1,
    "cm": 1,
    "cc": 1,
    "cnc": 1,
    "cpe": 1,
    "cpo": 1,
    "lhld": 1,
    "shld": 1,
    "inr": 1,
    "dcr": 1,
    "sub": 1,
    "sbb": 1,
    "ora": 1,
    "cmp": 1,
    "cpi": 1,
    "sbi": 1,
    "sui": 1,
    "dcx": 1,
    "stax": 1,
    "stc": 0,
    "cma": 0,
    "cmc": 0,
    "ral": 0,
    "rar": 0,
    "rlc": 0,
    "rrc": 0,
    "xthl": 0,
    "pchl": 0,
    "ret": 0,
    "xchg": 0,
    "daa": 0,
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
    ral: 0x17,
    rar: 0x1f,
    rlc: 0x07,
    rrc: 0x0f,
    hlt: 0x76,
    ani: 0xe6,
    adi: 0xc6,
    aci: 0xce,
    jmp: 0xc3,
    ret: 0xc9,
    call: 0xcd,
    cz: 0xcc,
    cnz: 0xc4,
    cp: 0xf4,
    cm: 0xfc,
    cc: 0xdc,
    cnc: 0xd4,
    cpe: 0xce,
    cpo: 0xe4,
    cma: 0x2f,
    cmc: 0x3f,
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
    cpi: 0xfe,
    sbi: 0xde,
    stc: 0x37,
    sui: 0xd6,
    stax: {
        b: 0x02,
        d: 0x12
    },
    cmp: {
        b: 0xb8,
        c: 0xb9,
        d: 0xba,
        e: 0xbb,
        h: 0xbc,
        l: 0xbd,
        m: 0xbe,
        a: 0xbf,
    },
    dcx: {
        b: 0xb,
        d: 0x1b,
        h: 0x2b,
        sp: 0x3b
    },
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
        b: 0xc1,
        d: 0xd1,
        h: 0xf1
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
    },
    dcr: {
        b: 0x5,
        c: 0xd,
        d: 0x15,
        e: 0x1d,
        h: 0x25,
        l: 0x2d,
        m: 0x35,
        a: 0x3d,
    },
    inr: {
        b: 0x4,
        c: 0xc,
        d: 0x14,
        e: 0x1c,
        h: 0x24,
        l: 0x2c,
        m: 0x34,
        a: 0x3c,
    },
    ora: {
        b: 0xb0,
        c: 0xb1,
        d: 0xb2,
        e: 0xb3,
        h: 0xb4,
        l: 0xb5,
        m: 0xb6,
        a: 0xb7,
    },
    sub: {
        b: 0x90,
        c: 0x91,
        d: 0x92,
        e: 0x93,
        h: 0x94,
        l: 0x95,
        m: 0x96,
        a: 0x97,
    },
    sbb: {
        b: 0x98,
        c: 0x99,
        d: 0x9a,
        e: 0x9b,
        h: 0x9c,
        l: 0x9d,
        m: 0x9e,
        a: 0x9f,
    }
}