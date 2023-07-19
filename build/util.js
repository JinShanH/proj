"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GasHelper = void 0;
/**
 * Helper class to calculate adjusted gas value that is higher than estimate
 */
class GasHelper {
    /**
     * @param {string} gas Gas limit
     * @return {string} Adjusted gas limit
     */
    static gasPay(gasLimit) {
        return Math.ceil(Number(gasLimit) * GasHelper.gasMulptiplier).toString();
    }
}
exports.GasHelper = GasHelper;
GasHelper.gasMulptiplier = 1.25; // Increase by 25%
