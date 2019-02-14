import { Component, ElementRef, OnDestroy, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { fuseAnimations } from '@fuse/animations';
import { ApiService } from '@app/services/api.service'
import { BitcoinToSatoshi, SatoshiToBitcoin } from '@app/services/pipes';
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { AmountValidator } from '@som32/validators'
import { 
    IBlockchainInfoUnspent, 
    IBitcoinfeesTypes, 
    ISom32Balance, ISOM32TxFormToSend, ISOM32RawTxToSend 
} from '@som32/interfaces'
import { 
    Alert, AlertError, AlertInvalidPassword, 
    DialogPassphraseService 
} from '@som32/services'

@Component({
    selector   : 'wallet-send',
    templateUrl: './send.component.html',
    styleUrls  : ['./send.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class SendComponent implements OnInit, OnDestroy {

    @ViewChild('confirmamount') InputCAmount: ElementRef

    private _unsubscribeAll: Subject<any>;
    private _stepper: MatStepper;
    private _bitcoinToSatoshi: BitcoinToSatoshi
    private _satoshiToBitcoin: SatoshiToBitcoin
    private _txholder: {
        s: string
        u: IBlockchainInfoUnspent[]
    }

    public txfees: IBitcoinfeesTypes;
    public currentBalance: ISom32Balance
    public formTransactionInfo: FormGroup;
    public formConfirmation: FormGroup;
    public formFinished: FormGroup;
    public isShared: boolean;
    public isEditable: boolean;
    public txtotalfee: number;
    public sum: number;
    public notEnoughBalance: boolean


    constructor(
        private _apiService: ApiService,
        private _alert: Alert,
        private _dialogPassphraseService: DialogPassphraseService,
        private _walletService: WalletService,
        private _formBuilder: FormBuilder,
        private _router: Router,
    ) {
        if(!(C.SESSION_PATH_WALLET in sessionStorage)) {
            this._router.navigate([C.ROUTE_PATH_MAIN_START]);
        }

        // Set the private defaults
        this._unsubscribeAll = new Subject();
        this._bitcoinToSatoshi = new BitcoinToSatoshi()
        this._satoshiToBitcoin= new SatoshiToBitcoin()

        this.txfees = {
            fastestFee  : 0,
            halfHourFee : 0,
            hourFee     : 0
        }
        this.isShared = false;
    }
    

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.formTransactionInfo = this._formBuilder.group({
            fakefield   : [''],
            to          : ['', [
                Validators.required, 
                Validators.minLength(32), 
                Validators.pattern(/^[a-zA-Z0-9]+$/), 
                this._walletService.addressValidator,
            ]],
            amount      : [, [
                Validators.required, 
                Validators.pattern(/^[+]?([0-9]+(?:[\.][0-9]*)?|\.[0-9]+)$/),
                AmountValidator,
            ]],
            curbalance  : [,],
            description : ['']
        });
        this.formConfirmation = this._formBuilder.group({
            fakefield   : [''],
            amount      : [, [Validators.required, AmountValidator]],
            curbalance  : [,],
            confirmed   : [false],
            confirm     : ['', Validators.required],
            verified    : ['', Validators.required],
        })
        this.formFinished = this._formBuilder.group({
            fakefield   : [''],
            sent        : ['', Validators.required]
        })
        this.formTransactionInfo.get('curbalance').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(n => {
                if(n != this.currentBalance.balance) {
                    this.formTransactionInfo.get('curbalance').setValue(
                        this.currentBalance.balance, 
                        {emitEvent: false}
                    )
                }
            })
        this.formConfirmation.get('amount').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(n => {
                let amount = (
                    Number(this.formTransactionInfo.get('amount').value) + 
                    this._satoshiToBitcoin.transform(this.txtotalfee)
                ).toFixed(8)
                if(Number(n) != Number(amount)) this.formConfirmation.get('amount').setValue(amount, {emitEvent: false})
            })
        this.formConfirmation.get('curbalance').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(n => {
                if(n != this.currentBalance.balance) {
                    this.formConfirmation.get('curbalance').setValue(
                        this.currentBalance.balance, 
                        {emitEvent: false}
                    )
                }
            })
        this.isEditable = true;
        this.txtotalfee = 0
        this.sum = 0

        this._apiService.getBalance(this.address).subscribe(
            _ => {
                this.currentBalance = this._apiService.entrusted
                this.formTransactionInfo.get('curbalance').setValue(this.currentBalance.balance, {emitEvent: false})
                this.formConfirmation.get('curbalance').setValue(this.currentBalance.balance, {emitEvent: false})
            }, err => {
                this._alert.pop({
                    title   : 'Failed request',
                    msg     : 'Failed to get current balance.',
                    desc    : err,
                    button  : ['OK']
                })
            }
        )
        this.isShared = this._walletService.isshared()
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    private _getInput(): ISOM32TxFormToSend {
        let input = {
            to          : this.formTransactionInfo.get('to').value,
            amount      : this._bitcoinToSatoshi.transform(this.formTransactionInfo.get('amount').value),
            fee         : this.txfees.fastestFee,
            description : this.formTransactionInfo.get('description').value
        }
        return input

    }
    private _getrawtx(unspents: IBlockchainInfoUnspent[], password?: string): ISOM32RawTxToSend {
        return this._walletService.buildRawTx(this._getInput(), unspents, password)
    }

    public get address(): string {
        return this._walletService.som32.address;
    }
    
    public stepIn(stepper: MatStepper): void {
        stepper.next();
        this._stepper = stepper
        this.isEditable = !this.isEditable;

        if(stepper.selectedIndex == 1) {
            setTimeout(() => {
                this.InputCAmount.nativeElement.focus()
                this.InputCAmount.nativeElement.blur()
            }, 100);
        }
    }

    public stepReset(stepper: MatStepper): void {
        this.isEditable = true;
        stepper.reset();
    }

    public verifyReq(stepper: MatStepper) {
        let execute: Function = (unspents: IBlockchainInfoUnspent[], password: string) => {
            this._txholder = { s: password, u: unspents }

            let rawtx = this._getrawtx(unspents, password)
            this.txtotalfee = rawtx.totalfee
            this.sum = (
                this._bitcoinToSatoshi.transform(this.formTransactionInfo.get('amount').value) +
                rawtx.totalfee
            )
            this.formConfirmation.get('amount').setValue(
                Number(this.formTransactionInfo.get('amount').value) + 
                this._satoshiToBitcoin.transform(this.txtotalfee)
            )

            let amount = this._bitcoinToSatoshi.transform(this.formTransactionInfo.get('amount').value) + this.txtotalfee
            if(this.currentBalance.balance >= amount) {
                this.notEnoughBalance = false
                this.formConfirmation.get('verified').setValue('true')
            } else {
                this.notEnoughBalance = true
                this.formConfirmation.get('verified').setValue('')
            }
            this.stepIn(stepper)
        }
        this._apiService.getTxFees().subscribe(res => {
            this.txfees = res
            this._apiService.getUnspents(this.address).subscribe(() => {
                let unspents = <IBlockchainInfoUnspent[]>this._apiService.entrusted
                if(C.SESSION_PATH_SALT in sessionStorage) {
                    execute(unspents, sessionStorage.getItem(C.SESSION_PATH_SALT))
                } else {
                    this._dialogPassphraseService.pop(
                        { 
                            title   : 'Password Verification',
                            msg     : '', 
                            wallet  : this._walletService.som32.export('all') 
                        }, 
                        (verified, password) => { if(verified) execute(unspents, password) }
                    )
                }
            }, err => {
                this._alert.pop(AlertError('Fail to get unspents.', err))
            })}
        )
    }

    public confirm() {
        let checked: boolean = this.formConfirmation.get('confirmed').value
        if(checked) this.formConfirmation.get('confirm').setValue('')
        else this.formConfirmation.get('confirm').setValue('true')
    }

    public send() {
        this._apiService.pushTx(this._getrawtx(this._txholder.u, this._txholder.s).hex).subscribe(
            _ => {
                let res = this._apiService.entrusted
                if(res.success) {
                    let txid = res.txid
                    this.stepIn(this._stepper)
                } else {
                    this._alert.pop(AlertError('Fail to push transaction.', ''))
                }
            }, err => {
                this._alert.pop(AlertError('Fail to push transaction.', err))
            }
        )
        this._txholder = null
    }
}
