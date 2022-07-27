import { AssetContainer, Context, User } from "@microsoft/mixed-reality-extension-sdk";
import { ViewElement, ViewElementOptions } from "../core/element";

export interface NumberInputOptions extends ViewElementOptions {
        min?: number,
        max?: number,
        step?: number,
        digits?: number,
};

export type PagerHandler = ((params: { user: User, id: string, action: string }) => void);

export class NumberInput extends ViewElement {
        private _min: number;
        get min() {
                return this._min;
        }
        private _max: number;
        get max() {
                return this._max;
        }
        private _step: number;
        get step() {
                return this._step;
        }

        constructor(context: Context, assets: AssetContainer, options: NumberInputOptions) {
                super(context, assets, options);
                this.events = [
                        'set'
                ];
                this.eventParams = {
                        'set': ['user', 'action'],
                };

                this._min = options.min !== undefined ? options.min : -Infinity;
                this._max = options.max !== undefined ? options.max : Infinity;
                this._step = options.step !== undefined ? options.step : 1;
                this.value = this.value !== undefined ? this.value : '0';
        }

        private formatValue(v: number) {
                return v.toFixed((this.options as NumberInputOptions).digits ? (this.options as NumberInputOptions).digits : 0);
        }

        public text(t?: string) {
                if (t !== undefined) {
                        this.dom.text = t;
                        this.find('#num')[0].text(t);
                } else {
                        return this.dom.text;
                }
        }

        public val(v?: string) {
                if (v !== undefined) {
                        const value = Math.min(Math.max(parseFloat(v), this.min), this.max);
                        this.value = `${value}`;
                        this.text(this.formatValue(value));
                } else {
                        return this.value;
                }
        }

        public rendered() {
                const inc = this.find('#inc')[0];
                inc.addUIEventHandler('click', (params: { user: User, id: string }) => {
                        this.val(`${parseFloat(this.val()) + this.step}`);
                        this.handleUIEvent('set', Object.assign(params, { user: params.user, action: 'inc' }));
                });

                const dec = this.find('#dec')[0];
                dec.addUIEventHandler('click', (params: { user: User, id: string }) => {
                        this.val(`${parseFloat(this.val()) - this.step}`);
                        this.handleUIEvent('set', Object.assign(params, { user: params.user, action: 'dec' }));
                });

                const num = this.find('#num')[0];
                num.addUIEventHandler('click', (params: { user: User, id: string }) => {
                        params.user.prompt('Enter Value', true).then((dialog) => {
                                if (dialog.submitted) {
                                        const value = parseFloat(dialog.text);
                                        if (!isNaN(value)) {
                                                this.val(`${value}`);
                                                this.handleUIEvent('set', Object.assign(params, { user: params.user, action: 'set' }));
                                        }
                                }
                        });
                });

                this.text(this.val());
        }
}