import { BigNumber } from "bignumber.js";


export default {


    TOKEN: {
        NAME: 'PLG Token',
        SYMBOL: 'PLG',
        INITIAL_SUPPLY: '1000000000000000000000000000'  // 1 000 000 000
    },

    STAKING: {
        REWARD_PER_EPOCH: '10000000000000000000000',    //10 000
        START_TIME: '1646910391',
        EPOCH_DURATION: '2592000',
    },

    bsc_testnet: {
        PLG_ADRESS: '0x458b678dbcb04C7cC8277621A8ea5cd278A984ea',
        STAKING_ADDRESS:'0x16F6DEFe4d2FCAe9e90176ff8Da177d668b7797e'
    },

    bsc: {
        PLG_ADRESS: '0x27D195F3fF4DC2142328BA1DE6715Ac10a7Ed290',
        STAKING_ADDRESS:'0x356a6e182Dd2c80eA219d6C80ad5a1212F715334'
    }



} as { [keys: string]: any }