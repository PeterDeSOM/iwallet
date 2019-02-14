export const som32Config = {
    navigation: {
        id: 'single',
    },
    account: {
        opened  : '',
        type    : 'single',
    },
    psbt: {
        useof: 'offline',
    },
    values : {
        navigation: {
            id: ['single', 'shared', 'psbtsom32'],
        },
        account: {
            type: ['single', 'shared'],
        },
        psbt: {
            useof: ['online', 'offline'],
        },
    }
}
