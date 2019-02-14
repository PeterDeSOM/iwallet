import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'
import { Router } from '@angular/router'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { FuseNavigationService } from '@fuse/components/navigation/navigation.service'
import { ApiService } from '@app/services/api.service'
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { Som32ConfigService } from '@som32/services'

@Component({
    selector   : 'wallet-header',
    templateUrl: './wallet.header.component.html',
    styleUrls  : ['./wallet.header.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class WalletHeaderComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>

    public som32Config: any
    public formAccount: FormGroup
    public formAccountSingle: FormGroup
    public accounts: any
    public accountAddress: string
    public selectedAddress: string
    public selectedAddressName: string
    public selectedAddressType: string
    public addressBalance: number

    constructor(
        private _router: Router,
        private _formBuilder: FormBuilder,
        private _fuseNavigationService: FuseNavigationService,
        private _som32ConfigService: Som32ConfigService,
        private _walletService: WalletService,
        private _apiService: ApiService,
    ) {
        this.accounts = []
        this.accountAddress = ''
        this.selectedAddress = ''
        this.selectedAddressName = ''
        this.selectedAddressType = ''

        if(C.SESSION_PATH_WALLET_PREVBAL in sessionStorage) {
            this.addressBalance = Number(sessionStorage.getItem(C.SESSION_PATH_WALLET_PREVBAL))
        } else this.addressBalance = 0

        // Set the private defaults
        this._unsubscribeAll = new Subject();
    }

    ngOnInit(): void {
        this.formAccount = this._formBuilder.group({
            fakefield: [''],
            addresses: [''],
        })
        this.formAccountSingle = this._formBuilder.group({
            fakefield: [''],
            addresses: [''],
        })

        // Subscribe to the config changes
        this._som32ConfigService.config
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config) => {
                this.som32Config = config;
                this.setAccountList()
            })

        // Subscribe to the specific form value changes (layout.style)
        this.formAccount.get('addresses').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(address => {
                let wallet = this._walletService.som32.export('all')
                let account = this.accounts.find(a => a.opened == address)
        
                wallet.account.opened = account.opened
                wallet.account.type = account.type

                this.som32Config.account.opened = account.opened
                this.som32Config.account.type = account.type
                this.som32Config.navigation.id = account.type == C.ACCOUNT_TYPE_SHARED ? (
                    this.som32Config.psbt.useof == C.APP_PSBT_USEOF_ONLINE ? C.NAVIGATION_ID_PSBTSOM32 : C.NAVIGATION_ID_SHARED
                ) : C.NAVIGATION_ID_SINGLE
                this._fuseNavigationService.setCurrentNavigation(this.som32Config.navigation.id)
                this._som32ConfigService.config = this.som32Config
                this._walletService.som32.import(wallet)

                sessionStorage.setItem(C.SESSION_PATH_WALLET, JSON.stringify(wallet))

                // initializing current wallet with session value 'wallet' newly applied
                this._walletService.initialize()

                if(this._router.url == C.ROUTE_PATH_WALLET_HOME) this._router.navigate([C.ROUTE_PATH_WALLET_HOME + '?reload=1'])
                else this._router.navigate([C.ROUTE_PATH_WALLET_HOME])
            })

        this.setAccountList()
    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next()
        this._unsubscribeAll.complete()
    }

    public get accountName(): string {
        return this._walletService.som32.getname(this.accountAddress)
    }

    public setAccountList() {
        // Set the defaults
        if(this.selectedAddress != this._walletService.som32.address) {
            this.accounts = this._walletService.som32.getaccountall()
            this.accountAddress = this.accounts.find(a => a.type == C.ACCOUNT_TYPE_SINGLE).opened
            this.selectedAddress = this._walletService.som32.address
            this.selectedAddressName = this.accounts.find(a => a.opened == this.selectedAddress).name
            this.selectedAddressType = this.accounts.find(a => a.opened == this.selectedAddress).type
            this.formAccount.get('addresses').setValue(this.selectedAddress, {emitEvent: false})
            this.setBalance()
        }
    }

    public setBalance() {
        this._apiService.getBalance(this._walletService.som32.address).subscribe(
            _ => {
                this.addressBalance = this._apiService.entrusted.balance
                sessionStorage.setItem(C.SESSION_PATH_WALLET_PREVBAL, String(this.addressBalance))
            }, err => {
                console.log(err);
            }
        )
    }
}