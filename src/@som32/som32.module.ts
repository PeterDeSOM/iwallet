import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { SOM32_CONFIG } from '@som32/services';

@NgModule()
export class Som32Module {

    constructor(@Optional() @SkipSelf() parentModule: Som32Module) {
        if ( parentModule )
        {
            throw new Error('Som32Module is already loaded. Import it in the AppModule only!');
        }
    }

    static forRoot(config): ModuleWithProviders {
        /*
         * re-build som32 default configuration based by SOM32_CONFIG.
         * it's not the current configuration.
         */
        // Get wallet's initial value
        if('wallet' in sessionStorage) {
            let wallet = JSON.parse(sessionStorage.getItem('wallet'))
            config.account.opened = wallet.account.opened
            config.account.type = wallet.account.type
        }
        // Get config's changed value
        if('config.psbt.useof' in sessionStorage) config.psbt.useof = sessionStorage.getItem('config.psbt.useof')
        if(config.account.type == 'shared') {
            if(config.psbt.useof == 'online') config.navigation.id = 'psbtsom32'
            else config.navigation.id = 'shared'
        } else {
            config.navigation.id = 'single'
        }

        return {
            ngModule : Som32Module,
            providers: [
                {
                    provide : SOM32_CONFIG,
                    useValue: config
                }
            ]
        }
    }
}
