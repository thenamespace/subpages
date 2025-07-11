export function getSubnamePrice(label: string, prices: any) {
    const { basePrice, labelPrices, specialPrices } = prices;

    // Helper functions
    const isEmojiOnly = (str: string) => {
        // Check if string is emoji only using a regex
        const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;
        return emojiRegex.test(str);
    };

    if (specialPrices) {
        const isNumberOnly = (str: string) => /^[0-9]+$/.test(str);

        // 1. Check special price rules
        if (isEmojiOnly(label) && specialPrices.emojiOnlyPrice !== undefined) {
            return specialPrices.emojiOnlyPrice;
        }

        if (isNumberOnly(label) && specialPrices.numberOnlyPrice !== undefined) {
            return specialPrices.numberOnlyPrice;
        }
    }

    if (labelPrices?.length) {
        // 2. Check by number of letters
        const length = label.length;
        for (const lp of labelPrices) {
            if (length === lp.numberOfLetters) {
                return lp.price;
            }
        }

    }

    // 3. Fallback to base price
    return basePrice;
}

export const isSubnameReserved = (label: string, reservedNames: {label: string, isMintable: boolean}[]) => {
  return reservedNames.some((reserved) => {
    // Check if the label is exactly the reserved name or a subname of it
    return reserved.label === label;
  });
}