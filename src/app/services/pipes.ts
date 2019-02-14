import { Pipe, PipeTransform } from '@angular/core';

const SATOSHI_RELATIVE = 0.00000001;

@Pipe({name: 'satoshiToBitcoin'})
export class SatoshiToBitcoin implements PipeTransform {
    transform(value: number): number {
        return Number((value * SATOSHI_RELATIVE).toFixed(8));
    }
}

@Pipe({name: 'bitcoinToSatoshi'})
export class BitcoinToSatoshi implements PipeTransform {
    transform(value: number): number {
        return Number((value / SATOSHI_RELATIVE).toFixed(0));
    }
}