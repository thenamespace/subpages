export const shortedString = (str: string, len:number) => {

    if (str && str.length <= len) {
        return str;
    }

    return str.substring(0,4) + "..." + str.substring(str.length - 4);
}