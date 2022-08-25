/**Convert number to a byte array that is stored in the i8080 compatible way
* Right pair of the number first
*/
export function convertNumberToBytes(number) {
    if (number > 0xff) {
        return [number & 0x00FF, (number & 0xFF00) >> 8]
    }
    return [number];
}

/**Convert two bytes of 8bit numbers back into 16bit number */
export function convertBytesToNumber(bytes) {
    return (bytes[0] << 8) + bytes[1];
}