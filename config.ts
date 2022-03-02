import { BigNumber } from "bignumber.js";


export default {


    TOKEN: {
        NAME: 'PLG Coin',
        SYMBOL: 'plg',
        INITIAL_SUPPLY: new BigNumber('0').shiftedBy(18).toString()
    },

    STAKING: {
        REWARD_PER_EPOCH: new BigNumber('100').shiftedBy(18).toString(),
        START_TIME: 100000,
        EPOCH_DERATION: 60 * 60 * 24,
    },

    bsc_testnet: {
        PLG_ADRESS: '0x458b678dbcb04C7cC8277621A8ea5cd278A984ea',
        STAKING_ADDRESS:'0xE09710f2b41081d461aCdeEc0208339adB8FCBb1'
    }
} as { [keys: string]: any }