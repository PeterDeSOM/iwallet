import { FuseNavigation } from '@fuse/types';

const single: FuseNavigation[] = [
    {
        id       : 'single',
        title    : 'Som32-HD-Wallet',
        translate: '',
        type     : 'group',
        icon     : 'apps',
        children : [
            {
                id       : 'accountinfo',
                title    : 'Account Info',
                translate: '',
                type     : 'item',
                icon     : 'account_balance_wallet',
                url      : '/wallet/home'
            }, {
                id       : 'transactions',
                title    : 'Transactions',
                translate: '',
                type     : 'item',
                icon     : 'swap_horiz',
                url      : '/wallet/trans'
            }, {
                id       : 'send',
                title    : 'Send Coin',
                translate: '',
                type     : 'item',
                icon     : 'publish',
                url      : '/wallet/send'
            }
        ]
    }
];

const shared: FuseNavigation[] = [
    {
        id       : 'shared',
        title    : 'Som32-HD-Wallet',
        translate: '',
        type     : 'group',
        icon     : 'apps',
        children : [
            {
                id       : 'accountinfo',
                title    : 'Account Info',
                translate: '',
                type     : 'item',
                icon     : 'account_balance_wallet',
                url      : '/wallet/home'
            }, {
                id       : 'transactions',
                title    : 'Transactions',
                translate: '',
                type     : 'item',
                icon     : 'swap_horiz',
                url      : '/wallet/trans'
            }, {
                id       : 'psbt',
                title    : 'Partially Signed Tx',
                translate: '',
                type     : 'collapsable',
                icon     : 'recent_actors',
                children : [
                    {
                        id   : 'create',
                        title: 'Create',
                        type : 'item',
                        url      : '/wallet/psbt/create',
                    },
                    {
                        id   : 'combine',
                        title: 'Sign',
                        type : 'item',
                        url      : '/wallet/psbt/sign',
                    },
                    {
                        id   : 'combine',
                        title: 'Combine',
                        type : 'item',
                        url      : '/wallet/psbt/combine',
                    },
                    {
                        id   : 'push',
                        title: 'Push & Pay',
                        type : 'item',
                        url      : '/wallet/psbt/push',
                    },
                ]
            }
        ]
    }
];

const psbtsom32: FuseNavigation[] = [
    {
        id       : 'psbtsom32',
        title    : 'Som32-HD-Wallet',
        translate: '',
        type     : 'group',
        icon     : 'apps',
        children : [
            {
                id       : 'accountinfo',
                title    : 'Account Info',
                translate: '',
                type     : 'item',
                icon     : 'account_balance_wallet',
                url      : '/wallet/home'
            }, {
                id       : 'transactions',
                title    : 'Transactions',
                translate: '',
                type     : 'item',
                icon     : 'swap_horiz',
                url      : '/wallet/trans'
            }, {
                id       : 'psbt',
                title    : 'Partially Signed Tx',
                translate: '',
                type     : 'item',
                icon     : 'recent_actors',
                url      : '/wallet/psbt/som32'
            }
        ]
    }
];

export const Navigation = {
    single: single,
    shared: shared,
    psbtsom32: psbtsom32,
}

