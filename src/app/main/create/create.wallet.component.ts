import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core'
import { AbstractControl, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms'
import { MatDialog, MatStepper } from '@angular/material'
import { Router } from '@angular/router'
import { MatPasswordStrengthComponent } from '@angular-material-extensions/password-strength'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'
import { FuseConfigService } from '@fuse/services/config.service'
import { FuseNavigationService } from '@fuse/components/navigation/navigation.service';
import { fuseAnimations } from '@fuse/animations'
import { WalletService } from '@app/services/wallet.service'
import { C } from '@som32/globals'
import { PasswordValidator, PasswordConfirmValidator, PublicKeyValidator } from '@som32/validators'
import { ISom32Extenal } from '@som32/interfaces'
import { Alert, AlertFileNotFound, AlertInvalidFileCode, AlertNotMatchedNetwork, DialogQRCodeScannerService, Som32ConfigService } from '@som32/services';
import * as Dateformat from 'dateformat'
import * as FileSaver from 'file-saver'
import * as Lodash from 'lodash';

@Component({
    selector        : 'create-wallet',
    templateUrl     : './create.wallet.component.html',
    styleUrls       : ['./create.wallet.component.scss'],
    encapsulation   : ViewEncapsulation.None,
    changeDetection : ChangeDetectionStrategy.OnPush,
    animations      : fuseAnimations
})
export class CreateWalletComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<any>
    private _mainKeypair: {
        address : string
        pubkey  : string
    }

    public address: string
    public dialogRef: any
    public formFinished: FormGroup
    public formSharedInfo: FormGroup
    public formSavingWallet: FormGroup
    public formStepDone: FormGroup
    public formTypeSecurity: FormGroup
    public isEditable: boolean
    public isShared: boolean;
    public privateKey: string
    public participants: []
    public selectedTabIndex: number
    public selectedPubkeyInputIdx: number

    constructor(
        private _alert: Alert,
        private _dialogQRCodeScannerService: DialogQRCodeScannerService,
        private _formBuilder: FormBuilder,
        private _fuseNavigationService: FuseNavigationService,
        private _fuseConfigService: FuseConfigService,
        private _router: Router,
        private _som32ConfigService: Som32ConfigService,
        private _walletService: WalletService,
        public _matDialog: MatDialog
    ) { 
        if(C.SESSION_PATH_WALLET in sessionStorage) {
            this._router.navigate([C.ROUTE_PATH_WALLET_HOME]);
        }

        // Configure the layout
        this._fuseConfigService.config = {
            layout: {
                navbar   : {
                    hidden: true
                },
                toolbar  : {
                    hidden: true
                },
                footer   : {
                    hidden: true
                },
                sidepanel: {
                    hidden: true
                }
            }
        }
        this._unsubscribeAll = new Subject()
        this.isEditable = true
        this.isShared = true
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        this.isEditable = true
        this.isShared = true

        this.formTypeSecurity = this._formBuilder.group({
            formFieldResolver   : [''],
            accountName         : ['', [Validators.required, Validators.minLength(20), Validators.maxLength(70)]],
            network             : ['mainnet'],
            accountType         : ['shared'],
            paymentType         : ['script'],
            password            : ['', PasswordValidator],
            passwordc           : ['', PasswordConfirmValidator]
        })
        this.formSharedInfo = this._formBuilder.group({
            formFieldResolver   : [''],
            fileSelector        : [''],
            confirmingCount     : [2, Validators.required],
            participatingCount  : [3, Validators.required],
            pubkeys             : this._formBuilder.array([
                this._formBuilder.group({
                    pubkey: ['', PublicKeyValidator]
                })
            ])
        })
        this.formSavingWallet = this._formBuilder.group({
            formFieldResolver   : [''],
            formStoringResolver : ['', Validators.required],
            fileKept            : [false]
        })
        this.formFinished = this._formBuilder.group({
            formFieldResolver   : [''],
            formFinishResolver  : ['', Validators.required]
        })
        this._walletService.initialize(this.formTypeSecurity.get('network').value)

        this.formTypeSecurity.get('network').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(n => this._walletService.initialize(n))
        this.formTypeSecurity.get('accountType').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(v => v==C.ACCOUNT_TYPE_SINGLE?this.isShared=false:this.isShared=true)
        this.formTypeSecurity.get('password').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(_ => this.formTypeSecurity.get('passwordc').updateValueAndValidity())
        this.formSharedInfo.get('participatingCount').valueChanges
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(_ => this.resetSharedPublicKeys())
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next()
        this._unsubscribeAll.complete()
    }

    private _createWallet() {

        // TO DO: validate the entered address that came from right public key

        let address = this.isShared ? [this._mainKeypair.address] : []
        let pubkeys = []
        
        this.isShared ? pubkeys.push(this._mainKeypair.pubkey) : []
        this.formSharedInfo.get('pubkeys').value.forEach(h => {
            pubkeys.push(h.pubkey)
        })

        this._walletService.createWallet(
            this.formTypeSecurity.get('accountName').value,
            this.formTypeSecurity.get('accountType').value,
            this.formTypeSecurity.get('paymentType').value,
            this.formSharedInfo.get('confirmingCount').value,
            this.formSharedInfo.get('participatingCount').value,
            address,
            pubkeys,
            this.formTypeSecurity.get('password').value,
        )
    }

    public getPublicKey(e) {
        let reader = new FileReader();

        reader.onload = () => {
            e.target.value = ''

            if(typeof(reader.result) == 'undefined') {
                this._alert.pop(AlertInvalidFileCode)
                return
            }

            let objPubKey = <ISom32Extenal>JSON.parse(Buffer.from(<string>reader.result, 'base64').toString())
            if(
                typeof objPubKey.version === 'undefined' ||
                typeof objPubKey.network === 'undefined' ||
                typeof objPubKey.account === 'undefined' ||
                typeof objPubKey.account.payto === 'undefined' ||
                typeof objPubKey.account.single === 'undefined'
            ) {
                this._alert.pop({
                    title   : 'Invalid PublicKey-Import-Format.',
                    msg     : 'It\'s not a PublicKey-Import-Format.',
                    desc    : 'Imported file does not have valid Public Key Import Format. You may need to export valid Public Key Import Format. It could also be a Single Account Import Format.',
                    button  : ['OK']
                })
                return
            }
            if(objPubKey.network != this.formTypeSecurity.get('network').value) {
                this._alert.pop(AlertNotMatchedNetwork)
                return
            }

            let pubkey = objPubKey.account.single[0].pubkey
            for(let i = 0; i < this.pubkeys.controls.length; i++) {
                if(this.pubkeys.controls[i].get('pubkey').value == pubkey) {
                    this._alert.pop({
                        title   : 'Public Key duplicated.',
                        msg     : 'Entered Public Key already exists.',
                        desc    : '',
                        button  : ['OK']
                    })
                    return
                }
            }
            this.pubkeys.controls[this.selectedPubkeyInputIdx].get('pubkey').setValue(pubkey)
        }

        if(typeof e.target.files[0] === 'undefined') {
            this._alert.pop(AlertFileNotFound)
            return
        }
        reader.readAsText(e.target.files[0])
    }

    public get walletTypeName(): string {
        return this.formTypeSecurity.get('accountType').value == 'single' ? 'Single account' : 'Multisig(Shared) account'
    }

    public get pubkeys(): FormArray {
        return this.formSharedInfo.get('pubkeys') as FormArray
    }

    public pubkey(index: number): AbstractControl {
        return this.pubkeys.controls[index].get('pubkey')
    }

    public resetSharedPublicKeys() {
        for(let i = this.pubkeys.controls.length - 1; i >= 0; i--) {
            this.pubkeys.removeAt(i)
        }

        let publicKeyParticipants: number = this.formSharedInfo.get('participatingCount').value
        for(let i = 0; i < publicKeyParticipants; i++) {
            let cPubKey = this._formBuilder.group({ pubkey: [i==0 ? this._mainKeypair.pubkey : '', PublicKeyValidator] })
            if(i == 0) cPubKey['disable']()
            // if(i == 0) cPubKey.disable()
            this.pubkeys.push(cPubKey)
        }
    }

    public participantCount() {
        this.participants = this.formSharedInfo.get('participatingCount').value
    }

    public stepReset(stepper: MatStepper): void {
        stepper.reset()
        this.ngOnInit()
    }

    public stepIn(stepper: MatStepper) {
        stepper.next()
        this.isEditable = !this.isEditable

        if(!this.isShared && stepper.selectedIndex == 1) {
            this._createWallet()
        } else if(this.isShared && stepper.selectedIndex == 1) {

            // TO DO: get main public key from user input

            // for the multisig, get main public key from current system.
            // concurrently prepare(generate) mnemonic with password entered.
            this._mainKeypair = this._walletService.getMainSharedKeypair(
                this.formTypeSecurity.get('password').value,
                this.formTypeSecurity.get('paymentType').value
            )
            this.resetSharedPublicKeys()
        } else if(stepper.selectedIndex == 2) {
            this._createWallet()
        }
    }
    
    public checkFileKept(): void {
        let checked: boolean = this.formSavingWallet.get('fileKept').value

        if(checked) this.formSavingWallet.get('formStoringResolver').setValue("checked")
        else this.formSavingWallet.get('formStoringResolver').setValue("")
    }

    public export(): void {
        let filename = ''
        let type = this.isShared ? 'all' : 'single'
        let data = this._walletService.som32.export(<"shared" | "single" | "all" | "pubkey">type)
        let blob = new Blob([Buffer.from(JSON.stringify(data)).toString('base64')], { type: "text/json;charset=UTF-8" });
        let address = type == 'all' ? this._walletService.som32.address + ' (' + this._walletService.som32.addressr + ')' : this._walletService.som32.address
        filename = address + '―' + (type == 'all' ? '' : type + '―') + Dateformat(new Date(), 'yymmddHHMMss') + '.som32'
        FileSaver.saveAs(blob, filename)
    }

    public exportToPDF(): void {
        window.print()
    }

    public openWWallet(): void {
        let wallet = this._walletService.som32.export('all')
        let som32Config = Lodash.cloneDeep(this._som32ConfigService.defaultConfig)

        som32Config.account.opened = wallet.account.opened
        som32Config.account.type = wallet.account.type
        som32Config.navigation.id = wallet.account.type == C.ACCOUNT_TYPE_SHARED ? (
            som32Config.psbt.useof == C.APP_PSBT_USEOF_ONLINE ? C.NAVIGATION_ID_PSBTSOM32 : C.NAVIGATION_ID_SHARED
        ) : C.NAVIGATION_ID_SINGLE
        this._fuseNavigationService.setCurrentNavigation(som32Config.navigation.id)
        this._som32ConfigService.config = som32Config

        sessionStorage.setItem(C.SESSION_PATH_WALLET, JSON.stringify(wallet))

        this._router.navigate([C.ROUTE_PATH_WALLET_HOME])
    }

    public readPubKey() {
        this._dialogQRCodeScannerService.pop().subscribe(res => {
            if(typeof res != 'undefined' && typeof res.qrcode != 'undefined' && res.qrcode != '') {
                if(!!res.qrcode) {
                    // TO DO:
                }
            }}
        )
    }
}

