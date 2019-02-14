import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { fuseAnimations } from '@fuse/animations';
import { IBlockcypherAddressBalance } from '@som32/interfaces'
import { WalletService } from '@app/services/wallet.service'
import { ApiService } from '@app/services/api.service'
import { SatoshiToBitcoin } from 'app/services/pipes';

@Component({
    selector   : 'wallet-trans',
    templateUrl: './trans.component.html',
    styleUrls  : ['./trans.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class TransactionComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>;
    private _satoshiToBitcoin: SatoshiToBitcoin;

    public blockcypherAddressBalance: IBlockcypherAddressBalance;
    public balancePie: any;
    public balancePieData: any;
    public txItems: any;

    pageType: string;
    productForm: FormGroup;

    constructor(
        private _apiService: ApiService,
        private _walletService: WalletService,
        private _formBuilder: FormBuilder,
        private _router: Router,
    ) {
        if(!('wallet' in sessionStorage)) {
            this._router.navigate(['/main/start']);
        }
        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this._satoshiToBitcoin = new SatoshiToBitcoin();

        this.productForm = this._formBuilder.group({
            id: ['']
        });
        this.blockcypherAddressBalance = {
            address             : "",
            total_received      : 0,
            total_sent          : 0,
            balance             : 0,
            unconfirmed_balance : 0,
            final_balance       : 0,
            n_tx                : 0,
            unconfirmed_n_tx    : 0,
            final_n_tx          : 0
        }
    }
    
    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this._apiService.getBalance(this.address).subscribe(
            _ => {
                this.blockcypherAddressBalance = this._apiService.entrusted;
            }, err => {
                console.log(err);
            }
        )
        this._apiService.getTxs(this.address).subscribe(
            _ => {
                this.txItems = this._apiService.entrusted;
            }, err => {
                console.log(err);
            }
        )
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    public get address(): string {
        return this._walletService.som32.address;
    }
}
