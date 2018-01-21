import { Injectable, Inject } from '@angular/core';

import { Observable } from 'rxjs/Observable';

import { WindowRef } from './window-ref.service';
import { LazyStripeAPILoader, Status } from './api-loader.service';

import {
  STRIPE_PUBLISHABLE_KEY,
  StripeJS,
  STRIPE_OPTIONS,
  Options
} from '../interfaces/stripe';
import { Element } from '../interfaces/element';
import { Elements, ElementsOptions } from '../interfaces/elements';
import {
  SourceData,
  SourceResult,
  isSourceData,
  SourceParams
} from '../interfaces/sources';
import {
  CardDataOptions,
  TokenResult,
  BankAccount,
  BankAccountData,
  PiiData,
  Pii,
  isBankAccount,
  isBankAccountData,
  isPii,
  isPiiData
} from '../interfaces/token';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { PlatformService } from './platform.service';

@Injectable()
export class StripeService {

  public stripeChanged$: ReplaySubject<StripeJS> = new ReplaySubject();
  private stripe: StripeJS;

  constructor(
    @Inject(STRIPE_PUBLISHABLE_KEY) private key: string,
    @Inject(STRIPE_OPTIONS) private options: Options,
    private loader: LazyStripeAPILoader,
    private window: WindowRef,
    private _platform: PlatformService
  ) {
    this.changeKey(this.key, this.options).take(1).subscribe(() => {});
  }

  public changeKey(key: string, options?: Options): Observable<StripeJS | undefined> {
    const obs = this.loader
      .asStream()
      .filter((status: Status) => status.loaded === true)
      .map(() => {
        if (!this.window.getNativeWindow()) {
          return;
        }
        const Stripe = (this.window.getNativeWindow() as any).Stripe;
        this.stripe = options
          ? (Stripe(key, options) as StripeJS)
          : (Stripe(key) as StripeJS);
        this.stripeChanged$.next(this.stripe);
        return this.stripe;
      })
      .publishLast()
      .refCount();
    obs.subscribe();
    return obs;
  }

  public elements(options?: ElementsOptions): Observable<Elements> {
    return this.stripeChanged$
      .map(() => this.stripe.elements(options));
  }

  public createToken(
    a: Element | BankAccount | Pii,
    b: CardDataOptions | BankAccountData | PiiData | undefined
  ): Observable<TokenResult> {
    if (isBankAccount(a) && isBankAccountData(b)) {
      return Observable.fromPromise(this.stripe.createToken(a, b));
    } else if (isPii(a) && isPiiData(b)) {
      return Observable.fromPromise(this.stripe.createToken(a, b));
    } else {
      return Observable.fromPromise(
        this.stripe.createToken(a as Element, b as CardDataOptions | undefined)
      );
    }
  }

  public createSource(
    a: Element | SourceData,
    b?: SourceData | undefined
  ): Observable<SourceResult> {
    if (isSourceData(a)) {
      return Observable.fromPromise(this.stripe.createSource(a as SourceData));
    }
    return Observable.fromPromise(this.stripe.createSource(a as Element, b));
  }

  public retrieveSource(source: SourceParams): Observable<SourceResult> {
    return Observable.fromPromise(this.stripe.retrieveSource(source));
  }
}